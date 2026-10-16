/**
 * One OAuth flow for every card, copied from the Dropbox connector:
 * the app starts the login, one callback finishes it, and the token is
 * checked against the provider before anything is marked connected.
 */
import type { ProviderId } from "./providers.ts";
import { credsFor, type EnvReader } from "./oauth.server.ts";

type Identity = { url: string; method?: "GET" | "POST"; headers?: Record<string, string> };

type Spec = {
  id: Exclude<ProviderId, "nylas">;
  envId: string[];
  envSecret: string[];
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string | ((account: string) => string);
  scopeSep?: string;
  pkce?: boolean;
  publicClient?: boolean;
  tokenAuth?: "body" | "basic" | "basic-json";
  extra?: (account: string) => Record<string, string>;
  identity: Identity;
};

const GMAIL = "chrisgr33ninc@gmail.com";
const WORK = "chris@ceogps.com";

function googleScopes(account: string) {
  if (account === WORK) {
    return "openid email profile https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly";
  }
  return "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.readonly";
}

const SPECS: Spec[] = [
  {
    id: "google",
    envId: ["GOOGLE_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_ID"],
    envSecret: ["GOOGLE_CLIENT_SECRET", "GOOGLE_OAUTH_CLIENT_SECRET"],
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: googleScopes,
    pkce: true,
    extra: (account) => ({
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      login_hint: account || GMAIL,
    }),
    identity: { url: "https://openidconnect.googleapis.com/v1/userinfo" },
  },
  {
    id: "microsoft",
    envId: ["MICROSOFT_CLIENT_ID"],
    envSecret: ["MICROSOFT_CLIENT_SECRET"],
    authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scopes: "openid email profile offline_access User.Read Mail.ReadWrite Calendars.ReadWrite",
    pkce: true,
    identity: { url: "https://graph.microsoft.com/v1.0/me" },
  },
  {
    id: "github",
    envId: ["GITHUB_CLIENT_ID"],
    envSecret: ["GITHUB_CLIENT_SECRET"],
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scopes: "read:user user:email repo",
    extra: () => ({ prompt: "select_account" }),
    identity: { url: "https://api.github.com/user", headers: { "User-Agent": "LifeOS", Accept: "application/vnd.github+json" } },
  },
  {
    id: "slack",
    envId: ["SLACK_CLIENT_ID"],
    envSecret: ["SLACK_CLIENT_SECRET"],
    authorizeUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    scopes: "channels:read chat:write users:read users:read.email",
    scopeSep: ",",
    identity: { url: "https://slack.com/api/auth.test", method: "POST" },
  },
  {
    id: "notion",
    envId: ["NOTION_CLIENT_ID"],
    envSecret: ["NOTION_CLIENT_SECRET"],
    authorizeUrl: "https://api.notion.com/v1/oauth/authorize",
    tokenUrl: "https://api.notion.com/v1/oauth/token",
    scopes: "",
    tokenAuth: "basic-json",
    extra: () => ({ owner: "user" }),
    identity: { url: "https://api.notion.com/v1/users/me", headers: { "Notion-Version": "2022-06-28" } },
  },
  {
    id: "discord",
    envId: ["DISCORD_CLIENT_ID"],
    envSecret: ["DISCORD_CLIENT_SECRET"],
    authorizeUrl: "https://discord.com/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    scopes: "identify email guilds connections",
    identity: { url: "https://discord.com/api/users/@me" },
  },
  {
    id: "spotify",
    envId: ["SPOTIFY_CLIENT_ID"],
    envSecret: ["SPOTIFY_CLIENT_SECRET"],
    authorizeUrl: "https://accounts.spotify.com/authorize",
    tokenUrl: "https://accounts.spotify.com/api/token",
    scopes: "user-read-email user-read-private playlist-read-private user-library-read user-read-recently-played user-top-read",
    tokenAuth: "basic",
    identity: { url: "https://api.spotify.com/v1/me" },
  },
  {
    id: "facebook",
    envId: ["FACEBOOK_CLIENT_ID", "META_CLIENT_ID"],
    envSecret: ["FACEBOOK_CLIENT_SECRET", "META_CLIENT_SECRET"],
    authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    scopes: "public_profile email pages_show_list",
    scopeSep: ",",
    identity: { url: "https://graph.facebook.com/v21.0/me?fields=id,name,email" },
  },
  {
    id: "linkedin",
    envId: ["LINKEDIN_CLIENT_ID"],
    envSecret: ["LINKEDIN_CLIENT_SECRET"],
    authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scopes: "openid profile email w_member_social",
    identity: { url: "https://api.linkedin.com/v2/userinfo" },
  },
  {
    id: "twitter",
    envId: ["TWITTER_CLIENT_ID", "X_CLIENT_ID"],
    envSecret: ["TWITTER_CLIENT_SECRET", "X_CLIENT_SECRET"],
    authorizeUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    scopes: "tweet.read tweet.write users.read offline.access",
    pkce: true,
    publicClient: true,
    tokenAuth: "basic",
    identity: { url: "https://api.twitter.com/2/users/me" },
  },
];

