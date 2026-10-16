import worker from "../attachments/working-worker.js";

function allowedOrigins(env: WorkerEnv) {
  const raw = String(env.CORS_ORIGINS || "https://lifeos.ceogps.com,https://lifeos1.ceogps.com");
  return new Set(raw.split(",").map((item) => item.trim()).filter(Boolean));
}

type WorkerEnv = Record<string, unknown>;
type WorkerExport = {
  fetch: (request: Request, env: WorkerEnv, ctx: ExecutionContext) => Promise<Response> | Response;
};

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const allowed = allowedOrigins(env);
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
