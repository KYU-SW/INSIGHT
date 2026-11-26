"""Reproduce inference on the synthetic examples and compare with examples/expected_outputs.json.

Runs the same functions as the FastAPI service (decode_audio -> infer_score -> measure), checks
the deployed weights against model_card.json, and reports model-load and per-file inference time.

    HF_HOME=./hf-cache .venv/bin/python scripts/reproduce_inference.py            # verify
    HF_HOME=./hf-cache .venv/bin/python scripts/reproduce_inference.py --update   # rewrite expected outputs
Exit code 1 if any output differs beyond tolerance.
"""

import hashlib
import json
import platform
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.backend.acoustics import measure  # noqa: E402
from src.backend.model import decode_audio, infer_score, load_model  # noqa: E402

EXAMPLES = ROOT / "examples"
EXPECTED = EXAMPLES / "expected_outputs.json"
SCORE_ATOL = 1e-4   # CPU float32 HuBERT: allow BLAS/thread-order differences across machines
METRIC_RTOL = 1e-4


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def close(a, b, rtol):
    if a is None or b is None:
        return a is b
    return abs(a - b) <= rtol * max(1.0, abs(b))


def main() -> int:
    card = json.loads((ROOT / "model_card.json").read_text())
    for name in ("head.pt", "scaler.npz"):
        if sha256(ROOT / name) != card["artifacts_sha256"][name]:
            print(f"FAIL {name} does not match model_card.json")
            return 1
    started = time.perf_counter()
    load_model()
    load_seconds = time.perf_counter() - started

    outputs = {}
    for wav in sorted(EXAMPLES.glob("*.wav")):
        audio = decode_audio(wav)
        started = time.perf_counter()
        score = infer_score(audio)
        infer_seconds = time.perf_counter() - started
        phonation, acoustic, quality = measure(audio)
        outputs[wav.name] = {"wav_sha256": sha256(wav), "score": round(score, 6),
                             "acoustic": {k: v for k, v in acoustic.items() if v is not None},
                             "duration_seconds": quality["duration_seconds"], "_infer_seconds": round(infer_seconds, 3)}

    print(f"model load: {load_seconds:.1f} s ({platform.machine()}, {platform.system()}, CPU)")
    for name, out in outputs.items():
        print(f"{name}: score={out['score']:.6f} inference={out['_infer_seconds']:.2f} s "
              f"F0={out['acoustic'].get('mean_pitch_hz', float('nan')):.1f} Hz F0 SD={out['acoustic'].get('pitch_sd_hz', float('nan')):.2f} Hz "
              f"intensity CV={out['acoustic'].get('intensity_cv', float('nan')):.4f}")

    stable = {name: {k: v for k, v in out.items() if not k.startswith("_")} for name, out in outputs.items()}
    if "--update" in sys.argv:
        EXPECTED.write_text(json.dumps({"model_card_head_sha256": card["artifacts_sha256"]["head.pt"],
                                        "score_atol": SCORE_ATOL, "metric_rtol": METRIC_RTOL, "outputs": stable}, indent=2) + "\n")
        print(f"wrote {EXPECTED.relative_to(ROOT)}")
        return 0

    expected = json.loads(EXPECTED.read_text())["outputs"]
    failures = []
    for name, want in expected.items():
        got = stable.get(name)
        if got is None or got["wav_sha256"] != want["wav_sha256"]:
            failures.append(f"{name}: example file missing or changed (regenerate with scripts/synthetic_voice.py)")
            continue
        if abs(got["score"] - want["score"]) > SCORE_ATOL:
            failures.append(f"{name}: score {got['score']} != expected {want['score']}")
        for key, value in want["acoustic"].items():
            if not close(got["acoustic"].get(key), value, METRIC_RTOL):
                failures.append(f"{name}: {key} {got['acoustic'].get(key)} != expected {value}")
    for failure in failures:
        print("FAIL", failure)
    print("PASS: outputs match examples/expected_outputs.json" if not failures else f"{len(failures)} mismatch(es)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
