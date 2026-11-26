"""Build model_card.json and prove that the deployed weights come from training run 20261005T055211_070474Z.

Evidence lives in provenance/run_20261005T055211_070474Z/ (copied from the run's Google Drive folder; original
SHA-256 values are in drive_sources.json). Every check below is recomputed offline from those files:

  1. Deployed head.pt / scaler.npz / history.csv / validation.json / test_confusion_counts.npy are byte-identical
     to the run's models/.../MLP_max_h07/ files (SHA-256).
  2. The run's split_manifest.csv reproduces the split_hash recorded in run_config.json and COMPLETED.json,
     and no subject appears in two splits.
  3. history.csv is explained by the run's own config (best epoch + patience = logged epochs <= max_epochs).
  4. validation.json equals the run's validation_all_layers.csv row for MLP/max/h07, and h07 is the
     validation-selected layer for MLP + max pooling in that run.
  5. The run's per-recording test predictions for MLP/max/h07 cover exactly the test split and reproduce
     test_confusion_counts.npy and the test_all_layers.csv row.
  6. Running the deployed head.pt + scaler.npz on cached HuBERT features from the run reproduces the stored
     test probabilities (float32 tolerance).

    .venv/bin/python scripts/build_model_card.py          # verify + write model_card.json
    .venv/bin/python scripts/build_model_card.py --check  # verify + fail if model_card.json is stale
"""

import csv
import hashlib
import io
import json
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
RUN_ID = "20261005T055211_070474Z"
RUN = ROOT / "provenance" / f"run_{RUN_ID}"
DEPLOYED = ["head.pt", "scaler.npz", "history.csv", "validation.json", "test_confusion_counts.npy"]
HIDDEN_INDEX = 7
PROB_ATOL = 1e-6  # float32, GPU (training) vs CPU (here)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_csv(path: Path) -> list[dict]:
    with path.open(newline="") as handle:
        return list(csv.DictReader(handle))


def mlp_max_rows(rows: list[dict]) -> list[dict]:
    return [r for r in rows if r["head"] == "MLP" and r["pooling"] == "max"]


def split_hash(manifest: list[dict]) -> str:
    # Same bytes as pandas: manifest[['sample_id','subject','label','split']].to_csv(index=False)
    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow(["sample_id", "subject", "label", "split"])
    writer.writerows([r["sample_id"], r["subject"], r["label"], r["split"]] for r in manifest)
    return hashlib.sha256(buffer.getvalue().encode()).hexdigest()


def recompute_probabilities(features: dict) -> dict:
    import torch
    from torch import nn

    state = torch.load(ROOT / "head.pt", map_location="cpu", weights_only=True)
    head = nn.Sequential(nn.Linear(1024, 128), nn.ReLU(), nn.Linear(128, 1))
    head.load_state_dict({key.removeprefix("classifier."): value for key, value in state.items()})
    head.eval()
    with np.load(ROOT / "scaler.npz", allow_pickle=False) as scaler:
        mean, scale = scaler["mean"], scaler["scale"]
    with torch.inference_mode():
        return {sid: float(torch.sigmoid(head(torch.from_numpy(((x - mean) / scale).astype("float32")[None])))[0, 0])
                for sid, x in features.items()}


