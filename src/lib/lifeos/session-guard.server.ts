import { ANON, SUPABASE } from "./oauth";

export type SessionUser = { id: string; email: string | null };

/** Verify the existing Supabase access token. Identity is the auth user, never a header or body field. */
export async function verifyBearer(token: string): Promise<SessionUser | null> {
  const clean = token.trim();
  if (!clean) return null;
  const response = await fetch(`${SUPABASE}/auth/v1/user`, {
    headers: { apikey: ANON, Authorization: `Bearer ${clean}` },
  });
  if (!response.ok) return null;
  const user = await response.json() as { id?: unknown; email?: unknown };
  if (!user || typeof user.id !== "string") return null;
  return { id: user.id, email: typeof user.email === "string" ? user.email : null };
}

export async function requireSession(request: Request): Promise<SessionUser | Response> {
  const header = request.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const user = await verifyBearer(token);
  if (!user) {
    return Response.json({ error: "Sign in required" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  return user;
}
