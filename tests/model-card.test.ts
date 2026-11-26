import assert from "node:assert/strict";
import { test } from "node:test";
import { loadVerifiedModelCard } from "../src/lib/model-card";

test("deployed head.pt and scaler.npz are exactly the artifacts described by model_card.json", async () => {
  const { card, weightsMatchCard, mismatched } = await loadVerifiedModelCard();
  assert.deepEqual(mismatched, []);
  assert.equal(weightsMatchCard, true);
  assert.equal(card.model_name, "MLP_MAX_h07");
});

test("model card test counts are internally consistent with the subject split", async () => {
  const { card } = await loadVerifiedModelCard();
  const [[tn, fp], [fn, tp]] = card.test.confusion_matrix_rows_true_HC_ALS;
  assert.equal(tn + fp + fn + tp, card.data_split.recordings.test);
  assert.equal(Math.round(((tn + tp) / (tn + fp + fn + tp)) * 1e4) / 1e4, card.test.accuracy);
  // Every provenance proof step (scripts/build_model_card.py) must have passed when the card was written.
  const proofs = Object.entries(card.provenance_checks).filter(([, value]) => typeof value === "boolean");
  assert.ok(proofs.length >= 10);
  assert.deepEqual(proofs.filter(([, ok]) => !ok), []);
  assert.equal(card.training_run.run_id, "20261005T055211_070474Z");
});
