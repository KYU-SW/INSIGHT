import { loadVerifiedModelCard } from "@/lib/model-card";

export const runtime = "nodejs";

export async function GET() {
  try {
    return Response.json(await loadVerifiedModelCard());
  } catch {
    return Response.json({ detail: "model_card.json could not be read." }, { status: 503 });
  }
}
