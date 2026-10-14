/**
 * Who owns an integration connection.
 *
 * The app's own session wins when it exists. When auth is not configured — the
 * live preview, local dev — connections belong to one local owner so the panel
 * is usable without signing in. On a real database with auth enabled this fails
 * closed instead of sharing one owner across every visitor.
 */

import { getRequest } from "@tanstack/react-start/server";
import { getSessionUser } from "@/lib/auth/verify.server";
import { verifyBearer } from "@/lib/lifeos/session-guard.server";

export const LOCAL_OWNER = "local-owner";

export async function sessionOwner(): Promise<string | null> {
  try {
    const user = await getSessionUser();
    if (user?.id) return user.id;
  } catch {
    /* Better Auth is not configured for this request */
  }
  // The dashboard signs in with the board's Supabase session and sends it as a
  // bearer. That identity is verified with Supabase, never taken from the body.
  try {
    const request = getRequest();
    const header = request?.headers.get("authorization") || "";
    const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
    if (!token) return null;
    const board = await verifyBearer(token);
    return board?.id || null;
  } catch {
    return null;
  }
}

export async function resolveOwner(): Promise<string | null> {
  const user = await sessionOwner();
  if (user) return user;
  const realDatabase = Boolean(process.env.DATABASE_URL?.trim());
  const authEnabled = process.env.VITE_AUTH_ENABLED !== "false";
  if (realDatabase && authEnabled) return null;
  return LOCAL_OWNER;
}

/** Owner for routes that must answer even when nobody is signed in. */
export function unauthorized() {
  return Response.json(
    { ok: false, error: "Sign in required" },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}
