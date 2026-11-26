"""Multi-seed retraining of the deployed head (HuBERT h07 + time max + MLP) and validation-based OOD calibration.

Why: the deployed configuration was trained with one seed (42), so its CIs carry subject-resampling uncertainty
only. The OOD threshold in ood_calibration.json was set from 4 cached *test* features. This script answers both
on the same subject split (9bb28df8) without touching the test split for any choice.

Run in Google Colab with Drive mounted (CPU is enough; ~1 min per seed):

    !git clone https://github.com/KYU-SW/INSIGHT.git && cd INSIGHT && pip -q install torch numpy
    !python experiments/h7_multiseed/run_h7_multiseed.py \
        --cache-dir "/content/drive/MyDrive/2026_2_INSIGHT/ALS_RESULTS/ALS_voice_analysis_20260921_075155/HUBERT_ALL_LAYERS_POOLED_CACHE_V1" \
        --out experiments/h7_multiseed

The cache holds one <sample_id>.npz per recording with `pooled` float32 (25, 2, 1024) = hidden state x [mean, max]
(7EXP notebook). The h07 time-max feature is pooled[7, 1]; it was checked against
provenance/.../test_features_h07_max.npz (max |diff| <= 7.3e-5 on a feature scale of ~80) and reproduces the stored
deployed probabilities. The script writes h07_max_9bb28df8.npz (~9 MB) so later runs can use --features instead.

Recipe = deployed run 20261005T055211_070474Z: StandardScaler fit on train, Linear(1024,128)-ReLU-Linear(128,1)
(head.pt has classifier.0/classifier.2, i.e. no dropout layer), Adam lr 1e-3, batch 64, BCE, max 100 epochs,
patience 20 on validation loss, best-val-loss weights. Weight decay is not recorded in that run's config; default 0
(override with --weight-decay). Subject rule fixed in advance: mean P(ALS) over recordings >= 0.5.
"""

import argparse
import csv
import hashlib
import json
import random
from pathlib import Path

import numpy as np
import torch
from torch import nn

ROOT = Path(__file__).resolve().parents[2]
RUN = ROOT / "provenance" / "run_20261005T055211_070474Z"


def load_manifest(path):
    rows = list(csv.DictReader(open(path, newline="")))
    return [(r["sample_id"], r["subject"], int(r["label"]), r["split"]) for r in rows]


def consolidate(cache_dir, manifest, out_path):
    feats = np.empty((len(manifest), 1024), dtype=np.float32)
    for i, (sample_id, *_rest) in enumerate(manifest):
        with np.load(Path(cache_dir) / f"{sample_id}.npz", allow_pickle=False) as z:
            pooled = z["pooled"]
        if pooled.shape != (25, 2, 1024):
            raise ValueError(f"{sample_id}: unexpected pooled shape {pooled.shape}")
        feats[i] = pooled[7, 1]
    np.savez(out_path, features=feats, sample_id=np.array([m[0] for m in manifest]))
    return feats


def check_against_provenance(feats, manifest):
    ref_path = RUN / "test_features_h07_max.npz"
    if not ref_path.exists():
        return None
    index = {m[0]: i for i, m in enumerate(manifest)}
    with np.load(ref_path, allow_pickle=False) as ref:  # keys are sample_ids, values the 1024-d h07 max feature
        ref_x = {k: ref[k] for k in ref.keys()}
    ids = list(ref_x)
    diff = max(float(np.max(np.abs(feats[index[s]] - ref_x[s]))) for s in ids)
    if diff > 1e-3:
        raise SystemExit(f"Feature mismatch vs provenance (max |diff| {diff:.2e}): wrong layer/pooling or cache version")
    return {"n": len(ids), "max_abs_diff": diff}


class Head(nn.Module):
    def __init__(self, dropout):
        super().__init__()
        layers = [nn.Linear(1024, 128), nn.ReLU()] + ([nn.Dropout(dropout)] if dropout else []) + [nn.Linear(128, 1)]
        self.classifier = nn.Sequential(*layers)

    def forward(self, x):
        return self.classifier(x)[:, 0]


