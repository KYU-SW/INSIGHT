export const runtime = "nodejs";

export async function POST(request: Request) {
  const backend = process.env.INFERENCE_API_URL ?? "http://127.0.0.1:8001";
  // Server-only shared secret for src/backend/app.py; never NEXT_PUBLIC_, never sent to the browser.
  const token = process.env.INSIGHT_BACKEND_TOKEN;
  try {
    const body = await request.formData();
    const file = body.get("file");
    if (!(file instanceof File) || file.size === 0 || file.size > 25 * 1024 * 1024) {
      return Response.json({ detail: "Select an audio file up to 25 MB." }, { status: 422 });
    }
    const headers = token ? { authorization: `Bearer ${token}` } : undefined;
    const response = await fetch(`${backend}/analyze`, { method: "POST", body, headers, cache: "no-store" });
    if (response.status === 401 || (response.status === 503 && (await response.clone().text()).includes("backend token not configured"))) {
      // Do not forward auth details to the browser; this is a server configuration problem.
      return Response.json({ detail: "Inference server rejected this app's credentials. Check INSIGHT_BACKEND_TOKEN on both servers." }, { status: 502 });
    }
    return new Response(await response.text(), {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return Response.json({ detail: "Inference server is unavailable. Start the Python service." }, { status: 503 });
  }
}
