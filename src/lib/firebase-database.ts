import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ClinicalInference, SessionResult } from "@/types";
import { VOICE_TASKS } from "@/data/tasks";
import { isValidSubjectId, normalizeSubjectId, requireSubjectId } from "@/lib/subject-id";

const DEFAULT_URL = "Enter your Firebase URL";
const COLLECTIONS = ["subjects", "recordings", "analyses", "acoustic_metrics"] as const;
const PIPELINE_VERSION = "hubert-large-ls960-ft-ece5fabb-h07-max-standardscaler-mlp-v1";
type JsonRecord = Record<string, unknown>;

function databaseUrl(path: string, shallow = false) {
  const base = (process.env.FIREBASE_DATABASE_URL ?? DEFAULT_URL).replace(/\/$/, "");
  if (!/^https:\/\//.test(base)) throw new Error("FIREBASE_DATABASE_URL is not set. Enter your Firebase URL in .env.local.");
  return `${base}/${path}.json${shallow ? "?shallow=true" : ""}`;
}

async function request(path: string, init?: RequestInit, shallow = false): Promise<unknown> {
  const response = await fetch(databaseUrl(path, shallow), {
    ...init, cache: "no-store", signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    const detail = response.status === 401 || response.status === 403
      ? `Firebase ${path} 읽기/쓰기 권한이 없습니다 (${response.status}). 컬렉션의 .read 규칙을 확인하세요.`
      : `Firebase ${path} 요청 실패 (${response.status}).`;
    throw new Error(detail);
  }
  return response.json();
}

function records(value: unknown): JsonRecord[] {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.values(value).filter((item): item is JsonRecord => !!item && typeof item === "object" && !Array.isArray(item))
    : [];
}

function text(value: unknown): string | null { return typeof value === "string" ? value : null; }
function number(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) ? value : null; }

export async function checkDatabaseConnection() {
  await Promise.all(COLLECTIONS.map(collection => request(collection, undefined, true)));
}

export async function loadDatabaseResults(): Promise<SessionResult[]> {
  const [subjectsRaw, recordingsRaw, analysesRaw, metricsRaw] = await Promise.all(COLLECTIONS.map(collection => request(collection)));
  const normalizeId = (value: string | null) => (value === null ? null : normalizeSubjectId(value));
  const subjects = new Set(records(subjectsRaw).map(row => normalizeId(text(row.subject_id))).filter((id): id is string => !!id));
  const recordings = new Map(records(recordingsRaw).map(row => [text(row.recording_id), row]));
  const metrics = new Map(records(metricsRaw).map(row => [text(row.analysis_id), row]));
  const results: SessionResult[] = [];
  for (const analysis of records(analysesRaw)) {
    const analysisId = text(analysis.analysis_id);
    const recording = recordings.get(text(analysis.recording_id));
    const acoustic = metrics.get(analysisId);
    const subjectId = recording && normalizeId(text(recording.subject_id));
    const taskCode = recording && text(recording.task_code);
    // The supplied database.json example uses phonation_a for the same task.
    const task = VOICE_TASKS.find(item => item.code === (taskCode === "phonation_a" ? "vowel_a" : taskCode));
    const score = number(analysis.model_score);
    const recordedAt = recording && text(recording.recorded_at);
    if (!analysisId || !recording || !acoustic || !subjectId || !isValidSubjectId(subjectId) || !subjects.has(subjectId) || !task ||
        !recordedAt || !Number.isFinite(Date.parse(recordedAt)) || score === null || score < 0 || score > 1 ||
        analysis.model_name !== "MLP_MAX_h07") continue;
    const result: ClinicalInference = {
      user_id: subjectId, recording_timestamp: recordedAt,
      analyzed_at: text(analysis.analyzed_at) ?? recordedAt,
      task: { code: task.code, label: task.label },
      model: { name: "MLP_MAX_h07", score, display_score: Math.round(score * 1000) / 10,
        status: null, status_reason: "No validated three-level cutoff was supplied" },
      recording_quality: { assessment: null,
        duration_seconds: number(recording.duration_seconds) ?? 0,
        rms_dbfs: number(recording.rms_dbfs),
        near_full_scale_percent: number(recording.near_full_scale_percent) ?? 0 },
      phonation: { stability: null, pitch_stability: number(acoustic.pitch_cv), intensity_stability: number(acoustic.intensity_cv) },
      acoustic: { jitter_percent: number(acoustic.jitter_percent), shimmer_percent: number(acoustic.shimmer_percent),
        hnr_db: number(acoustic.hnr_db), mean_pitch_hz: number(acoustic.mean_pitch_hz),
        pitch_sd_hz: number(acoustic.pitch_sd_hz), pitch_cv: number(acoustic.pitch_cv),
        intensity_cv: number(acoustic.intensity_cv), mean_intensity_dbfs: number(acoustic.mean_intensity_dbfs) },
    };
    results.push({ id: analysisId, databaseAnalysisId: analysisId, result });
  }
  return results.sort((left, right) => right.result.recording_timestamp.localeCompare(left.result.recording_timestamp));
}

function requiredNumber(value: unknown, field: string): number {
  const parsed = number(value);
  if (parsed === null) throw new Error(`${field} 측정값이 없어 현재 Firebase 필수 스키마에 업로드할 수 없습니다.`);
  return parsed;
}

async function put(path: string, value: JsonRecord) {
  await request(path, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(value) });
}

