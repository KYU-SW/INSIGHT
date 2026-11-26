"""API auth and OOD-gate tests that never load HuBERT: python -m unittest discover -s tests/python"""

import io
import json
import os
import sys
import unittest
from pathlib import Path
from unittest import mock

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from fastapi.testclient import TestClient  # noqa: E402

from src.backend import app as app_module  # noqa: E402
from src.backend import model  # noqa: E402

TOKEN = "test-token-0123456789"
IN_DIST = {"distance": 1.0, "threshold": 1.7181, "in_distribution": True}
OUT_DIST = {"distance": 3.0, "threshold": 1.7181, "in_distribution": False}


def wav_bytes() -> bytes:
    buffer = io.BytesIO()
    t = np.arange(16000) / 16000
    sf.write(buffer, (0.3 * np.sin(2 * np.pi * 150 * t)).astype(np.float32), 16000, format="WAV", subtype="FLOAT")
    return buffer.getvalue()


class ApiAuthTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app_module.app)
        self.env = mock.patch.dict(os.environ, {"INSIGHT_BACKEND_TOKEN": TOKEN}, clear=False)
        self.env.start()
        os.environ.pop("INSIGHT_ALLOW_UNAUTHENTICATED", None)
        self.addCleanup(self.env.stop)

    def post(self, headers=None, ood=IN_DIST):
        with mock.patch.object(app_module, "infer", return_value=(0.42, ood)):
            return self.client.post("/analyze", headers=headers or {},
                                    files={"file": ("a.wav", wav_bytes(), "audio/wav")},
                                    data={"user_id": "SUBJ_001", "task_code": "vowel_a"})

    def test_missing_header_is_401(self):
        response = self.post()
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.headers["www-authenticate"], "Bearer")

    def test_wrong_token_is_401(self):
        self.assertEqual(self.post({"Authorization": "Bearer wrong"}).status_code, 401)
        self.assertEqual(self.post({"Authorization": f"Basic {TOKEN}"}).status_code, 401)

    def test_correct_token_passes_auth(self):
        response = self.post({"Authorization": f"Bearer {TOKEN}"})
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()["model"]
        self.assertEqual(body["score"], 0.42)
        self.assertEqual(body["ood"], IN_DIST)
        self.assertEqual(body["status_reason"], "No validated three-level cutoff was supplied")

    def test_unset_token_fails_closed_with_503(self):
        os.environ.pop("INSIGHT_BACKEND_TOKEN")
        response = self.post({"Authorization": f"Bearer {TOKEN}"})
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["detail"], "backend token not configured")

    def test_explicit_dev_opt_out_allows_unauthenticated(self):
        os.environ.pop("INSIGHT_BACKEND_TOKEN")
        os.environ["INSIGHT_ALLOW_UNAUTHENTICATED"] = "1"
        self.assertEqual(self.post().status_code, 200)

    def test_ood_input_keeps_score_but_flags_it(self):
        response = self.post({"Authorization": f"Bearer {TOKEN}"}, ood=OUT_DIST)
        body = response.json()["model"]
        self.assertEqual(body["score"], 0.42)  # raw score is not hidden
        self.assertIsNone(body["status"])
        self.assertFalse(body["ood"]["in_distribution"])
        self.assertIn("not interpretable", body["status_reason"])


class OodGateTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with np.load(ROOT / "scaler.npz", allow_pickle=False) as scaler:
            cls.mean, cls.scale = scaler["mean"], scaler["scale"]
        with np.load(ROOT / "provenance" / "run_20261005T055211_070474Z" / "test_features_h07_max.npz") as cached:
            cls.id_features = [cached[k] for k in cached.files]  # raw, pre-scaler

    def standardize(self, raw):
        return ((raw - self.mean) / self.scale).astype(np.float32)

    def test_stored_sand_test_features_pass(self):
        for raw in self.id_features:
            self.assertTrue(model.ood_check(self.standardize(raw))["in_distribution"])

    def test_far_away_vector_fails(self):
        far = np.full(1024, 5.0, dtype=np.float32)  # 5 SD from the training mean in every dimension
        result = model.ood_check(far)
        self.assertFalse(result["in_distribution"])
        self.assertAlmostEqual(result["distance"], 5.0, places=4)

    def test_training_mean_has_zero_distance(self):
        self.assertAlmostEqual(model.ood_distance(self.standardize(self.mean.astype(np.float32))), 0.0, places=5)

    def test_threshold_matches_calibration_file(self):
        calibration = json.loads((ROOT / "ood_calibration.json").read_text())
        self.assertEqual(model.ood_threshold(), calibration["threshold"])
        self.assertGreater(calibration["threshold"], calibration["calibration_data"]["max"])

    def test_invalid_feature_is_rejected(self):
        with self.assertRaises(ValueError):
            model.ood_distance(np.full(1024, np.nan))
        with self.assertRaises(ValueError):
            model.ood_distance(np.zeros(512))


if __name__ == "__main__":
    unittest.main()