def seed_everything(seed):
    random.seed(seed); np.random.seed(seed); torch.manual_seed(seed)
    torch.use_deterministic_algorithms(True, warn_only=True)


@torch.no_grad()
def predict(model, x):
    model.eval()
    return torch.sigmoid(model(torch.from_numpy(x))).numpy()


def train(x_tr, y_tr, x_va, y_va, seed, args):
    seed_everything(seed)
    model = Head(args.dropout)
    opt = torch.optim.Adam(model.parameters(), lr=1e-3, weight_decay=args.weight_decay)
    xt, yt = torch.from_numpy(x_tr), torch.from_numpy(y_tr.astype(np.float32))
    xv, yv = torch.from_numpy(x_va), torch.from_numpy(y_va.astype(np.float32))
    gen = torch.Generator().manual_seed(seed)
    best, best_state, best_epoch, stale = float("inf"), None, 0, 0
    for epoch in range(1, args.max_epochs + 1):
        model.train()
        for idx in torch.randperm(len(xt), generator=gen).split(64):
            opt.zero_grad(set_to_none=True)
            nn.functional.binary_cross_entropy_with_logits(model(xt[idx]), yt[idx]).backward()
            opt.step()
        model.eval()
        with torch.no_grad():
            vloss = float(nn.functional.binary_cross_entropy_with_logits(model(xv), yv))
        if vloss < best:
            best, best_epoch, stale = vloss, epoch, 0
            best_state = {k: v.clone() for k, v in model.state_dict().items()}
        else:
            stale += 1
            if stale >= args.patience:
                break
    model.load_state_dict(best_state)
    return model, best_epoch


def auroc(y, p):
    pos, neg = p[y == 1], p[y == 0]
    return float(((pos[:, None] > neg[None, :]).sum() + 0.5 * (pos[:, None] == neg[None, :]).sum()) / (len(pos) * len(neg)))


def binary(y, p):
    pred = p >= 0.5
    se, sp = float(pred[y == 1].mean()), float((~pred[y == 0]).mean())
    return {"accuracy": float((pred == (y == 1)).mean()), "sensitivity": se, "specificity": sp, "auroc": auroc(y, p)}


def by_subject(subjects, y, p):
    ids = sorted(set(subjects))
    sp = np.array([p[subjects == s].mean() for s in ids])
    sy = np.array([y[subjects == s][0] for s in ids])
    return sy, sp


