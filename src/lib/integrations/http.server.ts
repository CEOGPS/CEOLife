import { assertSameSiteRequest, CrossSiteRequestError } from "@/lib/auth/isolation.server";
import { UnauthorizedError } from "@/lib/auth/verify.server";
import { verifyAccess } from "@/lib/auth/access.server";
import { env } from "@/lib/env.server";
import { ensureDbReady, getSql } from "@/lib/db";
import { encryptionSecret } from "./crypto.server.ts";
import { overlayApps } from "./oauth.server.ts";
import { listAppCreds } from "./store.server.ts";
import { createLimiter } from "./limit.server.ts";
import { IntegrationError, type Ctx } from "./service.server.ts";

const NO_STORE = { "Cache-Control": "no-store" };

export function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(data, { status, headers: { ...NO_STORE, ...headers } });
}

const limiter = createLimiter();

/** Per-user rate limit. Keeps a runaway loop from hammering the providers behind these endpoints. */
export function throttle(userId: string, bucket: "start" | "test" | "token" | "read" | "write") {
  const rule = { start: [20, 60_000], test: [60, 60_000], token: [300, 60_000], read: [120, 60_000], write: [60, 60_000] }[bucket];
  const verdict = limiter.take(`${bucket}:${userId}`, rule[0], rule[1]);
  if (!verdict.ok) throw new IntegrationError(429, `Too many requests. Try again in ${verdict.retryAfterSeconds} seconds.`);
}

/** This board is one person's. Each card signs into its own service, so the dashboard login is not the account. */
const BOARD_OWNER = "lifeos-owner";

/** The board owner, after the Cloudflare Access login is verified. A dashboard session is ignored so one app login cannot become every card's email. */
export async function requireUser(request: Request): Promise<string> {
  assertSameSiteRequest();
  await verifyAccess(request);
  return env("AI_OWNER_ID") || BOARD_OWNER;
}

export async function makeCtx(): Promise<Ctx> {
  await ensureDbReady();
  const sql = await getSql();
  const secret = encryptionSecret(env);
  const userId = env("AI_OWNER_ID") || BOARD_OWNER;
  let read = env;
  try {
    const apps = await listAppCreds(sql, userId, secret);
    if (apps.length) read = overlayApps(env, apps);
  } catch { /* the apps table is created on the next migrate */ }
  return { sql, read, secret };
}

/** The public origin of this app. Start and callback must agree, so both call this. */
export function appOrigin(request: Request) {
  const configured = env("PUBLIC_APP_URL");
  if (configured) return configured.replace(/\/$/, "");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || new URL(request.url).protocol.replace(":", "");
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

export async function guarded(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof UnauthorizedError) return json({ error: "Sign in to manage integrations." }, 401);
    if (error instanceof CrossSiteRequestError) return json({ error: error.message }, 403);
    if (error instanceof IntegrationError) {
      const wait = error.status === 429 ? error.message.match(/(\d+) seconds/)?.[1] : undefined;
      return json({ error: error.message }, error.status, wait ? { "Retry-After": wait } : {});
    }
    console.error("[integrations]", error instanceof Error ? error.message : error);
    return json({ error: error instanceof Error ? error.message : "Something went wrong." }, 500);
  }
}

export async function readBody<T extends Record<string, unknown>>(request: Request): Promise<Partial<T>> {
  return ((await request.json().catch(() => ({}))) || {}) as Partial<T>;
}
