import assert from "node:assert/strict";
import { test } from "node:test";
import { checkDatabaseConnection, loadDatabaseResults, uploadDatabaseResult } from "../src/lib/firebase-database";
import type { ClinicalInference } from "../src/types";

process.env.FIREBASE_DATABASE_URL = "https://example-default-rtdb.firebaseio.com";
test("connection fails when Firebase denies collection-level reads", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ error: "Permission denied" }, { status: 401 });
  try {
    await assert.rejects(checkDatabaseConnection(), /컬렉션의 \.read 규칙/);
  } finally {
    globalThis.fetch = original;
  }
});

test("database records map to a result without inventing unavailable acoustic values", async () => {
  const values: Record<string, unknown> = {
    subjects: { S1: { subject_id: "S1", created_at: "2026-10-06T00:00:00Z" } },
    recordings: { R1: { recording_id: "R1", subject_id: "S1", recorded_at: "2026-10-06T01:00:00Z", task_code: "phonation_a", duration_seconds: 4.8, rms_dbfs: -21, near_full_scale_percent: 0.1 } },
    analyses: { A1: { analysis_id: "A1", recording_id: "R1", analyzed_at: "2026-10-06T01:01:00Z", model_name: "MLP_MAX_h07", model_score: 0.7342 } },
    acoustic_metrics: { A1: { analysis_id: "A1", mean_pitch_hz: 142, pitch_sd_hz: 11, pitch_cv: 0.07, intensity_cv: 0.06, mean_intensity_dbfs: -20 } },
  };
  const original = globalThis.fetch;
  globalThis.fetch = async input => Response.json(values[new URL(String(input)).pathname.split("/")[1].replace(".json", "")] ?? null);
  try {
    const [saved] = await loadDatabaseResults();
    assert.equal(saved.result.task.label, "Sustained /a/");
    assert.equal(saved.result.model.score, 0.7342);
    assert.equal(saved.result.model.display_score, 73.4);
    assert.equal(saved.result.acoustic.jitter_percent, null);
    assert.equal(saved.databaseAnalysisId, "A1");
  } finally {
    globalThis.fetch = original;
  }
});

test("upload writes the four schema records and never includes raw audio", async () => {
  const result: ClinicalInference = {
    user_id: "S1", recording_timestamp: "2026-10-06T01:00:00Z", analyzed_at: "2026-10-06T01:01:00Z",
    task: { code: "vowel_a", label: "Sustained /a/" },
    model: { name: "MLP_MAX_h07", score: 0.42, display_score: 42, status: null, status_reason: null },
    recording_quality: { assessment: null, duration_seconds: 4.8, rms_dbfs: -21, near_full_scale_percent: 0.1 },
    phonation: { stability: null, pitch_stability: 0.07, intensity_stability: 0.06 },
    acoustic: { jitter_percent: null, shimmer_percent: null, hnr_db: null,
      mean_pitch_hz: 142, pitch_sd_hz: 11, pitch_cv: 0.07, intensity_cv: 0.06, mean_intensity_dbfs: -20 },
  };
  const writes: { path: string; body: Record<string, unknown> }[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const path = new URL(String(input)).pathname;
    if (init?.method === "PUT") writes.push({ path, body: JSON.parse(String(init.body)) as Record<string, unknown> });
    return Response.json(init?.method === "PUT" ? {} : null);
  };
  try {
    const ids = await uploadDatabaseResult(result);
    assert.equal(writes.length, 4);
    assert.deepEqual(writes.map(write => write.path.split("/")[1]), ["subjects", "recordings", "analyses", "acoustic_metrics"]);
    assert.equal(writes[2].body.model_score, 0.42);
    assert.match(String(writes[2].body.model_version), /^sha256:[a-f0-9]{64}$/);
    assert.equal(writes[3].body.analysis_id, ids.analysis_id);
    assert.equal(writes.some(write => "audio" in write.body || "file" in write.body), false);
  } finally {
    globalThis.fetch = original;
  }
});
