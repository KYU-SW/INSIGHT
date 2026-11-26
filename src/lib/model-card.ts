import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type ModelCard = {
  model_name: string;
  artifacts_sha256: Record<string, string>;
  data_split: { subjects: Record<"train" | "val" | "test", number>; recordings: Record<"train" | "val" | "test", number> };
  validation: { val_ACC: number; best_epoch: number; correct_over_n: string; epochs_logged: number };
  test: { level: string; confusion_matrix_rows_true_HC_ALS: number[][]; accuracy: number; sensitivity_ALS: number; specificity_HC: number; balanced_accuracy: number };
  training_run: { run_id: string; evidence_dir: string };
  test_uncertainty: { subjects: { HC: number; ALS: number }; subject_sensitivity_by_sand_class: Record<string, { n_ALS: number; detected: number; sensitivity: number }> }
    & Record<"recording" | "subject", Record<string, { value: number; ci95: [number, number] }>>;
  training_config: Record<string, unknown>;
  provenance_checks: Record<string, boolean | number>;
  limitations: string[];
};

/** Loads model_card.json and confirms the deployed weights are the ones the card describes. */
export async function loadVerifiedModelCard(root = process.cwd()) {
  const card = JSON.parse(await readFile(join(root, "model_card.json"), "utf8")) as ModelCard;
  const deployed = await Promise.all(["head.pt", "scaler.npz"].map(async name =>
    [name, createHash("sha256").update(await readFile(join(root, name))).digest("hex")] as const));
  const mismatched = deployed.filter(([name, hash]) => card.artifacts_sha256[name] !== hash).map(([name]) => name);
  return { card, weightsMatchCard: mismatched.length === 0, mismatched, cardSha256: createHash("sha256").update(JSON.stringify(card)).digest("hex") };
}
