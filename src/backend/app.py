"""File upload inference API. Start with uvicorn src.backend.app:app."""

import re
from datetime import datetime, timezone
from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import FastAPI, File, Form, HTTPException, UploadFile

from .acoustics import measure
from .interpretation import interpret_status
from .model import decode_audio, infer_score

app = FastAPI(title="INSIGHT voice screening inference")
TASKS = {
    "vowel_a": "Sustained /a/", "vowel_e": "Sustained /e/",
    "vowel_i": "Sustained /i/", "vowel_o": "Sustained /o/",
    "vowel_u": "Sustained /u/", "syllable_pa": "/pa/",
    "syllable_ta": "/ta/", "syllable_ka": "/ka/",
}
MAX_BYTES = 25 * 1024 * 1024
SUBJECT_ID_PATTERN = re.compile(r"[A-Z0-9_-]{1,80}")  # keep in sync with src/lib/subject-id.ts


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
        score = infer_score(audio)
        phonation, acoustic, recording_quality = measure(audio)
        status = interpret_status(score)
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
                  "status_reason": None if status else "No validated three-level cutoff was supplied"},
        "phonation": phonation, "acoustic": acoustic,
        "recording_quality": recording_quality,
    }
