import { loadDatabaseQuestionnaires, uploadQuestionnaire } from "@/lib/firebase-database";
import type { VhiResult } from "@/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    return Response.json({ questionnaires: await loadDatabaseQuestionnaires() });
  } catch (error) {
    return Response.json({ detail: error instanceof Error ? error.message : "Questionnaire loading failed." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    if (Number(request.headers.get("content-length")) > 10000) return Response.json({ detail: "Questionnaire payload is too large." }, { status: 413 });
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || !("questionnaire" in body)) throw new Error("문진 결과가 필요합니다.");
    return Response.json(await uploadQuestionnaire(body.questionnaire as VhiResult), { status: 201 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Questionnaire upload failed.";
    return Response.json({ detail }, { status: detail.includes("Firebase") ? 503 : 422 });
  }
}
