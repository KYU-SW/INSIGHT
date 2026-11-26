"""Backend unit tests that run without the HuBERT checkpoint: python -m unittest discover -s tests/python"""

import sys
import tempfile
import unittest
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from src.backend import interpretation  # noqa: E402
from src.backend.acoustics import measure  # noqa: E402
from src.backend.app import SUBJECT_ID_PATTERN, TASKS  # noqa: E402
from src.backend.model import decode_audio  # noqa: E402

SR = 16000


def tone(f0: float, seconds: float = 2.0, sr: int = SR, amplitude: float = 0.3) -> np.ndarray:
    t = np.arange(int(seconds * sr)) / sr
    return (amplitude * np.sin(2 * np.pi * f0 * t)).astype(np.float32)


def vowel(f0: float = 150, seconds: float = 2.0, period_sd: float = 0.0, amp_sd: float = 0.0,
          snr_db: float | None = None, seed: int = 0) -> np.ndarray:
    """Harmonic vowel-like signal built cycle by cycle, so per-cycle period and amplitude are known.

    Each cycle is one period of sum_h sin(h*phase)/h (8 harmonics, <= 1.2 kHz), which is zero at the
    cycle boundary, so per-cycle period/amplitude changes introduce no discontinuities.
    """
    rng = np.random.default_rng(seed)
    cycles = int(seconds * f0) + 2
    periods = (1 / f0) * (1 + period_sd * rng.standard_normal(cycles))
    amps = 0.3 * (1 + amp_sd * rng.standard_normal(cycles))
    starts = np.concatenate([[0.0], np.cumsum(periods)])
    t = np.arange(int(seconds * SR)) / SR
    k = np.searchsorted(starts, t, side="right") - 1
    phase = 2 * np.pi * (t - starts[k]) / periods[k]
    x = amps[k] * sum(np.sin(h * phase) / h for h in range(1, 9))
    if snr_db is not None:
        x = x + rng.standard_normal(len(x)) * np.sqrt(np.mean(x ** 2) / 10 ** (snr_db / 10))
    return x.astype(np.float32)


def write(audio: np.ndarray, sr: int) -> Path:
    handle = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    sf.write(handle.name, audio, sr, subtype="FLOAT")
    return Path(handle.name)


class DecodeAudioTest(unittest.TestCase):
    def test_8khz_input_matches_training_path_exactly(self):
        path = write(tone(150, sr=8000), 8000)
        expected = librosa.resample(sf.read(path, dtype="float32")[0], orig_sr=8000, target_sr=SR).astype(np.float32)
        np.testing.assert_array_equal(decode_audio(path), expected)

    def test_high_rate_input_is_band_limited_to_training_bandwidth(self):
        audio = tone(150, sr=48000) + tone(6000, sr=48000)  # 6 kHz never existed in 8 kHz training audio
        decoded = decode_audio(write(audio, 48000))
        spectrum = np.abs(np.fft.rfft(decoded)) ** 2
        freqs = np.fft.rfftfreq(len(decoded), 1 / SR)
        self.assertLess(spectrum[freqs > 4100].sum() / spectrum.sum(), 1e-6)

    def test_stereo_is_averaged_to_mono(self):
        stereo = np.stack([tone(150), tone(150)], axis=1)
        self.assertEqual(decode_audio(write(stereo, SR)).ndim, 1)

    def test_too_short_audio_is_rejected(self):
        with self.assertRaises(ValueError):
            decode_audio(write(np.zeros(100, dtype=np.float32), SR))