def bootstrap_auroc(y, p, n=10000, seed=0):
    rng = np.random.default_rng(seed)
    groups = [np.flatnonzero(y == c) for c in (0, 1)]
    vals = [auroc(y[i], p[i]) for i in (np.concatenate([rng.choice(g, len(g)) for g in groups]) for _ in range(n))]
    return [float(np.percentile(vals, 2.5)), float(np.percentile(vals, 97.5))]


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--cache-dir", help="HUBERT_ALL_LAYERS_POOLED_CACHE_V1 folder (per-recording npz)")
    src.add_argument("--features", help="consolidated h07_max_9bb28df8.npz written by an earlier run")
    ap.add_argument("--manifest", default=str(RUN / "split_manifest.csv"))
    ap.add_argument("--scaler", default=str(ROOT / "scaler.npz"), help="deployed scaler, used for the OOD distance")
    ap.add_argument("--out", default=str(Path(__file__).parent))
    ap.add_argument("--seeds", default="42,43,44,45,46")
    ap.add_argument("--dropout", type=float, default=0.0)
    ap.add_argument("--weight-decay", type=float, default=0.0)
    ap.add_argument("--max-epochs", type=int, default=100)
    ap.add_argument("--patience", type=int, default=20)
    ap.add_argument("--bootstrap", type=int, default=10000)
    args = ap.parse_args()
    out = Path(args.out); out.mkdir(parents=True, exist_ok=True)

    manifest = load_manifest(args.manifest)
    if args.cache_dir:
        feats_path = out / "h07_max_9bb28df8.npz"
        feats = consolidate(args.cache_dir, manifest, feats_path)
    else:
        feats_path = Path(args.features)
        with np.load(feats_path, allow_pickle=False) as z:
            order = {str(s): i for i, s in enumerate(z["sample_id"])}
            feats = z["features"][[order[m[0]] for m in manifest]].astype(np.float32)
    provenance_check = check_against_provenance(feats, manifest)

    split = np.array([m[3] for m in manifest]); y = np.array([m[2] for m in manifest])
    subj = np.array([m[1] for m in manifest])
    tr, va, te = (split == s for s in ("train", "val", "test"))
    mean, std = feats[tr].mean(0), feats[tr].std(0)
    std[std == 0] = 1.0
    z = ((feats - mean) / std).astype(np.float32)

    per_seed, test_probs = [], []
    for seed in (int(s) for s in args.seeds.split(",")):
        model, best_epoch = train(z[tr], y[tr], z[va], y[va], seed, args)
        p = predict(model, z[te]); test_probs.append(p)
        sy, sp = by_subject(subj[te], y[te], p)
        per_seed.append({"seed": seed, "best_epoch": best_epoch, "recording": binary(y[te], p), "subject": binary(sy, sp)})
        print(f"seed {seed}: best epoch {best_epoch}, test rec ACC {per_seed[-1]['recording']['accuracy']:.4f}, "
              f"subject AUROC {per_seed[-1]['subject']['auroc']:.3f}")

    def summary(level, key):
        v = np.array([r[level][key] for r in per_seed])
        return {"mean": float(v.mean()), "sd": float(v.std(ddof=1)) if len(v) > 1 else 0.0}

    ens = np.mean(test_probs, axis=0)
    sy, sp = by_subject(subj[te], y[te], ens)

    with np.load(args.scaler, allow_pickle=False) as s:
        dmean, dscale = s["mean"], s["scale"]
    dist = np.sqrt(np.mean(((feats - dmean) / dscale) ** 2, axis=1))
    threshold = float(np.percentile(dist[va], 99))
    ood = {"rule": "99th percentile of VALIDATION distances (deployed scaler); test not used for the choice",
           "threshold": round(threshold, 4),
           "validation_distance_percentiles": {q: round(float(np.percentile(dist[va], q)), 4) for q in (50, 90, 95, 99, 100)},
           "flagged_fraction": {name: float((dist[m] > threshold).mean()) for name, m in (("train", tr), ("val", va), ("test", te))}}

    result = {
        "features": {"path": str(feats_path.name), "sha256": hashlib.sha256(feats.tobytes()).hexdigest(),
                     "provenance_check": provenance_check},
        "recipe": {"dropout": args.dropout, "weight_decay": args.weight_decay, "max_epochs": args.max_epochs,
                   "patience": args.patience, "lr": 1e-3, "batch_size": 64, "torch": torch.__version__},
        "n": {"train": int(tr.sum()), "val": int(va.sum()), "test": int(te.sum()), "test_subjects": len(sy)},
        "per_seed": per_seed,
        "mean_sd": {lvl: {k: summary(lvl, k) for k in ("accuracy", "sensitivity", "specificity", "auroc")}
                    for lvl in ("recording", "subject")},
        "seed_ensemble_subject": binary(sy, sp) | {"auroc_ci95": bootstrap_auroc(sy, sp, args.bootstrap)},
        "ood_validation_calibration": ood,
        "note": "Deployed seed-42 run reported test recording ACC 75.30%; seed 42 here may differ slightly "
                "(GPU vs CPU arithmetic, torch version).",
    }
    (out / "results.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({"mean_sd": result["mean_sd"], "ensemble": result["seed_ensemble_subject"], "ood": ood}, indent=2))


if __name__ == "__main__":
    main()
