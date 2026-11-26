"""Descriptive audio measurements. These are independent of the HuBERT classifier."""

import librosa
import numpy as np
import parselmouth
from parselmouth.praat import call

SR = 16000
# Standard Praat voice-report settings (Boersma & Weenink). Pitch range 75-500 Hz covers adult voices.
PITCH_FLOOR, PITCH_CEILING = 75.0, 500.0
PERIOD_ARGS = (0.0001, 0.02, 1.3)  # shortest period, longest period, maximum period factor
MAX_AMPLITUDE_FACTOR = 1.6
MIN_VOICED_SECONDS, MIN_PERIODS = 0.5, 10


def _finite(value):
    return float(value) if value is not None and np.isfinite(value) else None


def _voice_quality(audio: np.ndarray, task_code: str) -> tuple[float | None, float | None, float | None, str | None]:
    """Praat local jitter (%), local shimmer (%) and mean HNR (dB), with a reason when not reported.

    Jitter/shimmer are cycle-to-cycle measures defined on sustained phonation, so DDK syllable
    repetitions (stop-consonant onsets, short vowels) are not measured. Values are descriptive only.
    For orientation, Praat's manual lists 1.04% (local jitter) and 3.81% (local shimmer) as MDVP
    pathology thresholds; these are reference values from a different analysis program and recording
    setup, not cutoffs used here. Audio is band-limited to 4 kHz (8 kHz-source parity), which raises
    HNR relative to full-band recordings, so HNR is not comparable to wideband normative data.
    """
    if not task_code.startswith("vowel_"):
        return None, None, None, "Jitter/shimmer/HNR are measured only on sustained vowel tasks"
    sound = parselmouth.Sound(audio.astype(np.float64), sampling_frequency=SR)
    if not np.any(audio) or sound.duration < MIN_VOICED_SECONDS:
        return None, None, None, "Too little voiced audio for cycle-level measures"
    points = call(sound, "To PointProcess (periodic, cc)", PITCH_FLOOR, PITCH_CEILING)
    periods = call(points, "Get number of periods", 0, 0, *PERIOD_ARGS)
    mean_period = _finite(call(points, "Get mean period", 0, 0, *PERIOD_ARGS)) if periods else None
    if periods < MIN_PERIODS or mean_period is None or periods * mean_period < MIN_VOICED_SECONDS:
        return None, None, None, "Too little voiced audio for cycle-level measures"
    jitter = _finite(call(points, "Get jitter (local)", 0, 0, *PERIOD_ARGS))
    shimmer = _finite(call([sound, points], "Get shimmer (local)", 0, 0, *PERIOD_ARGS, MAX_AMPLITUDE_FACTOR))
    harmonicity = call(sound, "To Harmonicity (cc)", 0.01, PITCH_FLOOR, 0.1, 1.0)
    hnr = _finite(call(harmonicity, "Get mean", 0, 0))  # Praat skips unvoiced (-200 dB) frames
    jitter = None if jitter is None else jitter * 100
    shimmer = None if shimmer is None else shimmer * 100
    reason = None if None not in (jitter, shimmer, hnr) else "Praat returned undefined for one or more measures"
    return jitter, shimmer, hnr, reason


def measure(audio: np.ndarray, task_code: str = "vowel_a") -> tuple[dict, dict, dict]:
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
    try:
        jitter, shimmer, hnr, voice_quality_reason = _voice_quality(audio, task_code)
    except parselmouth.PraatError as exc:
        jitter = shimmer = hnr = None
        voice_quality_reason = f"Praat analysis failed: {exc}"
    # phonation["stability"] and recording_quality["assessment"] stay None: no validated definition exists.
    return (
        {"stability": None, "pitch_stability": pitch_cv, "intensity_stability": intensity_cv},
        {"jitter_percent": jitter, "shimmer_percent": shimmer, "hnr_db": hnr,
         "voice_quality_reason": voice_quality_reason,
         "mean_pitch_hz": mean_f0, "pitch_sd_hz": sd_f0,
         "pitch_cv": pitch_cv, "intensity_cv": intensity_cv,
         "mean_intensity_dbfs": level_dbfs},
        {"assessment": None, "duration_seconds": float(len(audio) / 16000),
         "rms_dbfs": level_dbfs,
         "near_full_scale_percent": near_full_scale_percent},
    )
