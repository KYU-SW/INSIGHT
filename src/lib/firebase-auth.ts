import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";

// Server-only Firebase access. The Realtime Database rules deny all client access, so the Next.js server
// authenticates with either a Database Secret (FIREBASE_DATABASE_SECRET) or a service account
// (OAuth2 JWT bearer grant). Credentials live only in .env.local on the server and never reach the browser.

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPES = "https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email";
let cached: { token: string; expiresAt: number; keyPath: string } | null = null;

const base64url = (value: string | Buffer) => Buffer.from(value).toString("base64url");

/** Query parameter that authenticates one REST call: a legacy Database Secret, or a service-account OAuth2 token. */
export async function firebaseAuthParam(): Promise<[name: "auth" | "access_token", value: string]> {
  const secret = process.env.FIREBASE_DATABASE_SECRET;
  if (secret) return ["auth", secret];
  return ["access_token", await firebaseAccessToken()];
}

export async function firebaseAccessToken(): Promise<string> {
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!keyPath) throw new Error("Firebase server credentials are not set. Firebase rules deny unauthenticated access; set FIREBASE_DATABASE_SECRET or FIREBASE_SERVICE_ACCOUNT_PATH in .env.local.");
  if (cached && cached.keyPath === keyPath && cached.expiresAt - 60_000 > Date.now()) return cached.token;
  let account: { client_email?: unknown; private_key?: unknown };
  try { account = JSON.parse(await readFile(keyPath, "utf8")); }
  catch { throw new Error("Firebase service account key could not be read."); }
  if (typeof account.client_email !== "string" || typeof account.private_key !== "string") throw new Error("Firebase service account key is missing client_email or private_key.");
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64url(JSON.stringify({ iss: account.client_email, scope: SCOPES, aud: TOKEN_URL, iat: now, exp: now + 3600 }))}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(account.private_key);
  const response = await fetch(TOKEN_URL, {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, cache: "no-store", signal: AbortSignal.timeout(10000),
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${base64url(signature)}` }),
  });
  const payload = await response.json().catch(() => null) as { access_token?: string; expires_in?: number } | null;
  if (!response.ok || !payload?.access_token) throw new Error(`Firebase service account authentication failed (${response.status}).`);
  cached = { token: payload.access_token, expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000, keyPath };
  return cached.token;
}
