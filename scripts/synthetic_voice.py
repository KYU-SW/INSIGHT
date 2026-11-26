"""Deterministic synthetic sustained /a/ recordings for reproducible inference examples.

Source-filter synthesis: a glottal pulse train at F0 passes through three formant resonators
(/a/: F1 730, F2 1090, F3 2440 Hz). "steady" has constant F0 and amplitude; "unstable" adds seeded
cycle-to-cycle F0 perturbation, 5 Hz amplitude tremor and breath noise. These are signal-processing
test inputs, not simulated patients: the model score on them has no clinical meaning.

    .venv/bin/python scripts/synthetic_voice.py   # writes examples/synthetic_vowel_a_{steady,unstable}.wav
"""

from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import lfilter

SR = 16000
DURATION = 3.0
FORMANTS = [(730, 90), (1090, 110), (2440, 170)]
OUT = Path(__file__).resolve().parents[1] / "examples"


def resonator(signal: np.ndarray, freq: float, bandwidth: float) -> np.ndarray:
    r = np.exp(-np.pi * bandwidth / SR)
    a = [1.0, -2 * r * np.cos(2 * np.pi * freq / SR), r * r]
    return lfilter([1 - r], a, signal)


def synthesize(f0: float, f0_jitter: float, tremor_depth: float, noise_level: float, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    n = int(SR * DURATION)
    t = np.arange(n) / SR
    # Per-cycle F0 perturbation, held constant within each period.
    phase, source, cycle_f0 = 0.0, np.zeros(n), f0
    for i in range(n):
        phase += cycle_f0 / SR
        if phase >= 1.0:
            phase -= 1.0
            cycle_f0 = f0 * (1 + f0_jitter * rng.standard_normal())
        # Rosenberg-like glottal flow derivative: open phase 0-0.6, closed 0.6-1.
        source[i] = np.sin(np.pi * phase / 0.6) if phase < 0.6 else 0.0
    source = np.diff(source, prepend=0.0)
    voice = source
    for freq, bandwidth in FORMANTS:
        voice = resonator(voice, freq, bandwidth)
    envelope = np.minimum(1, np.minimum(t / 0.05, (DURATION - t) / 0.05))  # 50 ms fades
    voice = voice * envelope * (1 + tremor_depth * np.sin(2 * np.pi * 5 * t))
    voice = voice / np.max(np.abs(voice)) * 0.5 + noise_level * rng.standard_normal(n) * envelope
    return np.clip(voice, -1, 1).astype(np.float32)


EXAMPLES = {
    "synthetic_vowel_a_steady": dict(f0=120, f0_jitter=0.0, tremor_depth=0.0, noise_level=0.0, seed=0),
    "synthetic_vowel_a_unstable": dict(f0=120, f0_jitter=0.03, tremor_depth=0.25, noise_level=0.02, seed=42),
}

if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    for name, params in EXAMPLES.items():
        path = OUT / f"{name}.wav"
        sf.write(path, synthesize(**params), SR, subtype="PCM_16")
        print(path.relative_to(OUT.parent), params)
