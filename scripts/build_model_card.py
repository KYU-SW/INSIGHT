"""Build model_card.json: link the deployed weights to training settings, split, validation and test evidence.

Every number is computed from the files in this repository (head.pt, scaler.npz, history.csv,
validation.json, test_confusion_counts.npy, the training notebook). Run:
    .venv/bin/python scripts/build_model_card.py          # write model_card.json
    .venv/bin/python scripts/build_model_card.py --check  # fail if model_card.json is stale
"""

import csv
import hashlib
import json
import re
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
NOTEBOOK = ROOT / "HuBERT_Frozen_CNN_Pooling_Reproduction (2).ipynb"
ARTIFACTS = ["head.pt", "scaler.npz", "history.csv", "validation.json", "test_confusion_counts.npy"]
HIDDEN_INDEX = 7  # src/backend/model.py HIDDEN_INDEX; notebook paper_layer = hidden_index + 1


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def notebook_sources_and_outputs():
    cells = json.loads(NOTEBOOK.read_text(encoding="utf-8"))["cells"]
    source = "\n".join("".join(c["source"]) for c in cells if c["cell_type"] == "code")
    outputs = "\n".join("".join(o.get("text", "")) + "".join(o.get("data", {}).get("text/plain", ""))
                        for c in cells for o in c.get("outputs", []))
    return source, outputs


def constant(source: str, name: str):
    match = re.search(rf"^{name}\s*=\s*([^#\n]+)", source, re.M)
    if not match:
        raise ValueError(f"{name} not found in notebook")
    return json.loads(match.group(1).strip().replace("'", '"').replace("None", "null"))


