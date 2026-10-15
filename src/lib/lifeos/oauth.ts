import { integrationsApi } from "@/lib/integrations/client";
import { isProviderId, providerMeta, type ProviderId } from "@/lib/integrations/providers";

/**
 * Thin compatibility layer so the desks that already import from here keep working.
 * Connections now live on the server (/api/integrations); this file only caches who is linked
 * and hands out short-lived access tokens on request.
 */
const STORE = "lifeos.oauth";

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

export async function startOAuth(provider: OauthProvider, email?: string) {
  const { url } = await integrationsApi.start(provider, email, !email);
  window.location.assign(url);
}

type Back = { provider: OauthProvider | ""; error: string; account: string };
let returned: Back | null = null;

/** Reads `?connected=` / `?integration_error=` once, strips them from the address bar and remembers the answer. */
export function catchReturn(): Back {
  if (returned) return returned;
  const url = new URL(window.location.href);
  const connected = url.searchParams.get("connected") || "";
  const error = url.searchParams.get("integration_error") || "";
  returned = { provider: isProviderId(connected) ? connected : "", error, account: url.searchParams.get("account") || "" };
  if (connected || error) {
    url.searchParams.delete("connected");
    url.searchParams.delete("account");
    url.searchParams.delete("integration_error");
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
    return (await integrationsApi.token(provider, email || "")).access_token;
  } catch {
    return "";
  }
}

export async function freshGoogleToken(email?: string) {
  return freshToken("google", email);
}
