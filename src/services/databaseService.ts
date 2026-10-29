import type { ClinicalInference, SessionResult } from "@/types";

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
