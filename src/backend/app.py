"""File upload inference API. Start with uvicorn src.backend.app:app."""

import hmac
import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse

from .acoustics import measure
from .interpretation import interpret_status
from .model import decode_audio, infer, load_model, ood_threshold

app = FastAPI(title="INSIGHT voice screening inference")
TASKS = {
    "vowel_a": "Sustained /a/", "vowel_e": "Sustained /e/",
    "vowel_i": "Sustained /i/", "vowel_o": "Sustained /o/",
    "vowel_u": "Sustained /u/", "syllable_pa": "/pa/",
    "syllable_ta": "/ta/", "syllable_ka": "/ka/",
}
MAX_BYTES = 25 * 1024 * 1024
SUBJECT_ID_PATTERN = re.compile(r"[A-Z0-9_-]{1,80}")  # keep in sync with src/lib/subject-id.ts
OOD_REASON = ("Input is outside the model's training feature distribution (OOD gate); "
              "the score is shown but is not interpretable for this recording")


# Shared-secret auth between the Next.js server and this service. Fail-closed: without INSIGHT_BACKEND_TOKEN every
# request gets 503, unless INSIGHT_ALLOW_UNAUTHENTICATED=1 is set explicitly (local development only). Checked in a
# middleware so unauthenticated uploads are rejected before the multipart body is read.
if not os.environ.get("INSIGHT_BACKEND_TOKEN") and os.environ.get("INSIGHT_ALLOW_UNAUTHENTICATED") != "1":
    logging.getLogger("uvicorn.error").warning("INSIGHT_BACKEND_TOKEN is not set: every request will return 503")


# Liveness probe exempt from auth: exactly GET /health, and it exposes only two booleans (no paths, versions or scores).
HEALTH_PATH = "/health"


@app.middleware("http")
async def require_backend_token(request: Request, call_next):
    if request.method == "GET" and request.url.path == HEALTH_PATH:
        return await call_next(request)
    expected = os.environ.get("INSIGHT_BACKEND_TOKEN", "")
    if not expected:
        if os.environ.get("INSIGHT_ALLOW_UNAUTHENTICATED") == "1":
            return await call_next(request)
        return JSONResponse({"detail": "backend token not configured"}, status_code=503)
    scheme, _, supplied = request.headers.get("authorization", "").partition(" ")
    if scheme.lower() != "bearer" or not hmac.compare_digest(supplied.strip().encode(), expected.encode()):
        return JSONResponse({"detail": "Invalid or missing bearer token"}, status_code=401,
                            headers={"WWW-Authenticate": "Bearer"})
    return await call_next(request)


@app.get(HEALTH_PATH)
def health():
    """Never triggers HuBERT loading: model_loaded only reports whether a previous request already loaded it."""
    try:
        ood_threshold()
        ood_calibrated = True
    except (RuntimeError, ValueError, TypeError, OSError, KeyError):
        ood_calibrated = False
    return {"status": "ok", "model_loaded": load_model.cache_info().currsize > 0, "ood_calibrated": ood_calibrated}


@app.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    task_code: str = Form("vowel_a"),
    recording_timestamp: str | None = Form(None),
):
    if task_code not in TASKS:
        raise HTTPException(422, "Unknown voice task")
    user_id = user_id.strip().upper()
    if not SUBJECT_ID_PATTERN.fullmatch(user_id):
        raise HTTPException(422, "Subject ID must be 1-80 chars of A-Z, 0-9, _ or - (e.g. SUBJ_001)")
    if not file.filename or Path(file.filename).suffix.lower() not in {".wav", ".flac", ".ogg"}:
        raise HTTPException(415, "Upload WAV, FLAC, or OGG audio")
    try:
        timestamp = datetime.fromisoformat(recording_timestamp) if recording_timestamp else datetime.now(timezone.utc)
        if timestamp.tzinfo is None:
            raise ValueError("Recording time needs a timezone")
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    content = await file.read(MAX_BYTES + 1)
    if len(content) > MAX_BYTES:
        raise HTTPException(413, "Audio file exceeds 25 MB")
    with NamedTemporaryFile(suffix=Path(file.filename).suffix, delete=False) as temp:
        temp.write(content)
        path = Path(temp.name)
    try:
        audio = decode_audio(path)
        if len(audio) / 16000 > 120:
            raise HTTPException(422, "Audio exceeds the 120 second inference limit")
        score, ood = infer(audio)
        phonation, acoustic, recording_quality = measure(audio, task_code)
        status = interpret_status(score) if ood["in_distribution"] else None
    except (RuntimeError, ImportError) as exc:
        raise HTTPException(503, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    finally:
        path.unlink(missing_ok=True)
    return {
        "user_id": user_id, "recording_timestamp": timestamp.isoformat(),
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
        "task": {"code": task_code, "label": TASKS[task_code]},
        "model": {"name": "MLP_MAX_h07", "score": score,
                  "display_score": round(score * 100, 1), "status": status,
                  "status_reason": (OOD_REASON if not ood["in_distribution"] else
                                    None if status else "No validated three-level cutoff was supplied"),
                  "ood": ood},
        "phonation": phonation, "acoustic": acoustic,
        "recording_quality": recording_quality,
    }
