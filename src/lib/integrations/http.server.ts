import { assertSameSiteRequest, CrossSiteRequestError } from "@/lib/auth/isolation.server";
import { requireUserId, UnauthorizedError } from "@/lib/auth/verify.server";
import { env } from "@/lib/env.server";
import { ensureDbReady, getSql } from "@/lib/db";
import { encryptionSecret } from "./crypto.server.ts";
import { IntegrationError, type Ctx } from "./service.server.ts";

const NO_STORE = { "Cache-Control": "no-store" };

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: NO_STORE });
}

/** The signed-in user, from the session cookie (or the preview's bearer token). Throws 401/403 otherwise. */
export async function requireUser(request: Request): Promise<string> {
  assertSameSiteRequest();
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || undefined;
  return requireUserId(bearer);
}

export async function makeCtx(): Promise<Ctx> {
  await ensureDbReady();
  return { sql: await getSql(), read: env, secret: encryptionSecret(env) };
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
    if (error instanceof IntegrationError) return json({ error: error.message }, error.status);
    console.error("[integrations]", error instanceof Error ? error.message : error);
    return json({ error: error instanceof Error ? error.message : "Something went wrong." }, 500);
  }
}

export async function readBody<T extends Record<string, unknown>>(request: Request): Promise<Partial<T>> {
  return ((await request.json().catch(() => ({}))) || {}) as Partial<T>;
}
