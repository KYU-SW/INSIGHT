export const runtime = "nodejs";

export async function POST(request: Request) {
  const backend = process.env.INFERENCE_API_URL ?? "http://127.0.0.1:8001";
  try {
    const body = await request.formData();
    const file = body.get("file");
    if (!(file instanceof File) || file.size === 0 || file.size > 25 * 1024 * 1024) {
      return Response.json({ detail: "Select an audio file up to 25 MB." }, { status: 422 });
    }
    const response = await fetch(`${backend}/analyze`, { method: "POST", body, cache: "no-store" });
    return new Response(await response.text(), {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return Response.json({ detail: "Inference server is unavailable. Start the Python service." }, { status: 503 });
  }
}