def build() -> dict:
    sources = json.loads((RUN / "drive_sources.json").read_text())["sources"]
    config = json.loads((RUN / "run_config.json").read_text())
    completed = json.loads((RUN / "COMPLETED.json").read_text())
    manifest = read_csv(RUN / "split_manifest.csv")
    history = read_csv(ROOT / "history.csv")
    validation = json.loads((ROOT / "validation.json").read_text())
    val_layers = mlp_max_rows(read_csv(RUN / "validation_all_layers.csv"))
    (val_row,) = [r for r in val_layers if int(r["hidden_index"]) == HIDDEN_INDEX]
    (test_row,) = [r for r in mlp_max_rows(read_csv(RUN / "test_all_layers.csv")) if int(r["hidden_index"]) == HIDDEN_INDEX]
    # Notebook selection rule: highest val ACC, then lowest val loss, then lowest index.
    selected = min(val_layers, key=lambda r: (-float(r["val_ACC"]), float(r["val_loss"]), int(r["hidden_index"])))
    predictions = read_csv(RUN / "test_predictions_MLP_max_h07.csv")
    cm = np.load(ROOT / "test_confusion_counts.npy", allow_pickle=False)

    drive_sha = {s["deployed_copy"].removeprefix("../../"): s["sha256"] for s in sources if s.get("deployed_copy")}
    subjects, recordings = defaultdict(set), defaultdict(int)
    for row in manifest:
        subjects[row["split"]].add(row["subject"])
        recordings[row["split"]] += 1
    overlap = sum(len(subjects[a] & subjects[b]) for a, b in [("train", "val"), ("train", "test"), ("val", "test")])
    test_ids = {r["sample_id"] for r in manifest if r["split"] == "test"}
    recomputed_cm = [[0, 0], [0, 0]]
    for p in predictions:
        recomputed_cm[int(p["y_true"])][int(p["y_pred"])] += 1
    stored_prob = {p["sample_id"]: json.loads(p["probabilities"])[1] for p in predictions}
    with np.load(RUN / "test_features_h07_max.npz", allow_pickle=False) as cached:
        features = {sid: cached[sid] for sid in cached.files}
    recomputed_prob = recompute_probabilities(features)
    max_prob_diff = max(abs(recomputed_prob[sid] - stored_prob[sid]) for sid in features)
    best = min(history, key=lambda row: float(row["val_loss"]))
    (tn, fp), (fn, tp) = cm.tolist()
    sensitivity, specificity, precision = tp / (tp + fn), tn / (tn + fp), tp / (tp + fp)

    checks: dict = {
        "1_deployed_files_byte_identical_to_run": all(sha256(ROOT / name) == drive_sha[name] for name in DEPLOYED),
        "2_split_hash_reproduced": split_hash(manifest) == config["split_hash"] == completed["split_hash"],
        "2_no_subject_in_two_splits": overlap == 0,
        "3_history_explained_by_run_config": int(best["epoch"]) + config["patience"] == len(history) <= config["max_epochs"],
        "4_validation_json_equals_run_layer_row": int(val_row["best_epoch"]) == validation["best_epoch"]
            and abs(float(val_row["val_ACC"]) - validation["val_ACC"]) < 1e-9 and abs(float(val_row["val_loss"]) - validation["val_loss"]) < 1e-12,
        "4_h07_is_validation_selected_layer": int(selected["hidden_index"]) == HIDDEN_INDEX,
        "5_predictions_cover_exactly_test_split": {p["sample_id"] for p in predictions} == test_ids and len(predictions) == len(test_ids),
        "5_predictions_reproduce_confusion_matrix": recomputed_cm == cm.tolist(),
        "5_confusion_matrix_reproduces_run_test_accuracy": abs((tn + tp) / cm.sum() * 100 - float(test_row["ACC [%]"])) < 1e-9,
        "6_deployed_weights_reproduce_stored_test_probabilities": max_prob_diff <= PROB_ATOL,
    }
    checks = {key: bool(value) for key, value in checks.items()}
    if not all(checks.values()):
        raise SystemExit(f"Provenance check failed: {[k for k, ok in checks.items() if not ok]}")

    return {
        "model_name": "MLP_MAX_h07",
        "intended_use": "Research screening support on anonymized/test data. Not a diagnosis; not validated for clinical use.",
        "training_run": {"run_id": RUN_ID, "evidence_dir": f"provenance/run_{RUN_ID}",
                         "model_folder": "models/27074b1545/detection/MLP_max_h07",
                         "feature_cache": "HUBERT_PAPER_FEATURE_CACHE_V1/00fcfa559a73d004ab9d"},
        "artifacts_sha256": {name: sha256(ROOT / name) for name in DEPLOYED},
        "pipeline": {
            "backbone": config["feature"]["model"], "backbone_revision": config["feature"]["revision"], "backbone_frozen": True,
            "hidden_state_index": HIDDEN_INDEX, "paper_layer": HIDDEN_INDEX + 1, "sample_rate_hz": config["feature"]["sr"],
            "pooling": "max over all time frames (chunk_seconds = null)",
            "standardization": "StandardScaler fit on the training split only (scaler.npz)",
            "head": "Linear(1024,128) - ReLU - Linear(128,1); sigmoid = P(ALS). No dropout layer in this run's weights.",
            "decision_rule": "p >= 0.5 for the reported test counts",
        },
        "training_config": {k: config[k] for k in ["seed", "batch_size", "max_epochs", "patience", "lr", "selection", "software"]}
            | {"optimizer": "Adam", "loss": "BCEWithLogits", "not_recorded": "weight decay is not in run_config.json"},
        "data_split": {
            "dataset": "SAND Challenge Task 1 training sheet; Class 5 = HC (0), Class 1-4 = ALS (1)",
            "unit": "subject (speaker)", "stratified_ratios": config["ratios"], "split_hash": config["split_hash"],
            "subjects": {k: len(subjects[k]) for k in ["train", "val", "test"]},
            "recordings": {k: recordings[k] for k in ["train", "val", "test"]},
        },
        "validation": {**validation, "correct_over_n": f"{round(validation['val_ACC'] / 100 * recordings['val'])}/{recordings['val']}",
                       "epochs_logged": len(history), "selected_among_layers": len(val_layers)},
        "test": {
            "level": f"recording ({recordings['test']} recordings from {len(subjects['test'])} held-out subjects); not subject-level aggregation",
            "confusion_matrix_rows_true_HC_ALS": cm.tolist(),
            "accuracy": round((tp + tn) / cm.sum(), 4), "sensitivity_ALS": round(sensitivity, 4),
            "specificity_HC": round(specificity, 4), "balanced_accuracy": round((sensitivity + specificity) / 2, 4),
            "precision_ALS": round(precision, 4), "f1_ALS": round(2 * precision * sensitivity / (precision + sensitivity), 4),
            "eer": round(float(test_row["EER"]), 4),
        },
        "provenance_checks": checks | {"6_max_abs_probability_difference": float(max_prob_diff), "6_samples_checked": len(features)},
        "notes": [
            "The repository notebook (MAX_EPOCHS 20, PATIENCE 3, LR 5e-4) is a later edit whose saved output is run "
            "20261005T080540_357849Z. The deployed weights come from the earlier run 20261005T055211_070474Z "
            "(max_epochs 100, patience 20, lr 1e-3) with the same split_hash and feature pipeline.",
        ],
        "limitations": [
            "Test metrics are internal (same SAND distribution and recording protocol). They are not the performance of the "
            "deployed app on phone recordings, other microphones, or other populations.",
            "About 8 recordings per subject: recording-level metrics overstate the effective sample size.",
            "Specificity (58.6%) is low relative to sensitivity at the 0.5 threshold; no clinical operating point was validated.",
            "Check 6 recomputes 4 of 328 test samples (2 HC, 2 ALS, one misclassified each) from cached features; "
            "the remaining samples are covered by checks 1 and 5.",
        ],
    }


if __name__ == "__main__":
    card = json.dumps(build(), indent=2, ensure_ascii=False) + "\n"
    target = ROOT / "model_card.json"
    if "--check" in sys.argv:
        if not target.exists() or target.read_text(encoding="utf-8") != card:
            sys.exit("model_card.json is stale: run scripts/build_model_card.py")
        print("provenance verified; model_card.json is up to date")
    else:
        target.write_text(card, encoding="utf-8")
        print(json.dumps(json.loads(card)["provenance_checks"], indent=2))
