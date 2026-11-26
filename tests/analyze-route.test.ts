import assert from "node:assert/strict";
import { test } from "node:test";
import { POST } from "../src/app/api/analyze/route";

function upload() {
  const body = new FormData();
  body.set("file", new File([new Uint8Array(64)], "a.wav", { type: "audio/wav" }));
  body.set("user_id", "SUBJ_001");
  return new Request("http://localhost/api/analyze", { method: "POST", body });
}

async function withFetch(reply: Response, run: (seen: Headers[]) => Promise<void>) {
  const original = globalThis.fetch;
  const seen: Headers[] = [];
  globalThis.fetch = async (_input, init) => { seen.push(new Headers(init?.headers)); return reply; };
  try { await run(seen); } finally { globalThis.fetch = original; }
}

test("analyze proxy sends the server-only bearer token to the inference backend", async () => {
  process.env.INSIGHT_BACKEND_TOKEN = "route-test-token";
  await withFetch(Response.json({ ok: true }), async seen => {
    const response = await POST(upload());
    assert.equal(response.status, 200);
    assert.equal(seen[0].get("authorization"), "Bearer route-test-token");
  });
});

test("analyze proxy hides backend auth failures from the browser", async () => {
  process.env.INSIGHT_BACKEND_TOKEN = "wrong";
  await withFetch(Response.json({ detail: "Invalid or missing bearer token" }, { status: 401 }), async () => {
    const response = await POST(upload());
    assert.equal(response.status, 502);
    assert.doesNotMatch(await response.text(), /wrong|bearer token/i);
  });
});

test("analyze proxy sends no authorization header when no token is configured", async () => {
  delete process.env.INSIGHT_BACKEND_TOKEN;
  await withFetch(Response.json({ ok: true }), async seen => {
    await POST(upload());
    assert.equal(seen[0].get("authorization"), null);
  });
});
