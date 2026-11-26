"""Experiment: does matching the training bandwidth (8 kHz source) change model scores on synthetic input?

Hypothesis: every training recording was 8 kHz (provenance split_manifest source_sr), so features never contained
4-8 kHz energy. Inputs with energy there are out of distribution and may saturate the score.
Single manipulated factor: preprocessing. A = current (16 kHz input as is). B = training parity
(resample to 8 kHz, then to 16 kHz, with the same librosa.resample used in training).
Inputs: deterministic synthetic /a/ (scripts/synthetic_voice.py) at 4 F0 values x steady/unstable.

    .venv/bin/python experiments/bandwidth_8k.py   # writes experiments/bandwidth_8k_results.json
"""

import json
import sys
from pathlib import Path

import librosa
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))
from src.backend.model import infer_score  # noqa: E402
from synthetic_voice import SR, synthesize  # noqa: E402


def high_band_fraction(audio: np.ndarray) -> float:
    spectrum = np.abs(np.fft.rfft(audio)) ** 2
    freqs = np.fft.rfftfreq(len(audio), 1 / SR)
    return float(spectrum[freqs > 4000].sum() / spectrum.sum())


def band_match(audio: np.ndarray) -> np.ndarray:
    return librosa.resample(librosa.resample(audio, orig_sr=SR, target_sr=8000), orig_sr=8000, target_sr=SR).astype(np.float32)


rows = []
for f0 in (100, 120, 200, 220):
    for kind, params in {"steady": dict(f0_jitter=0.0, tremor_depth=0.0, noise_level=0.0, seed=0),
                         "unstable": dict(f0_jitter=0.03, tremor_depth=0.25, noise_level=0.02, seed=42)}.items():
        audio = synthesize(f0=f0, **params)
        matched = band_match(audio)
        rows.append({"f0_hz": f0, "kind": kind,
                     "A_current": {"score": round(infer_score(audio), 6), "energy_above_4khz": round(high_band_fraction(audio), 4)},
                     "B_band_matched": {"score": round(infer_score(matched), 6), "energy_above_4khz": round(high_band_fraction(matched), 6)}})
        print(rows[-1])
(ROOT / "experiments" / "bandwidth_8k_results.json").write_text(json.dumps(rows, indent=2) + "\n")
