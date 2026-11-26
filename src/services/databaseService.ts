import type { ClinicalInference, SessionResult, VhiResult } from "@/types";

async function readResponse<T>(response: Response): Promise<T> {
  const payload: unknown = await response.json();
  if (!response.ok) {
    const detail = payload && typeof payload === "object" && "detail" in payload ? String(payload.detail) : "Database request failed.";
    throw new Error(detail);
  }
  return payload as T;
}

export async function connectDatabase(): Promise<void> {
  await readResponse<{ connected: true }>(await fetch("/api/database/connect", { cache: "no-store" }));
}

export async function loadSavedResults(): Promise<SessionResult[]> {
  const response = await fetch("/api/database/results", { cache: "no-store" });
  return (await readResponse<{ results: SessionResult[] }>(response)).results;
}

export async function saveResult(result: ClinicalInference): Promise<{ analysis_id: string; recording_id: string }> {
  return readResponse(await fetch("/api/database/results", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ result }),
  }));
}

export async function loadSavedQuestionnaires(): Promise<VhiResult[]> {
  const response = await fetch("/api/database/questionnaires", { cache: "no-store" });
  return (await readResponse<{ questionnaires: VhiResult[] }>(response)).questionnaires;
}

export async function saveQuestionnaire(questionnaire: VhiResult): Promise<{ questionnaire_id: string }> {
  const { subject_id, completed_at, answers } = questionnaire;
  return readResponse(await fetch("/api/database/questionnaires", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ questionnaire: { subject_id, completed_at, answers } }),
  }));
}

export type QuestionnaireDraft = { subject_id: string; answers: (number | null)[]; current_index: number; updated_at: string };
const draftUrl = (subjectId: string) => `/api/database/questionnaire-drafts?subject_id=${encodeURIComponent(subjectId)}`;

export async function loadQuestionnaireDraft(subjectId: string): Promise<QuestionnaireDraft | null> {
  return (await readResponse<{ draft: QuestionnaireDraft | null }>(await fetch(draftUrl(subjectId), { cache: "no-store" }))).draft;
}

export async function saveQuestionnaireDraft(subjectId: string, answers: (number | null)[], currentIndex: number): Promise<{ updated_at: string }> {
  return readResponse(await fetch("/api/database/questionnaire-drafts", {
    method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ subject_id: subjectId, answers, current_index: currentIndex }),
  }));
}

export async function deleteQuestionnaireDraft(subjectId: string): Promise<void> {
  const response = await fetch(draftUrl(subjectId), { method: "DELETE" });
  if (!response.ok) await readResponse(response);
}