class AcousticsTest(unittest.TestCase):
    def test_mean_f0_of_pure_tone(self):
        _, acoustic, quality = measure(tone(150))
        self.assertAlmostEqual(acoustic["mean_pitch_hz"], 150, delta=2)
        self.assertLess(acoustic["pitch_sd_hz"], 1)
        self.assertAlmostEqual(quality["duration_seconds"], 2.0)

    def test_undefined_summaries_stay_null_instead_of_fabricated(self):
        phonation, _, quality = measure(vowel())
        self.assertIsNone(phonation["stability"])
        self.assertIsNone(quality["assessment"])

    def test_clean_periodic_vowel_has_low_perturbation_and_high_hnr(self):
        _, acoustic, _ = measure(vowel())
        self.assertLess(acoustic["jitter_percent"], 0.5)
        self.assertLess(acoustic["shimmer_percent"], 1.0)
        self.assertGreater(acoustic["hnr_db"], 25)
        self.assertIsNone(acoustic["voice_quality_reason"])

    def test_injected_period_perturbation_is_recovered_as_jitter(self):
        clean = measure(vowel())[1]["jitter_percent"]
        sd = 0.02
        # For iid period deviations with SD sd, E|T_k - T_k+1| / T0 = 2 * sd / sqrt(pi).
        expected = 100 * 2 * sd / np.sqrt(np.pi)
        for seed in range(3):
            measured = measure(vowel(period_sd=sd, seed=seed))[1]["jitter_percent"]
            self.assertGreater(measured, 10 * clean)
            self.assertGreater(measured, expected / 1.5)
            self.assertLess(measured, expected * 1.5)

    def test_amplitude_perturbation_increases_shimmer(self):
        clean = measure(vowel())[1]["shimmer_percent"]
        perturbed = measure(vowel(amp_sd=0.10))[1]["shimmer_percent"]
        expected = 100 * 2 * 0.10 / np.sqrt(np.pi)  # same mean-absolute-difference identity as jitter
        self.assertGreater(perturbed, expected / 1.5)
        self.assertLess(perturbed, expected * 1.5)
        self.assertGreater(perturbed, 10 * clean)

    def test_hnr_decreases_monotonically_with_added_noise(self):
        snrs = [40, 30, 20, 10]
        hnrs = [measure(vowel(snr_db=snr))[1]["hnr_db"] for snr in snrs]
        self.assertTrue(all(a > b for a, b in zip(hnrs, hnrs[1:])), hnrs)
        for snr, hnr in zip(snrs, hnrs):  # white noise on a periodic signal: HNR ~ SNR
            self.assertAlmostEqual(hnr, snr, delta=3)

    def test_ddk_syllable_task_is_not_measured(self):
        _, acoustic, _ = measure(vowel(), task_code="syllable_pa")
        for key in ("jitter_percent", "shimmer_percent", "hnr_db"):
            self.assertIsNone(acoustic[key])
        self.assertIn("sustained vowel", acoustic["voice_quality_reason"])
        self.assertIsNotNone(acoustic["mean_pitch_hz"])

    def test_silence_and_too_short_voicing_are_not_measured(self):
        for audio in (np.zeros(2 * SR, dtype=np.float32), vowel(seconds=0.3),
                      np.concatenate([vowel(seconds=0.3), np.zeros(2 * SR, dtype=np.float32)])):
            _, acoustic, _ = measure(audio)
            for key in ("jitter_percent", "shimmer_percent", "hnr_db"):
                self.assertIsNone(acoustic[key])
            self.assertIsNotNone(acoustic["voice_quality_reason"])

    def test_silence_has_no_level_or_pitch(self):
        _, acoustic, quality = measure(np.zeros(SR, dtype=np.float32))
        self.assertIsNone(quality["rms_dbfs"])
        self.assertIsNone(acoustic["mean_pitch_hz"])

    def test_rms_dbfs_of_known_amplitude(self):
        _, _, quality = measure(tone(150, amplitude=0.5))
        self.assertAlmostEqual(quality["rms_dbfs"], 20 * np.log10(0.5 / np.sqrt(2)), delta=0.1)


class InterpretationTest(unittest.TestCase):
    def tearDown(self):
        interpretation.STATUS_THRESHOLDS = None

    def test_status_is_unclassified_without_validated_thresholds(self):
        self.assertIsNone(interpretation.interpret_status(0.99))

    def test_configured_thresholds_are_applied_and_validated(self):
        interpretation.STATUS_THRESHOLDS = (0.3, 0.7)
        self.assertEqual([interpretation.interpret_status(s) for s in (0.1, 0.5, 0.9)], ["normal", "caution", "high_risk"])
        interpretation.STATUS_THRESHOLDS = (0.7, 0.3)
        with self.assertRaises(ValueError):
            interpretation.interpret_status(0.5)


class ApiContractTest(unittest.TestCase):
    def test_subject_id_pattern_matches_frontend_rule(self):
        for valid in ("SUBJ_001", "A", "ID-26"):
            self.assertTrue(SUBJECT_ID_PATTERN.fullmatch(valid))
        for invalid in ("subj 1", "홍길동", "A" * 81, ""):
            self.assertIsNone(SUBJECT_ID_PATTERN.fullmatch(invalid))

    def test_tasks_match_training_recording_tasks(self):
        self.assertEqual(set(TASKS), {"vowel_a", "vowel_e", "vowel_i", "vowel_o", "vowel_u", "syllable_pa", "syllable_ta", "syllable_ka"})


if __name__ == "__main__":
    unittest.main()
