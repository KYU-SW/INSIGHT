import { loadDatabaseResults, uploadDatabaseResult } from "@/lib/firebase-database";
import type { ClinicalInference } from "@/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    return Response.json({ results: await loadDatabaseResults() });
  } catch (error) {
    return Response.json({ detail: error instanceof Error ? error.message : "Database loading failed." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    if (Number(request.headers.get("content-length")) > 50000) return Response.json({ detail: "Result payload is too large." }, { status: 413 });
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || !("result" in body)) throw new Error("분석 결과가 필요합니다.");
    const saved = await uploadDatabaseResult(body.result as ClinicalInference);
    return Response.json(saved, { status: 201 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Database upload failed.";
    return Response.json({ detail }, { status: detail.includes("Firebase") ? 503 : 422 });
  }
}
