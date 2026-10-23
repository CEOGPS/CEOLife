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

function cors(response: Response, request: Request, allowed: Set<string>) {
  const origin = request.headers.get("Origin") || "";
  if (!allowed.has(origin)) return response;
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-User-Id, X-Lifeos-Board");
  headers.set("Vary", "Origin");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