const BY_ID = new Map(SPECS.map((spec) => [spec.id, spec]));

export function oauthSpec(id: string) {
  return BY_ID.get(id as Spec["id"]);
}

export function oauthCallbackUri(origin: string) {
  return `${origin.replace(/\/$/, "")}/api/oauth/callback`;
}

/** Credentials from the server env, including any id and secret saved on the card. */
export function oauthCreds(spec: Spec, read: EnvReader) {
  return credsFor(spec.id, read);
}

export function oauthMissing(spec: Spec, creds: { clientId: string; clientSecret: string }) {
  const missing: string[] = [];
  if (!creds.clientId) missing.push(spec.envId[0]);
  if (!spec.publicClient && !creds.clientSecret) missing.push(spec.envSecret[0]);
  return missing;
}

function b64url(bytes: Uint8Array) {
  let text = "";
  bytes.forEach((byte) => { text += String.fromCharCode(byte); });
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function oauthState() {
  return b64url(crypto.getRandomValues(new Uint8Array(24)));
}

export async function oauthVerifier() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return { verifier, challenge: b64url(new Uint8Array(digest)) };
}

export function oauthAuthorizeUrl(spec: Spec, input: { clientId: string; redirectUri: string; state: string; account: string; challenge?: string }) {
  const url = new URL(spec.authorizeUrl);
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", input.state);
  const scopes = typeof spec.scopes === "function" ? spec.scopes(input.account) : spec.scopes;
  if (scopes.trim()) url.searchParams.set("scope", spec.scopeSep ? scopes.split(" ").join(spec.scopeSep) : scopes);
  if (spec.pkce && input.challenge) {
    url.searchParams.set("code_challenge", input.challenge);
    url.searchParams.set("code_challenge_method", "S256");
  }
  for (const [name, value] of Object.entries(spec.extra?.(input.account) || {})) url.searchParams.set(name, value);
  return url.toString();
}

/** Google's auth code can contain a plus. URLSearchParams would turn that into a space. */
export function rawParam(search: string, name: string) {
  const query = search.replace(/^\?/, "");
  for (const part of query.split("&")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    let key = "";
    try { key = decodeURIComponent(part.slice(0, eq)); } catch { continue; }
    if (key !== name) continue;
    try { return decodeURIComponent(part.slice(eq + 1).replace(/\+/g, "%2B")); } catch { return ""; }
  }
  return "";
}

const ATTEMPT_COOKIE = "lifeos_oauth";

function allowedRedirect(value: string) {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && url.pathname === "/api/oauth/callback";
  } catch {
    return false;
  }
}