export async function uploadDatabaseResult(result: ClinicalInference): Promise<{ analysis_id: string; recording_id: string }> {
  if (!result) throw new Error("분석 결과 형식이 올바르지 않습니다.");
  const subjectId = requireSubjectId(result.user_id);
  if (!VOICE_TASKS.some(task => task.code === result.task?.code) || result.model?.name !== "MLP_MAX_h07" ||
      number(result.model.score) === null || result.model.score < 0 || result.model.score > 1 ||
      !Number.isFinite(Date.parse(result.recording_timestamp))) throw new Error("분석 결과 형식이 올바르지 않습니다.");
  const recordingId = randomUUID();
  const analysisId = randomUUID();
  const now = new Date().toISOString();
  const [head, scaler] = await Promise.all([readFile(join(process.cwd(), "head.pt")), readFile(join(process.cwd(), "scaler.npz"))]);
  const headHash = createHash("sha256").update(head).digest("hex");
  const scalerHash = createHash("sha256").update(scaler).digest("hex");
  const recording: JsonRecord = {
    recording_id: recordingId, subject_id: subjectId, recorded_at: result.recording_timestamp,
    uploaded_at: now, task_code: result.task.code,
    duration_seconds: requiredNumber(result.recording_quality.duration_seconds, "duration_seconds"),
    rms_dbfs: requiredNumber(result.recording_quality.rms_dbfs, "rms_dbfs"),
    near_full_scale_percent: requiredNumber(result.recording_quality.near_full_scale_percent, "near_full_scale_percent"),
  };
  const analysis: JsonRecord = {
    analysis_id: analysisId, recording_id: recordingId,
    analyzed_at: result.analyzed_at ?? now,
    model_name: result.model.name, model_version: `sha256:${headHash}`,
    model_score: result.model.score, pipeline_version: PIPELINE_VERSION,
    backbone_revision: "ece5fabbf034c1073acae96d5401b25be96709d8",
    head_sha256: headHash, scaler_sha256: scalerHash,
  };
  const acoustic: JsonRecord = {
    analysis_id: analysisId,
    mean_pitch_hz: requiredNumber(result.acoustic.mean_pitch_hz, "mean_pitch_hz"),
    pitch_sd_hz: requiredNumber(result.acoustic.pitch_sd_hz, "pitch_sd_hz"),
    pitch_cv: requiredNumber(result.acoustic.pitch_cv, "pitch_cv"),
    intensity_cv: requiredNumber(result.acoustic.intensity_cv, "intensity_cv"),
    mean_intensity_dbfs: requiredNumber(result.acoustic.mean_intensity_dbfs, "mean_intensity_dbfs"),
  };
  for (const key of ["jitter_percent", "shimmer_percent", "hnr_db"] as const) {
    const value = number(result.acoustic[key]);
    if (value !== null) acoustic[key] = value;
  }
  const subjectPath = `subjects/${encodeURIComponent(subjectId)}`;
  const existing = await request(subjectPath);
  if (existing === null) await put(subjectPath, { subject_id: subjectId, created_at: now });
  const written: string[] = [];
  try {
    for (const [path, value] of [
      [`recordings/${recordingId}`, recording],
      [`analyses/${analysisId}`, analysis],
      [`acoustic_metrics/${analysisId}`, acoustic],
    ] as [string, JsonRecord][]) {
      await put(path, value);
      written.push(path);
    }
  } catch (error) {
    const cleanup = await Promise.allSettled(written.reverse().map(path => request(path, { method: "DELETE" })));
    if (cleanup.some(item => item.status === "rejected")) throw new Error("DB 업로드가 중단되었고 일부 기록 정리가 실패했습니다. 관리자 확인이 필요합니다.");
    throw error;
  }
  return { analysis_id: analysisId, recording_id: recordingId };
}
