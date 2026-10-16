import { integrationsApi } from "@/lib/integrations/client";
import { isProviderId, providerMeta, type ProviderId } from "@/lib/integrations/providers";
import { ANON, SUPABASE } from "./supabase-public";

export { ANON, SUPABASE };

/**
 * Thin compatibility layer so the desks that already import from here keep working.
 * Connections now live on the server (/api/integrations); this file only caches who is linked
 * and hands out short-lived access tokens on request.
 */
const STORE = "lifeos.oauth";
const SESSION = "sb-mhvcdstgkyplhzjptgfr-auth-token";

export const GMAIL_ACCOUNT = "chrisgr33ninc@gmail.com";
export const BOARD_EMAILS = ["chris@ceogps.com", "chrisgr33ninc@gmail.com", "cagednreality@icloud.com"] as const;

export function allowedEmail(email: string) {
  return BOARD_EMAILS.includes(email.trim().toLowerCase() as (typeof BOARD_EMAILS)[number]);
}

export type OauthProvider = ProviderId;
/** `token` stays empty on purpose: call `freshToken` when a live token is needed. */
export type OauthSession = { provider: OauthProvider; name: string; email: string; token: string; via?: "server" };

function write(rows: OauthSession[]) {
  try { localStorage.setItem(STORE, JSON.stringify(rows)); } catch { /* the cache is optional */ }
}

/** Called by the Integrations panel after it loads the real list, so other desks know who is linked. */
export function rememberAccounts(rows: { provider: OauthProvider; email: string; primary?: boolean }[]) {
  // Primary accounts first, so desks that take the first match for a service get the right one.
  const ordered = [...rows].sort((a, b) => Number(Boolean(b.primary)) - Number(Boolean(a.primary)));
  write(ordered.map((row) => ({ provider: row.provider, name: providerMeta(row.provider).name, email: row.email, token: "", via: "server" as const })));
}

export function readOauth(): OauthSession[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE) || "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row): row is OauthSession => Boolean(row) && typeof row === "object" && isProviderId((row as OauthSession).provider))
      .map((row) => ({ provider: row.provider, name: row.name || providerMeta(row.provider).name, email: row.email || "", token: "", via: "server" as const }));
  } catch {
    return [];
  }
}

type StoredSession = { access_token?: string; refresh_token?: string; expires_at?: number; user?: unknown; currentSession?: { access_token?: string } };

/** A Supabase access token, refreshed when it is about to expire. Empty when signed out. */
export async function getSessionToken(): Promise<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(SESSION) || "{}") as StoredSession;
    const access = raw.access_token || raw.currentSession?.access_token || "";
    if (!access) return "";
    const expiresAt = raw.expires_at || 0;
    if (!expiresAt || expiresAt * 1000 - Date.now() > 60_000) return access;
    if (!raw.refresh_token) return "";
    const response = await fetch(`${SUPABASE}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: raw.refresh_token }),
    });
    const body = await response.json().catch(() => ({})) as { access_token?: string; refresh_token?: string; expires_at?: number; expires_in?: number; user?: unknown };
    if (!response.ok || !body.access_token) {
      if (response.status === 400 || response.status === 401) localStorage.removeItem(SESSION);
      return "";
    }
    localStorage.setItem(SESSION, JSON.stringify({
      access_token: body.access_token,
      refresh_token: body.refresh_token || raw.refresh_token,
      expires_at: body.expires_at || Math.floor(Date.now() / 1000) + (body.expires_in || 3600),
      user: body.user || raw.user || null,
    }));
    return body.access_token;
  } catch {
    return "";
  }
}

export function sessionToken() {
  return getSessionToken();
}

export async function sessionAuthHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const token = await getSessionToken();
  return { ...(extra || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

/** Asks the server who is linked and refreshes the local cache. Falls back to the cache when offline or signed out. */
export async function pullWorkerLinks(): Promise<OauthSession[]> {
  try {
    const payload = await integrationsApi.list();
    const rows = [...payload.accounts]
      .filter((row) => row.status === "ok")
      .sort((a, b) => Number(b.primary) - Number(a.primary))
      .map((row) => ({ provider: row.provider, name: providerMeta(row.provider).name, email: row.email, token: "", via: "server" as const }));
    write(rows);
    return rows;
  } catch {
    return readOauth();
  }
}

export function disconnectOauth(provider: OauthProvider, email?: string) {
  write(readOauth().filter((row) => row.provider !== provider || (email ? row.email !== email : false)));
}

const WORKER = "https://lifeos1-api.ceogps.workers.dev";

/** The API worker already has every app id and secret. Connect goes there. */
export function workerConnectUrl(provider: string, origin: string, email?: string) {
  const url = new URL(`${WORKER}/api/oauth/start`);
  url.searchParams.set("provider", provider);
  url.searchParams.set("board", "1");
  url.searchParams.set("origin", origin);
  if (email) url.searchParams.set("account_email", email);
  return url.toString();
}

export async function workerLinked(): Promise<{ provider: OauthProvider; email: string }[]> {
  const response = await fetch(`${WORKER}/api/oauth/linked?board=1`, { headers: { "X-Lifeos-Board": "1" } });
  const body = await response.json().catch(() => ({ accounts: [] })) as { accounts?: { provider?: string; email?: string }[] };
  if (!response.ok || !Array.isArray(body.accounts)) return [];
  return body.accounts
    .filter((row) => isProviderId(row.provider))
    .map((row) => ({ provider: row.provider as OauthProvider, email: row.email || "" }));
}

export async function startOAuth(provider: OauthProvider, email?: string) {
  if (provider === "nylas") {
    const { url } = await integrationsApi.start(provider, email, !email);
    window.location.assign(url);
    return;
  }
  window.location.assign(workerConnectUrl(provider, window.location.origin, email));
}

type Back = { provider: OauthProvider | ""; error: string; account: string };
let returned: Back | null = null;

/** Reads `?connected=` / `?integration_error=` once, strips them from the address bar and remembers the answer. */
export function catchReturn(): Back {
  if (returned) return returned;
  const url = new URL(window.location.href);
  const connected = url.searchParams.get("connected") || url.searchParams.get("oauth_success") || "";
  const error = url.searchParams.get("integration_error") || url.searchParams.get("oauth_error") || "";
  returned = { provider: isProviderId(connected) ? connected : "", error, account: url.searchParams.get("account") || "" };
  if (connected || error) {
    url.searchParams.delete("connected");
    url.searchParams.delete("oauth_success");
    url.searchParams.delete("account");
    url.searchParams.delete("integration_error");
    url.searchParams.delete("oauth_error");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }
  return returned;
}

export async function finishOAuth(): Promise<OauthSession | null> {
  return null;
}

/** A live access token for a connected account. The server renews it first when it is about to expire. Empty when not connected. */
export async function freshToken(provider: OauthProvider, email?: string): Promise<string> {
  try {
    const token = (await integrationsApi.token(provider, email || "")).access_token;
    if (token) return token;
  } catch { /* the board login stores tokens on the API worker */ }
  try {
    const response = await fetch(`${WORKER}/api/oauth/token/fresh?board=1`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Lifeos-Board": "1" },
      body: JSON.stringify({ provider, email: email || "" }),
    });
    const body = await response.json().catch(() => ({})) as { access_token?: string };
    return body.access_token || "";
  } catch {
    return "";
  }
}

export async function freshGoogleToken(email?: string) {
  return freshToken("google", email);
}
