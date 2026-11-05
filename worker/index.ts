import worker from "../attachments/working-worker.js";
import { handleTruth, probeFeatures, probeGreen } from "./truth";

function allowedOrigins(env: WorkerEnv) {
  const raw = String(env.CORS_ORIGINS || "https://lifeos.ceogps.com,https://lifeos1.ceogps.com");
  return new Set(raw.split(",").map((item) => item.trim()).filter(Boolean));
}

type WorkerEnv = Record<string, unknown> & {
  OAUTH?: { fetch: (request: Request) => Promise<Response> | Response };
};
type WorkerExport = {
  fetch: (request: Request, env: WorkerEnv, ctx: ExecutionContext) => Promise<Response> | Response;
};

const OAUTH_PATHS = new Set([
  "/oauth/callback",
  "/api/oauth/callback",
  "/api/oauth/start",
  "/api/oauth/linked",
  "/api/oauth/status",
  "/api/oauth/token/fresh",
  "/api/oauth/disconnect",
  "/api/oauth/facebook/check",
]);

export default {
  async scheduled(_event: { cron: string }, env: WorkerEnv, ctx: ExecutionContext) {
    ctx.waitUntil(probeGreen(env).then((rows) => {
      console.log(`nightly green probe ${rows.length}`);
    }).catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : "nightly probe failed");
    }));
    if (String(env.FEATURE_PROBE || "") === "1") {
      ctx.waitUntil(probeFeatures(env).then((rows) => {
        console.log(`feature probe ${rows.map((row) => `${row.feature}:${row.ok}`).join(" ")}`);
      }).catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : "feature probe failed");
      }));
    }
  },
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const allowed = allowedOrigins(env);
    const owned = await handleTruth(request, env);
    if (owned) {
      if (url.pathname.startsWith("/api/")) return cors(owned, request, allowed);
      return owned;
    }
    const linkedin = await linkedinWebhook(request, env);
    if (linkedin) return linkedin;
    // Client ids live on lifeos1-oauth. This worker only forwards those paths.
    // The browser still returns to https://lifeos1-api.ceogps.workers.dev/oauth/callback.
    if (OAUTH_PATHS.has(url.pathname) && env.OAUTH) {
      const target = new URL(request.url);
      target.hostname = "oauth.internal";
      if (url.pathname === "/oauth/callback") target.pathname = "/api/oauth/callback";
      const headers = new Headers(request.headers);
      headers.delete("host");
      const init: RequestInit = { method: request.method, headers, redirect: "manual" };
      if (request.method !== "GET" && request.method !== "HEAD") init.body = request.body;
      return env.OAUTH.fetch(new Request(target, init));
    }
    let inbound = request;
    if (url.pathname === "/oauth/callback") {
      const rewritten = new URL(request.url);
      rewritten.pathname = "/api/oauth/callback";
      inbound = new Request(rewritten, request);
    }
    const response = await (worker as WorkerExport).fetch(inbound, env, ctx);
    if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
      return cors(new Response(null, { status: 204 }), request, allowed);
    }
    if (url.pathname.startsWith("/api/")) return cors(response, request, allowed);
    return response;
  },
};

async function hmacHex(secret: string, value: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return [...new Uint8Array(mac)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function sameHex(left: string, right: string) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}

/** LinkedIn calls this with no LifeOS session. GET answers the challenge. POST stores a signed event. */
async function linkedinWebhook(request: Request, env: WorkerEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/api/webhooks/linkedin") return null;
  const secret = String(env.LINKEDIN_CLIENT_SECRET || "");
  if (request.method === "GET") {
    const challengeCode = url.searchParams.get("challengeCode") || "";
    if (!challengeCode) return Response.json({ ok: true });
    if (!secret) return Response.json({ error: "LINKEDIN_CLIENT_SECRET is not set" }, { status: 503 });
    return Response.json({ challengeCode, challengeResponse: await hmacHex(secret, challengeCode) });
  }
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const raw = await request.text();
  let posted = "";
  if (raw) {
    try { posted = String((JSON.parse(raw) as { challengeCode?: string }).challengeCode || ""); } catch { posted = ""; }
  }
  const challengeCode = url.searchParams.get("challengeCode") || posted;
  if (challengeCode) {
    if (!secret) return Response.json({ error: "LINKEDIN_CLIENT_SECRET is not set" }, { status: 503 });
    return Response.json({ challengeCode, challengeResponse: await hmacHex(secret, challengeCode) });
  }
  if (!secret) return Response.json({ error: "LINKEDIN_CLIENT_SECRET is not set" }, { status: 503 });
  const header = (request.headers.get("X-LI-Signature") || "").trim().toLowerCase();
  const expected = await hmacHex(secret, `hmacsha256=${raw}`);
  const hex = header.startsWith("hmacsha256=") ? header.slice("hmacsha256=".length) : header;
  if (!header || (!sameHex(header, expected) && !sameHex(hex, expected))) return new Response("Forbidden", { status: 403 });
  const kv = env.LIFEOS_KV as { get(key: string): Promise<string | null>; put(key: string, value: string): Promise<unknown> } | undefined;
  if (kv) {
    const key = "linkedin:webhook:recent";
    const prev = await kv.get(key);
    let rows: unknown[] = [];
    try { rows = prev ? JSON.parse(prev) : []; } catch { rows = []; }
    if (!Array.isArray(rows)) rows = [];
    rows.unshift({ at: new Date().toISOString(), body: raw.slice(0, 8000) });
    await kv.put(key, JSON.stringify(rows.slice(0, 20)));
  }
  return Response.json({ ok: true });
}

function cors(response: Response, request: Request, allowed: Set<string>) {
  const origin = request.headers.get("Origin") || "";
  if (!allowed.has(origin)) return response;
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-User-Id");
  headers.set("Vary", "Origin");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
