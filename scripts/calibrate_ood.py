"""Calibrate the feature-space out-of-distribution (OOD) gate and write ood_calibration.json.

Distance: RMS of the standardized h07 max-pooled feature, sqrt(mean(((x - mean) / scale)^2)) = diagonal Mahalanobis
distance / sqrt(1024). The StandardScaler was fit on the training split, so the training-split average of mean(z^2) is
exactly 1 by construction; that anchor needs no training features. The threshold itself is set from in-distribution
(ID) features that exist locally, which are only the 4 cached SAND *test* features in provenance/ (no validation or
training features are stored in this repository). See the "caveats" field of the output.

    .venv/bin/python scripts/calibrate_ood.py                  # ID distances + threshold (no HuBERT needed)
    HF_HOME=... .venv/bin/python scripts/calibrate_ood.py --probes   # also run HuBERT on synthetic OOD probes
    .venv/bin/python scripts/calibrate_ood.py --check          # fail if ood_calibration.json is stale (ID part only)

Deterministic: fixed seeds for every synthetic probe; no randomness in the threshold rule.
"""

import json
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.backend.model import OOD_CALIBRATION, decode_audio, ood_distance  # noqa: E402

RUN = ROOT / "provenance" / "run_20261005T055211_070474Z"
ID_FEATURES = RUN / "test_features_h07_max.npz"  # raw (pre-scaler) features; build_model_card.py applies the scaler
SR = 16000
PROBE_SECONDS = 3.0
# Threshold rule, fixed before looking at OOD probes: largest ID distance times a margin. With n = 4 ID samples a
# percentile (e.g. p99) is not estimable, so the margin stands in for the unobserved ID tail. 1.5 is an engineering
# choice, not a fitted value.
MARGIN = 1.5


def standardize(raw: np.ndarray) -> np.ndarray:
    with np.load(ROOT / "scaler.npz", allow_pickle=False) as scaler:
        return ((raw.astype(np.float32) - scaler["mean"]) / scaler["scale"]).astype(np.float32)


def id_distances() -> dict[str, float]:
    with np.load(ID_FEATURES, allow_pickle=False) as cached:
        return {sid: round(ood_distance(standardize(cached[sid])), 4) for sid in sorted(cached.files)}


def probe_signals() -> dict[str, np.ndarray]:
    rng = np.random.default_rng(0)
    n = int(SR * PROBE_SECONDS)
    t = np.arange(n) / SR
    notes = [220.0, 277.18, 329.63, 440.0, 329.63, 277.18]  # A major arpeggio, 0.5 s per note
    note_f0 = np.repeat(notes, n // len(notes))
    music = sum(np.sin(2 * np.pi * k * np.cumsum(note_f0) / SR) / k for k in range(1, 6))
    music *= np.tile(np.exp(-3 * np.arange(n // len(notes)) / SR), len(notes))  # plucked decay per note
    return {
        "silence": np.zeros(n),
        "white_noise": 0.1 * rng.standard_normal(n),
        "tone_150hz": 0.3 * np.sin(2 * np.pi * 150 * t),
        "tone_1khz": 0.3 * np.sin(2 * np.pi * 1000 * t),
        "square_150hz": 0.3 * np.sign(np.sin(2 * np.pi * 150 * t)),
        "music_arpeggio": 0.3 * music / np.max(np.abs(music)),
        "clicks_4hz": 0.5 * (np.arange(n) % (SR // 4) < 40),
    }


def probe_distances() -> dict[str, dict]:
    from src.backend.model import extract_standardized, score_standardized

    files = {name: audio for name, audio in probe_signals().items()}
    examples = sorted((ROOT / "examples").glob("*.wav"))
    results = {}
    with tempfile.TemporaryDirectory() as tmp:
        for name, audio in files.items():
            path = Path(tmp) / f"{name}.wav"
            sf.write(path, audio.astype(np.float32), SR, subtype="FLOAT")
            examples.append(path)
        for path in examples:
            z = extract_standardized(decode_audio(path))  # same decode path as the API
            name = path.stem if path.parent != ROOT / "examples" else f"examples/{path.name}"
            results[name] = {"distance": round(ood_distance(z), 4), "score": round(score_standardized(z), 6)}
    return results


def build(probes: dict | None) -> dict:
    ids = id_distances()
    values = np.array(list(ids.values()))
    threshold = round(float(values.max() * MARGIN), 4)
    out = {
        "distance": "sqrt(mean(z^2)), z = (h07 max-pooled feature - scaler.mean) / scaler.scale; diagonal Mahalanobis / sqrt(1024)",
        "threshold": threshold,
        "threshold_rule": f"max(ID distance) x {MARGIN} (margin fixed before OOD probes were run; not fitted)",
        "reference": "training-split mean of mean(z^2) is exactly 1 by StandardScaler construction",
        "calibration_data": {
            "source": str(ID_FEATURES.relative_to(ROOT)),
            "split": "test",
            "n": len(ids),
            "distances": ids,
            "min": round(float(values.min()), 4), "max": round(float(values.max()), 4),
        },
        "caveats": [
            "Calibrated on the TEST split: these 4 cached features are the only in-distribution features stored locally "
            "(no train/validation features). The threshold therefore used test data; it is not an independent estimate.",
            "n = 4 ID samples: the false-rejection rate on real SAND recordings is not measured. The x1.5 margin is a "
            "guess at the unobserved ID tail.",
            "Diagonal distance ignores feature correlations; inputs that shift features along correlated directions "
            "can stay under the threshold. Passing the gate does not mean the score is valid for that input.",
            "No real non-SAND speech (other languages, microphones, ages) was measured; the probes are synthetic signals.",
        ],
    }
    if probes is not None:
        out["ood_probes"] = {"note": "synthetic or example inputs through decode_audio -> HuBERT -> scaler; "
                                     "seeds fixed in scripts/calibrate_ood.py", "results": probes,
                             "flagged": sorted(k for k, v in probes.items() if v["distance"] > threshold)}
    return out


if __name__ == "__main__":
    existing = json.loads(OOD_CALIBRATION.read_text()) if OOD_CALIBRATION.exists() else {}
    if "--check" in sys.argv:
        fresh = build(None)
        stale = [k for k in ("threshold", "calibration_data") if existing.get(k) != fresh[k]]
        if stale:
            sys.exit(f"ood_calibration.json is stale ({stale}): run scripts/calibrate_ood.py")
        print("ood_calibration.json is up to date")
        sys.exit(0)
    probes = probe_distances() if "--probes" in sys.argv else existing.get("ood_probes", {}).get("results")
    result = build(probes)
    OOD_CALIBRATION.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({k: result[k] for k in ("threshold", "calibration_data")} | {"ood_probes": result.get("ood_probes")}, indent=2))
