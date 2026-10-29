"""Descriptive audio measurements. These are independent of the HuBERT classifier."""

import librosa
import numpy as np


def _finite(value):
    return float(value) if np.isfinite(value) else None


def measure(audio: np.ndarray) -> tuple[dict, dict, dict]:
    # A recording has no calibrated sound pressure level; this is relative dBFS.
    frames = librosa.feature.rms(y=audio, frame_length=2048, hop_length=512)[0]
    voiced_energy = frames[frames > 1e-5]
    intensity_cv = _finite(np.std(voiced_energy) / np.mean(voiced_energy)) if len(voiced_energy) > 1 else None
    level_dbfs = _finite(20 * np.log10(np.sqrt(np.mean(np.square(audio))))) if np.any(audio) else None
    near_full_scale_percent = _finite(100 * np.mean(np.abs(audio) >= 0.999))

    mean_f0 = sd_f0 = pitch_cv = None
    if len(audio) >= 4096:
        try:
            f0 = librosa.yin(audio, fmin=65, fmax=500, sr=16000,
                            frame_length=2048, hop_length=512, center=False)
            rms_for_f0 = librosa.feature.rms(y=audio, frame_length=2048,
                                             hop_length=512, center=False)[0]
            n = min(len(f0), len(rms_for_f0))
            voiced = f0[:n][rms_for_f0[:n] > max(1e-5, float(np.max(rms_for_f0)) * 0.1)]
            if len(voiced) > 1:
                mean_f0 = _finite(np.mean(voiced))
                sd_f0 = _finite(np.std(voiced))
                pitch_cv = _finite(sd_f0 / mean_f0) if mean_f0 else None
        except (ValueError, FloatingPointError):
            pass
    return (
        {"stability": None, "pitch_stability": pitch_cv, "intensity_stability": intensity_cv},
        {"jitter_percent": None, "shimmer_percent": None, "hnr_db": None,
         "mean_pitch_hz": mean_f0, "pitch_sd_hz": sd_f0,
         "pitch_cv": pitch_cv, "intensity_cv": intensity_cv,
         "mean_intensity_dbfs": level_dbfs},
        {"assessment": None, "duration_seconds": float(len(audio) / 16000),
         "rms_dbfs": level_dbfs,
         "near_full_scale_percent": near_full_scale_percent},
    )
