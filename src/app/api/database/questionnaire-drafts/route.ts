import { deleteQuestionnaireDraft, loadQuestionnaireDraft, saveQuestionnaireDraft } from "@/lib/firebase-database";

export const runtime = "nodejs";

function failure(error: unknown) {
  const detail = error instanceof Error ? error.message : "Draft request failed.";
  return Response.json({ detail }, { status: /Firebase|credentials/.test(detail) ? 503 : 422 });
}

export async function GET(request: Request) {
  try { return Response.json({ draft: await loadQuestionnaireDraft(new URL(request.url).searchParams.get("subject_id") ?? "") }); }
  catch (error) { return failure(error); }
}

export async function PUT(request: Request) {
  try {
    if (Number(request.headers.get("content-length")) > 5000) return Response.json({ detail: "Draft payload is too large." }, { status: 413 });
    return Response.json(await saveQuestionnaireDraft(await request.json()));
  } catch (error) { return failure(error); }
}

export async function DELETE(request: Request) {
  try { await deleteQuestionnaireDraft(new URL(request.url).searchParams.get("subject_id") ?? ""); return new Response(null, { status: 204 }); }
  catch (error) { return failure(error); }
}
