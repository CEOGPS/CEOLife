export const SUPABASE = "https://mhvcdstgkyplhzjptgfr.supabase.co";
export const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1odmNkc3Rna3lwbGh6anB0Z2ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MDE3NzYsImV4cCI6MjA5NDI3Nzc3Nn0.DrwY7_a6OyNdKtA5UB62qrWkiaFe9xcAHLqXdfzf8W4";
export const WORKER = "https://lifeos1-api.ceogps.workers.dev";
export const APP_ORIGIN = "https://lifeos.ceogps.com";
const STORE = "lifeos.oauth";
const VERIFIER = "lifeos.pkce";

export const GMAIL_ACCOUNT = "chrisgr33ninc@gmail.com";
export const BOARD_EMAILS = ["chris@ceogps.com", "chrisgr33ninc@gmail.com", "cagednreality@icloud.com"] as const;

export function allowedEmail(email: string) {
  return BOARD_EMAILS.includes(email.trim().toLowerCase() as (typeof BOARD_EMAILS)[number]);
}
export type OauthProvider = "google" | "discord" | "facebook" | "spotify";
export type OauthSession = { provider: OauthProvider; name: string; email: string; token: string; refresh?: string; via?: "worker" };

const CARD: Record<OauthProvider, string> = { google: "Google", discord: "Discord", facebook: "Facebook", spotify: "Spotify" };

function isProvider(value: string): value is OauthProvider {
  return value === "google" || value === "discord" || value === "facebook" || value === "spotify";
}

function b64url(bytes: Uint8Array) {
  let text = "";
  bytes.forEach((byte) => { text += String.fromCharCode(byte); });
  return btoa(text).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function rawOauth(): OauthSession[] {
  try {
    const rows = JSON.parse(localStorage.getItem(STORE) || "[]");
    if (!Array.isArray(rows)) return [];
    const clean = rows.filter((row) => row?.provider && isProvider(row.provider)).map((row: { provider: OauthProvider; name?: string; email?: string }) => ({
      provider: row.provider,
      name: row.name || CARD[row.provider],
      email: row.email || "",
      token: "",
      via: "worker" as const,
    }));
    if (rows.some((row) => row?.token || row?.refresh)) localStorage.setItem(STORE, JSON.stringify(clean));
    return clean;
  } catch {
    return [];
  }
}

export function readOauth(): OauthSession[] {
  return rawOauth().filter((row) => row.token || row.via === "worker");
}

function saveOauth(row: OauthSession) {
  const clean: OauthSession = { provider: row.provider, name: row.name, email: row.email, token: "", via: "worker" };
  const rows = rawOauth().filter((item) => !(item.provider === clean.provider && item.email.toLowerCase() === clean.email.toLowerCase()));
  localStorage.setItem(STORE, JSON.stringify([clean, ...rows]));
}

export function disconnectOauth(provider: OauthProvider, email?: string) {
  const rows = rawOauth().filter((item) => item.provider !== provider || (email && item.email.toLowerCase() !== email.toLowerCase()));
  localStorage.setItem(STORE, JSON.stringify(rows));
}

const SESSION = "sb-mhvcdstgkyplhzjptgfr-auth-token";

function readSessionToken() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SESSION) || "{}") as { access_token?: string; currentSession?: { access_token?: string } };
    return parsed.access_token || parsed.currentSession?.access_token || "";
  } catch {
    return "";
  }
}

export function sessionToken() {
  return readSessionToken();
}

export async function sessionAuthHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const token = await getSessionToken();
  return { ...(extra || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export async function requestSignIn(email: string) {
  const mailbox = email.trim().toLowerCase();
  if (!allowedEmail(mailbox)) throw new Error("Use chris@ceogps.com, chrisgr33ninc@gmail.com, or cagednreality@icloud.com.");
  const response = await fetch(`${SUPABASE}/auth/v1/otp`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: mailbox, create_user: true }),
  });
  const body = await response.json().catch(() => ({})) as { msg?: string; error_description?: string; message?: string };
  if (!response.ok) throw new Error(body.msg || body.error_description || body.message || "Supabase did not send a code.");
}

export async function confirmSignIn(email: string, code: string) {
  const mailbox = email.trim().toLowerCase();
  const response = await fetch(`${SUPABASE}/auth/v1/verify`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "email", email: mailbox, token: code.trim() }),
  });
  const body = await response.json().catch(() => ({})) as { access_token?: string; refresh_token?: string; expires_at?: number; user?: unknown; msg?: string; error_description?: string; message?: string };
  if (!response.ok || !body.access_token) throw new Error(body.msg || body.error_description || body.message || "That code was refused.");
  localStorage.setItem(SESSION, JSON.stringify({
    access_token: body.access_token,
    refresh_token: body.refresh_token || "",
    expires_at: body.expires_at || 0,
    user: body.user || null,
  }));
  return body.access_token;
}

