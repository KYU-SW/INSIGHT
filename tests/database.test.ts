import assert from "node:assert/strict";
import { createVerify, generateKeyPairSync } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { firebaseAccessToken } from "../src/lib/firebase-auth";
import { checkDatabaseConnection, loadDatabaseQuestionnaires, loadQuestionnaireDraft, saveQuestionnaireDraft, loadDatabaseResults, uploadDatabaseResult, uploadQuestionnaire } from "../src/lib/firebase-database";
import type { ClinicalInference } from "../src/types";

process.env.FIREBASE_DATABASE_URL = "https://example-default-rtdb.firebaseio.com";
const keyDir = mkdtempSync(join(tmpdir(), "insight-sa-"));
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const keyPath = join(keyDir, "service-account.json");
writeFileSync(keyPath, JSON.stringify({ client_email: "test@example.iam.gserviceaccount.com", private_key: privateKey.export({ type: "pkcs8", format: "pem" }) }));
process.env.FIREBASE_SERVICE_ACCOUNT_PATH = keyPath;

test("server signs an RS256 service-account assertion and caches the access token", async () => {
  const original = globalThis.fetch;
  const assertions: string[] = [];
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://oauth2.googleapis.com/token");
    assertions.push(new URLSearchParams(String(init?.body)).get("assertion")!);
    return Response.json({ access_token: "test-token", expires_in: 3600 });
  };
  try {
    assert.equal(await firebaseAccessToken(), "test-token");
    assert.equal(await firebaseAccessToken(), "test-token");
    assert.equal(assertions.length, 1);
    const [header, claims, signature] = assertions[0].split(".");
    assert.ok(createVerify("RSA-SHA256").update(`${header}.${claims}`).verify(publicKey, Buffer.from(signature, "base64url")));
    const payload = JSON.parse(Buffer.from(claims, "base64url").toString());
    assert.match(payload.scope, /firebase\.database/);
    assert.equal(payload.iss, "test@example.iam.gserviceaccount.com");
  } finally {
    globalThis.fetch = original;
  }
});

test("database access is refused without a service account instead of falling back to public access", async () => {
  delete process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const original = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => { called = true; return Response.json({}); };
  try {
    await assert.rejects(checkDatabaseConnection(), /credentials are not set/);
    assert.equal(called, false);
  } finally {
    globalThis.fetch = original;
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH = keyPath;
  }
});

test("connection fails when Firebase denies collection-level reads", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ error: "Permission denied" }, { status: 401 });
  try {
    await assert.rejects(checkDatabaseConnection(), /서비스 계정/);
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
    assert.match(String(writes[2].body.model_card_sha256), /^[a-f0-9]{64}$/);
    assert.equal(writes[3].body.analysis_id, ids.analysis_id);
    assert.equal(writes.some(write => "audio" in write.body || "file" in write.body), false);
  } finally {
    globalThis.fetch = original;
  }
});

test("VHI upload recomputes scores on the server and ignores client-sent scores", async () => {
  const writes: { path: string; body: Record<string, unknown> }[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const path = new URL(String(input)).pathname;
    if (init?.method === "PUT") writes.push({ path, body: JSON.parse(String(init.body)) as Record<string, unknown> });
    return Response.json(init?.method === "PUT" ? {} : null);
  };
  try {
    const forged = { subject_id: "s1", completed_at: "2026-11-26T00:00:00Z", answers: Array(30).fill(2), scores: { total: 0 } };
    await uploadQuestionnaire(forged);
    const stored = writes.find(write => write.path.startsWith("/questionnaires/"))!.body;
    assert.equal(stored.subject_id, "S1");
    assert.equal(stored.total_score, 60);
    assert.equal(stored.functional_score, 20);
    assert.equal("scores" in stored, false);
    await assert.rejects(uploadQuestionnaire({ ...forged, answers: Array(29).fill(2) }), /30개/);
  } finally {
    globalThis.fetch = original;
  }
});

test("stored questionnaires with malformed answers are skipped, not partially scored", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json({
    Q1: { questionnaire_id: "Q1", subject_id: "S1", completed_at: "2026-11-26T00:00:00Z", answers: Array(30).fill(1) },
    Q2: { questionnaire_id: "Q2", subject_id: "S1", completed_at: "2026-11-26T00:00:00Z", answers: [1, 2, 9] },
  });
  try {
    const loaded = await loadDatabaseQuestionnaires();
    assert.deepEqual(loaded.map(entry => entry.id), ["Q1"]);
    assert.equal(loaded[0].scores.total, 30);
  } finally {
    globalThis.fetch = original;
  }
});

test("every Realtime Database request carries the server access token", async () => {
  const original = globalThis.fetch;
  const urls: URL[] = [];
  globalThis.fetch = async input => { urls.push(new URL(String(input))); return Response.json(null); };
  try {
    await checkDatabaseConnection();
    assert.equal(urls.length, 4);
    assert.ok(urls.every(url => url.searchParams.get("access_token") === "test-token"));
  } finally {
    globalThis.fetch = original;
  }
});

test("a configured Database Secret is sent as the auth parameter instead of an OAuth token", async () => {
  process.env.FIREBASE_DATABASE_SECRET = "test-secret";
  const original = globalThis.fetch;
  const urls: URL[] = [];
  globalThis.fetch = async input => { urls.push(new URL(String(input))); return Response.json(null); };
  try {
    await checkDatabaseConnection();
    assert.ok(urls.every(url => url.searchParams.get("auth") === "test-secret" && !url.searchParams.has("access_token")));
  } finally {
    globalThis.fetch = original;
    delete process.env.FIREBASE_DATABASE_SECRET;
  }
});

test("VHI drafts store only answered items, validate values, and restore in item order", async () => {
  const writes: { path: string; body: Record<string, unknown> }[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const path = new URL(String(input)).pathname;
    if (init?.method === "PUT") { writes.push({ path, body: JSON.parse(String(init.body)) }); return Response.json({}); }
    return Response.json(writes.at(-1)?.body ?? null);
  };
  try {
    const answers = Array(30).fill(null); answers[0] = 3; answers[29] = 0;
    await saveQuestionnaireDraft({ subject_id: "subj_1", answers, current_index: 29 });
    assert.equal(writes[0].path, "/questionnaire_drafts/SUBJ_1.json");
    assert.deepEqual(writes[0].body.answers, { 1: 3, 30: 0 });
    const draft = await loadQuestionnaireDraft("SUBJ_1");
    assert.equal(draft?.answers[0], 3);
    assert.equal(draft?.answers[29], 0);
    assert.equal(draft?.answers.filter(value => value !== null).length, 2);
    assert.equal(draft?.current_index, 29);
    await assert.rejects(saveQuestionnaireDraft({ subject_id: "S1", answers: [...answers.slice(0, 29), 7], current_index: 0 }), /문항 30/);
    await assert.rejects(saveQuestionnaireDraft({ subject_id: "S1", answers, current_index: 30 }), /문항 위치/);
  } finally {
    globalThis.fetch = original;
  }
});