/** Remembers the exact redirect sent to the provider, so the exchange uses the same one. */
export function oauthAttemptCookie(redirectUri: string, sid: string, secure: boolean) {
  const value = encodeURIComponent(JSON.stringify({ ru: redirectUri, sid: sid.slice(0, 80) }));
  return `${ATTEMPT_COOKIE}=${value}; Path=/api/oauth; HttpOnly; SameSite=Lax; Max-Age=600${secure ? "; Secure" : ""}`;
}

export function clearOauthAttemptCookie(secure: boolean) {
  return `${ATTEMPT_COOKIE}=; Path=/api/oauth; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}

export function readOauthAttempt(header: string | null) {
  const empty = { redirectUri: "", sid: "" };
  if (!header) return empty;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0 || part.slice(0, eq).trim() !== ATTEMPT_COOKIE) continue;
    try {
      const parsed = JSON.parse(decodeURIComponent(part.slice(eq + 1))) as { ru?: unknown; sid?: unknown };
      const redirectUri = typeof parsed.ru === "string" && allowedRedirect(parsed.ru) ? parsed.ru : "";
      const sid = typeof parsed.sid === "string" ? parsed.sid.slice(0, 80) : "";
      return { redirectUri, sid };
    } catch {
      return empty;
    }
  }
  return empty;
}

function tokenError(body: Record<string, unknown>, status: number) {
  const nested = body.error && typeof body.error === "object" ? String((body.error as Record<string, unknown>).message || "") : "";
  const message = String(body.error_description || nested || body.message || (typeof body.error === "string" ? body.error : "") || "");
  return message ? `${message} (HTTP ${status})` : `The provider refused the code (HTTP ${status}).`;
}

export async function oauthExchange(spec: Spec, creds: { clientId: string; clientSecret: string }, input: { code: string; redirectUri: string; verifier?: string | null }) {
  const params: Record<string, string> = { grant_type: "authorization_code", code: input.code, redirect_uri: input.redirectUri };
  if (spec.pkce && input.verifier) params.code_verifier = input.verifier;
  const headers: Record<string, string> = { Accept: "application/json" };
  let body = "";
  const basic = (spec.tokenAuth === "basic" || spec.tokenAuth === "basic-json") && Boolean(creds.clientSecret);
  if (spec.tokenAuth === "basic-json" && basic) {
    headers["Content-Type"] = "application/json";
    headers.Authorization = `Basic ${btoa(`${creds.clientId}:${creds.clientSecret}`)}`;
    body = JSON.stringify(params);
  } else if (spec.tokenAuth === "basic" && basic) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    headers.Authorization = `Basic ${btoa(`${creds.clientId}:${creds.clientSecret}`)}`;
    const form = new URLSearchParams(params);
    if (spec.publicClient) form.set("client_id", creds.clientId);
    body = form.toString();
  } else {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    const form = new URLSearchParams({ ...params, client_id: creds.clientId });
    if (creds.clientSecret) form.set("client_secret", creds.clientSecret);
    body = form.toString();
  }
  const response = await fetch(spec.tokenUrl, { method: "POST", headers, body, signal: AbortSignal.timeout(15000) });
  const raw = await response.text();
  let parsed: Record<string, unknown> = {};
  try { parsed = raw ? JSON.parse(raw) as Record<string, unknown> : {}; } catch { parsed = Object.fromEntries(new URLSearchParams(raw)); }
  if (!response.ok || parsed.ok === false) return { ok: false as const, text: tokenError(parsed, response.status) };
  const accessToken = String(parsed.access_token || "");
  if (!accessToken) return { ok: false as const, text: "The provider accepted the login but returned no access token." };
  const seconds = Number(parsed.expires_in || 0);
  return {
    ok: true as const,
    accessToken,
    refreshToken: String(parsed.refresh_token || "") || null,
    expiresAt: seconds > 0 ? new Date(Date.now() + seconds * 1000) : null,
    scopes: String(parsed.scope || (typeof spec.scopes === "function" ? spec.scopes("") : spec.scopes)),
    raw: parsed,
  };
}