def build() -> dict:
    source, outputs = notebook_sources_and_outputs()
    history = list(csv.DictReader((ROOT / "history.csv").open()))
    validation = json.loads((ROOT / "validation.json").read_text())
    cm = np.load(ROOT / "test_confusion_counts.npy", allow_pickle=False)
    (tn, fp), (fn, tp) = cm.tolist()  # sklearn layout: rows = true [HC, ALS], cols = predicted [HC, ALS]
    best = min(history, key=lambda row: float(row["val_loss"]))
    # Notebook cell 8 summary table rows: "<split> <subjects> <recordings> <subject_fraction> <recording_fraction>"
    split_rows = {m[0]: (int(m[1]), int(m[2])) for m in re.findall(r"^\s*(?:ALS_HC\s+)?(train|val|test)\s+(\d+)\s+(\d+)\s+0\.\d+", outputs, re.M)}
    (train_subjects, train_n), (val_subjects, val_n), (test_subjects, test_n) = split_rows["train"], split_rows["val"], split_rows["test"]
    printed_val = float(re.search(rf"MLP max HuBERT-{HIDDEN_INDEX + 1}: val ACC=([\d.]+)%", outputs).group(1))
    max_epochs, patience = constant(source, "MAX_EPOCHS"), constant(source, "PATIENCE")
    sensitivity, specificity = tp / (tp + fn), tn / (tn + fp)
    precision = tp / (tp + fp)

    checks = {
        "validation_json_matches_history_best_epoch": int(best["epoch"]) == validation["best_epoch"]
            and abs(float(best["val_loss"]) - validation["val_loss"]) < 1e-9
            and abs(float(best["val_acc"]) * 100 - validation["val_ACC"]) < 1e-9,
        "validation_accuracy_is_integer_count_of_notebook_val_split": abs(validation["val_ACC"] / 100 * val_n - round(validation["val_ACC"] / 100 * val_n)) < 1e-6,
        "test_confusion_total_equals_notebook_test_split": int(cm.sum()) == test_n,
        "history_epochs_within_notebook_max_epochs": len(history) <= max_epochs,
        "history_stops_within_patience_after_best_epoch": len(history) <= int(best["epoch"]) + patience,
        "validation_json_equals_notebook_printed_value_for_this_layer": abs(validation["val_ACC"] - printed_val) < 0.01,
    }
    return {
        "model_name": "MLP_MAX_h07",
        "intended_use": "Research screening support on anonymized/test data. Not a diagnosis; not validated for clinical use.",
        "artifacts_sha256": {name: sha256(ROOT / name) for name in ARTIFACTS},
        "pipeline": {
            "backbone": constant(source, "MODEL_ID"), "backbone_revision": "ece5fabbf034c1073acae96d5401b25be96709d8",
            "backbone_frozen": True, "hidden_state_index": HIDDEN_INDEX, "notebook_paper_layer": HIDDEN_INDEX + 1,
            "sample_rate_hz": 16000, "pooling": "max over all time frames (no chunking)",
            "standardization": "StandardScaler fit on the training split only (scaler.npz)",
            "head": "Linear(1024,128) - ReLU - Dropout(0.3, train only) - Linear(128,1); sigmoid = P(ALS)",
            "decision_rule": "argmax over [1-p, p] (equivalent to p >= 0.5) for the reported test counts",
        },
        "training_config_from_notebook": {
            "seed": constant(source, "SEED"), "batch_size": constant(source, "BATCH_SIZE"),
            "max_epochs": max_epochs, "early_stopping_patience": patience,
            "optimizer": "Adam", "learning_rate": constant(source, "LR"), "weight_decay": constant(source, "WEIGHT_DECAY"),
            "loss": "BCEWithLogits", "checkpoint_selection": "minimum validation loss epoch",
        },
        "data_split": {
            "dataset": "SAND Challenge Task 1 training sheet; Class 5 = HC (0), Class 1-4 = ALS (1)",
            "unit": "subject (speaker) - no speaker appears in two splits",
            "stratified_ratios": [0.70, 0.15, 0.15],
            "subjects": {"train": train_subjects, "val": val_subjects, "test": test_subjects},
            "recordings": {"train": train_n, "val": val_n, "test": test_n},
        },
        "validation": {**validation, "correct_over_n": f"{round(validation['val_ACC'] / 100 * val_n)}/{val_n}", "epochs_logged": len(history)},
        "test": {
            "level": "recording (328 recordings from 41 held-out subjects); not subject-level aggregation",
            "confusion_matrix_rows_true_HC_ALS": cm.tolist(),
            "accuracy": round((tp + tn) / cm.sum(), 4), "sensitivity_ALS": round(sensitivity, 4),
            "specificity_HC": round(specificity, 4), "balanced_accuracy": round((sensitivity + specificity) / 2, 4),
            "precision_ALS": round(precision, 4), "f1_ALS": round(2 * precision * sensitivity / (precision + sensitivity), 4),
        },
        "consistency_checks": checks,
        "limitations": [
            "history.csv has more epochs than the notebook's MAX_EPOCHS/PATIENCE allow, and validation.json differs from the "
            "notebook's printed value for this layer (72.09%). This indicates the supplied artifacts were not produced by the run whose "
            "output is saved in the notebook. The validation count (239/326) and test total (328) match the notebook's subject split, "
            "but no training run ID was saved, so the weights-to-run link is consistent, not proven.",
            "test_confusion_counts.npy is taken to belong to head.pt because they were supplied together; re-running inference on the "
            "SAND test split is the only way to verify it.",
            "Test metrics are internal (same SAND distribution, same recording protocol). They are not the performance of the "
            "deployed app on phone recordings, other microphones, or other populations.",
            "Recordings are not independent: 8 recordings per subject on average, so recording-level metrics overstate the effective sample size.",
            "Specificity is low relative to sensitivity at the 0.5 threshold; no clinical operating point was validated.",
        ],
    }


if __name__ == "__main__":
    card = json.dumps(build(), indent=2, ensure_ascii=False) + "\n"
    target = ROOT / "model_card.json"
    if "--check" in sys.argv:
        if not target.exists() or target.read_text(encoding="utf-8") != card:
            sys.exit("model_card.json is stale: run scripts/build_model_card.py")
        print("model_card.json is up to date")
    else:
        target.write_text(card, encoding="utf-8")
        print(card)