export function signOutSession() {
  localStorage.removeItem(SESSION);
  localStorage.removeItem(STORE);
}

type StoredSession = { access_token?: string; refresh_token?: string; expires_at?: number; user?: unknown; currentSession?: { access_token?: string } };

/** Returns a valid Supabase access token, refreshing it first when it is about to expire. */
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

export function rememberLink(provider: OauthProvider, email?: string, name?: string) {
  const mailbox = (email || "").trim();
  const existing = rawOauth().find((item) => item.provider === provider && item.email.toLowerCase() === mailbox.toLowerCase());
  if (existing?.token) return existing;
  const row: OauthSession = { provider, name: name || CARD[provider], email: mailbox, token: existing?.token || "", via: "worker" };
  saveOauth(row);
  return row;
}

export async function pullWorkerLinks() {
  const token = await getSessionToken();
  if (!token) return readOauth();
  try {
    const response = await fetch(`${WORKER}/api/oauth/status`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return readOauth();
    const body = await response.json() as { accounts?: { provider?: string; email?: string }[]; statuses?: Record<string, { connected?: boolean; email?: string }> };
    const rows: OauthSession[] = [];
    const seen = new Set<string>();
    const add = (provider: string | undefined, email: string) => {
      if (!provider || !isProvider(provider)) return;
      const key = `${provider}:${email.toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      rows.push({ provider, name: CARD[provider], email, token: "", via: "worker" });
    };
    for (const row of body.accounts || []) add(row.provider, row.email || "");
    if (!rows.length) {
      for (const provider of ["google", "discord", "facebook", "spotify"] as const) {
        const status = body.statuses?.[provider];
        if (status?.connected) add(provider, status.email || "");
      }
    }
    // The worker is the source of truth, so the local cache mirrors it exactly.
    localStorage.setItem(STORE, JSON.stringify(rows));
    return rows;
  } catch {
    return readOauth();
  }
}

export function catchReturn(): { provider: OauthProvider | ""; error: string } {
  const params = new URLSearchParams(window.location.search);
  const connected = params.get("connected");
  const error = params.get("oauth_error") || "";
  if (connected && isProvider(connected)) {
    const email = sessionStorage.getItem("lifeos.oauth.mailbox") || "";
    if (email) rememberLink(connected, email, CARD[connected]);
    sessionStorage.removeItem("lifeos.oauth.mailbox");
  }
  if (connected || error) {
    params.delete("connected");
    params.delete("oauth_error");
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
    window.history.replaceState({}, "", next);
  }
  return { provider: connected && isProvider(connected) ? connected : "", error };
}

export async function startOAuth(provider: OauthProvider, email?: string) {
  const origin = window.location.origin || APP_ORIGIN;
  const picked = (email || "").trim().toLowerCase();
  if (picked.endsWith("@icloud.com")) throw new Error("iCloud connects through Nylas, not OAuth.");
  const token = await getSessionToken();
  if (!token) throw new Error("Sign in at the top of Integrations first. Supabase emails you a code.");
  const response = await fetch(`${WORKER}/api/oauth/start`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ provider, origin, account_email: picked }),
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.json().catch(() => ({})) as { url?: string; error?: string };
  if (!response.ok || !body.url) throw new Error(body.error || `${CARD[provider]} did not start.`);
  window.location.assign(body.url);
}

export async function startNylas(email?: string) {
  const origin = window.location.origin || APP_ORIGIN;
  const account = (email || "").trim().toLowerCase();
  if (!account.endsWith("@icloud.com")) throw new Error("Nylas is for the iCloud mailbox.");
  const token = await getSessionToken();
  if (!token) throw new Error("Sign in at the top of Integrations. Supabase emails you a code.");
  sessionStorage.setItem("lifeos.oauth.mailbox", account);
  const response = await fetch(`${WORKER}/api/nylas/connect`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: account, origin }),
  });
  const body = await response.json().catch(() => ({})) as { url?: string; error?: string };
  if (!response.ok || !body.url) throw new Error(body.error || "Nylas did not start.");
  window.location.assign(body.url);
}

export async function finishOAuth(): Promise<OauthSession | null> {
  return null;
}

/** Asks the worker for a live access token. The worker refreshes it with the stored refresh token when needed. */
export async function freshToken(provider: OauthProvider, email?: string) {
  const token = await getSessionToken();
  if (!token) return "";
  try {
    const response = await fetch(`${WORKER}/api/oauth/token/fresh`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ provider, email: email || "" }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return "";
    const body = await response.json() as { access_token?: string };
    return body.access_token || "";
  } catch {
    return "";
  }
}

export async function freshGoogleToken(email?: string) {
  return freshToken("google", email);
}
