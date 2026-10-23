import type { ProviderId } from "./providers.ts";
import { nylasBase, nylasProviderFor } from "./nylas.server.ts";

/**
 * Server-side OAuth for every one-click provider. Pure functions with an injectable
 * `fetch` and env reader so each step can be unit-tested without the network.
 */
export type Fetch = typeof fetch;
export type EnvReader = (name: string) => string | undefined;

export type TokenSet = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scope: string;
  raw: Record<string, unknown>;
};

export type Identity = { id: string; email: string; name: string };
export type Health = { ok: boolean; text: string };

type ProviderConfig = {
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  scopeSep: " " | ",";
  scopeParam?: string;
  authExtra?: Record<string, string>;
  pkce?: boolean;
  basicAuth?: boolean;
  jsonToken?: boolean;
  /** Provider URLs that depend on server settings (Nylas has US and EU hosts). */
  urls?: (read: EnvReader) => { auth: string; token: string };
  identity: (token: string, raw: Record<string, unknown>, f: Fetch) => Promise<Identity>;
  health: (token: string, f: Fetch) => Promise<Health>;
  /** Optional upgrade after the first exchange (Facebook long-lived tokens). */
  upgrade?: (set: TokenSet, creds: Creds, f: Fetch) => Promise<TokenSet>;
};

type Creds = { clientId: string; clientSecret: string };

const UA = "CEOLife-Integrations";

async function getJson(f: Fetch, url: string, headers: Record<string, string> = {}) {
  const response = await f(url, { headers: { Accept: "application/json", "User-Agent": UA, ...headers }, signal: AbortSignal.timeout(10000) });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: response.ok, status: response.status, body };
}

/** Turns a raw network failure into something a person can act on. */
function netError(id: string, error: unknown) {
  const text = error instanceof Error ? error.message : "";
  if (/timeout|aborted/i.test(text)) return new Error(`${id} did not answer in time. Try again in a moment.`);
  return new Error(`Could not reach ${id}${text ? ` (${text})` : ""}. Check the connection and try again.`);
}

function str(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}
function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}
function reason(body: Record<string, unknown>, status: number) {
  const err = body.error;
  const nested = err && typeof err === "object" ? str((err as Record<string, unknown>).message) : "";
  return nested || str(body.error_description) || (typeof err === "string" ? err : "") || str(body.message) || `HTTP ${status}`;
}

export const PROVIDER_CONFIG: Record<ProviderId, ProviderConfig> = {
  google: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "openid", "email", "profile",
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/webmasters.readonly",
      "https://www.googleapis.com/auth/analytics.readonly",
    ],
    scopeSep: " ",
    authExtra: { access_type: "offline", prompt: "consent select_account", include_granted_scopes: "true" },
    identity: async (token, _raw, f) => {
      const r = await getJson(f, "https://www.googleapis.com/oauth2/v3/userinfo", bearer(token));
      if (!r.ok) throw new Error(`Google would not identify this login: ${reason(r.body, r.status)}`);
      return { id: str(r.body.sub), email: str(r.body.email).toLowerCase(), name: str(r.body.name) };
    },
    health: async (token, f) => {
      const who = await getJson(f, "https://www.googleapis.com/oauth2/v3/userinfo", bearer(token));
      if (!who.ok) return { ok: false, text: `Google refused the token: ${reason(who.body, who.status)}` };
      const mail = await getJson(f, "https://gmail.googleapis.com/gmail/v1/users/me/profile", bearer(token));
      if (mail.ok) return { ok: true, text: `Gmail reachable · ${str(mail.body.messagesTotal)} messages` };
      return { ok: true, text: `Signed in as ${str(who.body.email)}. Gmail access was not granted (${reason(mail.body, mail.status)}).` };
    },
  },
  microsoft: {
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scopes: ["openid", "email", "profile", "offline_access", "User.Read", "Mail.ReadWrite", "Calendars.ReadWrite"],
    scopeSep: " ",
    authExtra: { prompt: "select_account" },
    identity: async (token, _raw, f) => {
      const r = await getJson(f, "https://graph.microsoft.com/v1.0/me", bearer(token));
      if (!r.ok) throw new Error(`Microsoft would not identify this login: ${reason(r.body, r.status)}`);
      return { id: str(r.body.id), email: (str(r.body.mail) || str(r.body.userPrincipalName)).toLowerCase(), name: str(r.body.displayName) };
    },
    health: async (token, f) => {
      const r = await getJson(f, "https://graph.microsoft.com/v1.0/me/mailFolders/inbox?$select=totalItemCount", bearer(token));
      return r.ok ? { ok: true, text: `Outlook reachable · ${str(r.body.totalItemCount)} messages in Inbox` } : { ok: false, text: `Microsoft refused the token: ${reason(r.body, r.status)}` };
    },
  },
  github: {
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scopes: ["read:user", "user:email", "repo"],
    scopeSep: " ",
    // Always show GitHub's account picker so the person chooses which login to link.
    authExtra: { prompt: "select_account" },
    identity: async (token, _raw, f) => {
      const h = { ...bearer(token), "X-GitHub-Api-Version": "2022-11-28" };
      const r = await getJson(f, "https://api.github.com/user", h);
      if (!r.ok) throw new Error(`GitHub would not identify this login: ${reason(r.body, r.status)}`);
      let email = str(r.body.email).toLowerCase();
      if (!email) {
        const list = await f("https://api.github.com/user/emails", { headers: { Accept: "application/json", "User-Agent": UA, ...h }, signal: AbortSignal.timeout(10000) }).then((x) => x.json()).catch(() => []) as { email?: string; primary?: boolean }[];
        email = (Array.isArray(list) ? list.find((row) => row.primary)?.email || "" : "").toLowerCase();
      }
      return { id: str(r.body.id), email, name: str(r.body.name) || str(r.body.login) };
    },
    health: async (token, f) => {
      const r = await getJson(f, "https://api.github.com/user", { ...bearer(token), "X-GitHub-Api-Version": "2022-11-28" });
      return r.ok ? { ok: true, text: `Signed in as ${str(r.body.login)}` } : { ok: false, text: `GitHub refused the token: ${reason(r.body, r.status)}` };
    },
  },
  slack: {
    authUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    scopes: ["channels:read", "chat:write", "users:read", "users:read.email"],
    scopeSep: ",",
    identity: async (token, raw, f) => {
      const r = await f("https://slack.com/api/auth.test", { method: "POST", headers: { ...bearer(token), "User-Agent": UA }, signal: AbortSignal.timeout(10000) });
      const body = (await r.json().catch(() => ({}))) as Record<string, unknown>;
      if (body.ok !== true) throw new Error(`Slack would not identify this login: ${str(body.error) || `HTTP ${r.status}`}`);
      const team = raw.team && typeof raw.team === "object" ? (raw.team as Record<string, unknown>) : {};
      return { id: str(body.team_id) || str(team.id), email: "", name: str(body.team) || str(team.name) };
    },
    health: async (token, f) => {
      const r = await f("https://slack.com/api/auth.test", { method: "POST", headers: { ...bearer(token), "User-Agent": UA }, signal: AbortSignal.timeout(10000) });
      const body = (await r.json().catch(() => ({}))) as Record<string, unknown>;
      return body.ok === true ? { ok: true, text: `Workspace ${str(body.team)} · bot ${str(body.user)}` } : { ok: false, text: `Slack refused the token: ${str(body.error) || `HTTP ${r.status}`}` };
    },
  },
  notion: {
    authUrl: "https://api.notion.com/v1/oauth/authorize",
    tokenUrl: "https://api.notion.com/v1/oauth/token",
    scopes: [],
    scopeSep: " ",
    authExtra: { owner: "user" },
    basicAuth: true,
    jsonToken: true,
    identity: async (_token, raw) => {
      const owner = raw.owner && typeof raw.owner === "object" ? (raw.owner as { user?: { person?: { email?: string } } }).user : undefined;
      return { id: str(raw.workspace_id) || str(raw.bot_id), email: str(owner?.person?.email).toLowerCase(), name: str(raw.workspace_name) };
    },
    health: async (token, f) => {
      const r = await getJson(f, "https://api.notion.com/v1/users/me", { ...bearer(token), "Notion-Version": "2022-06-28" });
      return r.ok ? { ok: true, text: `Workspace reachable · ${str(r.body.name) || "bot user"}` } : { ok: false, text: `Notion refused the token: ${reason(r.body, r.status)}` };
    },
  },
  spotify: {
    authUrl: "https://accounts.spotify.com/authorize",
    tokenUrl: "https://accounts.spotify.com/api/token",
    scopes: ["user-read-email", "user-read-private", "playlist-read-private", "user-library-read", "user-read-recently-played", "user-top-read"],
    scopeSep: " ",
    authExtra: { show_dialog: "true" },
    basicAuth: true,
    identity: async (token, _raw, f) => {
      const r = await getJson(f, "https://api.spotify.com/v1/me", bearer(token));
      if (!r.ok) throw new Error(`Spotify would not identify this login: ${reason(r.body, r.status)}`);
      return { id: str(r.body.id), email: str(r.body.email).toLowerCase(), name: str(r.body.display_name) };
    },
    health: async (token, f) => {
      const r = await getJson(f, "https://api.spotify.com/v1/me", bearer(token));
      return r.ok ? { ok: true, text: `Signed in as ${str(r.body.display_name) || str(r.body.id)}` } : { ok: false, text: `Spotify refused the token: ${reason(r.body, r.status)}` };
    },
  },
  discord: {
    authUrl: "https://discord.com/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    scopes: ["identify", "email", "guilds", "connections"],
    scopeSep: " ",
    authExtra: { prompt: "consent" },
    identity: async (token, _raw, f) => {
      const r = await getJson(f, "https://discord.com/api/users/@me", bearer(token));
      if (!r.ok) throw new Error(`Discord would not identify this login: ${reason(r.body, r.status)}`);
      return { id: str(r.body.id), email: str(r.body.email).toLowerCase(), name: str(r.body.global_name) || str(r.body.username) };
    },
    health: async (token, f) => {
      const r = await getJson(f, "https://discord.com/api/users/@me", bearer(token));
      return r.ok ? { ok: true, text: `Signed in as ${str(r.body.global_name) || str(r.body.username)}` } : { ok: false, text: `Discord refused the token: ${reason(r.body, r.status)}` };
    },
  },
  facebook: {
    authUrl: "https://www.facebook.com/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/oauth/access_token",
    scopes: ["public_profile", "email", "pages_show_list"],
    scopeSep: ",",
    identity: async (token, _raw, f) => {
      const r = await getJson(f, `https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(token)}`);
      if (!r.ok) throw new Error(`Facebook would not identify this login: ${reason(r.body, r.status)}`);
      return { id: str(r.body.id), email: str(r.body.email).toLowerCase(), name: str(r.body.name) };
    },
    health: async (token, f) => {
      const response = await f("https://lifeos1-oauth.ceogps.workers.dev/api/oauth/facebook/check?board=1", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "X-Lifeos-Board": "1" },
        body: JSON.stringify({ access_token: token }),
        signal: AbortSignal.timeout(10000),
      });
      const body = (await response.json().catch(() => ({}))) as { ok?: boolean; text?: string };
      return body.ok ? { ok: true, text: body.text || "Signed in to Facebook." } : { ok: false, text: body.text || "Facebook refused the token." };
    },
    upgrade: async (set, creds, f) => {
      // Swap the 1-2 hour token for a ~60 day one so the connection survives.
      const url = `https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(creds.clientId)}&client_secret=${encodeURIComponent(creds.clientSecret)}&fb_exchange_token=${encodeURIComponent(set.accessToken)}`;
      const r = await getJson(f, url);
      if (!r.ok || !r.body.access_token) return set;
      const seconds = Number(r.body.expires_in);
      return { ...set, accessToken: str(r.body.access_token), expiresAt: seconds > 0 ? new Date(Date.now() + seconds * 1000) : set.expiresAt };
    },
  },
  linkedin: {
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scopes: ["openid", "profile", "email", "w_member_social"],
    scopeSep: " ",
    identity: async (token, _raw, f) => {
      const r = await getJson(f, "https://api.linkedin.com/v2/userinfo", bearer(token));
      if (!r.ok) throw new Error(`LinkedIn would not identify this login: ${reason(r.body, r.status)}`);
      return { id: str(r.body.sub), email: str(r.body.email).toLowerCase(), name: str(r.body.name) };
    },
    health: async (token, f) => {
      const r = await getJson(f, "https://api.linkedin.com/v2/userinfo", bearer(token));
      return r.ok ? { ok: true, text: `Signed in as ${str(r.body.name)}` } : { ok: false, text: `LinkedIn refused the token: ${reason(r.body, r.status)}` };
    },
  },
  twitter: {
    authUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
    scopeSep: " ",
    pkce: true,
    basicAuth: true,
    identity: async (token, _raw, f) => {
      const r = await getJson(f, "https://api.twitter.com/2/users/me", bearer(token));
      const data = (r.body.data && typeof r.body.data === "object" ? r.body.data : {}) as Record<string, unknown>;
      if (!r.ok || !data.id) throw new Error(`X would not identify this login: ${reason(r.body, r.status)}`);
      return { id: str(data.id), email: "", name: `@${str(data.username)}` };
    },
    health: async (token, f) => {
      const r = await getJson(f, "https://api.twitter.com/2/users/me", bearer(token));
      const data = (r.body.data && typeof r.body.data === "object" ? r.body.data : {}) as Record<string, unknown>;
      return r.ok && data.id ? { ok: true, text: `Signed in as @${str(data.username)}` } : { ok: false, text: `X refused the token: ${reason(r.body, r.status)}` };
    },
  },
  nylas: {
    authUrl: "https://api.us.nylas.com/v3/connect/auth",
    tokenUrl: "https://api.us.nylas.com/v3/connect/token",
    scopes: [],
    scopeSep: " ",
    jsonToken: true,
    urls: (read) => ({ auth: `${nylasBase(read)}/v3/connect/auth`, token: `${nylasBase(read)}/v3/connect/token` }),
    // Nylas creates the mailbox itself and returns its id and address with the token.
    identity: async (_token, raw) => ({ id: str(raw.grant_id), email: str(raw.email).toLowerCase(), name: str(raw.provider) }),
    health: async () => ({ ok: true, text: "Managed by Nylas" }),
  },
};

const CRED_ALIASES: Partial<Record<ProviderId, { id: string[]; secret: string[] }>> = {
  google: { id: ["GOOGLE_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_ID"], secret: ["GOOGLE_CLIENT_SECRET", "GOOGLE_OAUTH_CLIENT_SECRET"] },
  github: { id: ["GITHUB_CLIENT_ID", "GITHUB_OAUTH_CLIENT_ID"], secret: ["GITHUB_CLIENT_SECRET", "GITHUB_OAUTH_CLIENT_SECRET"] },
  notion: { id: ["NOTION_CLIENT_ID", "NOTION_OAUTH_CLIENT_ID"], secret: ["NOTION_CLIENT_SECRET", "NOTION_OAUTH_CLIENT_SECRET"] },
  twitter: { id: ["TWITTER_CLIENT_ID", "X_CLIENT_ID"], secret: ["TWITTER_CLIENT_SECRET", "X_CLIENT_SECRET"] },
  facebook: { id: ["FACEBOOK_CLIENT_ID", "META_CLIENT_ID", "FACEBOOK_APP_ID", "META_APP_ID"], secret: ["FACEBOOK_CLIENT_SECRET", "META_CLIENT_SECRET", "FACEBOOK_APP_SECRET", "META_APP_SECRET"] },
};

export function credNames(id: ProviderId): { id: string[]; secret: string[] } {
  if (id === "nylas") return { id: ["NYLAS_CLIENT_ID"], secret: ["NYLAS_API_KEY", "NYLAS_CLIENT_SECRET"] };
  const alias = CRED_ALIASES[id];
  const key = id.toUpperCase();
  return { id: alias?.id || [`${key}_CLIENT_ID`], secret: alias?.secret || [`${key}_CLIENT_SECRET`] };
}

/** Saved card values fill any name the server env does not already have. */
export function overlayApps(read: EnvReader, apps: { provider: ProviderId; clientId: string; clientSecret: string }[]): EnvReader {
  return (name) => {
    const fromEnv = read(name);
    if (fromEnv) return fromEnv;
    for (const app of apps) {
      const names = credNames(app.provider);
      if (app.clientId && names.id.includes(name)) return app.clientId;
      if (app.clientSecret && names.secret.includes(name)) return app.clientSecret;
    }
    return undefined;
  };
}

function firstSet(read: EnvReader, names: string[]) {
  for (const name of names) {
    const value = read(name);
    if (value) return value;
  }
  return "";
}

export function credsFor(id: ProviderId, read: EnvReader): Creds {
  if (id === "nylas") {
    // The Nylas application id is the client id; the API key is the client secret.
    return { clientId: read("NYLAS_CLIENT_ID") || "", clientSecret: read("NYLAS_API_KEY") || read("NYLAS_CLIENT_SECRET") || "" };
  }
  const alias = CRED_ALIASES[id];
  const key = id.toUpperCase();
  return {
    clientId: firstSet(read, alias?.id || [`${key}_CLIENT_ID`]),
    clientSecret: firstSet(read, alias?.secret || [`${key}_CLIENT_SECRET`]),
  };
}

function urlsFor(id: ProviderId, read: EnvReader) {
  const cfg = PROVIDER_CONFIG[id];
  return cfg.urls ? cfg.urls(read) : { auth: cfg.authUrl, token: cfg.tokenUrl };
}

export function isConfigured(id: ProviderId, read: EnvReader) {
  const c = credsFor(id, read);
  return Boolean(c.clientId && c.clientSecret);
}

export function redirectUri(origin: string, id: ProviderId) {
  return `${origin.replace(/\/$/, "")}/api/integrations/callback/${id}`;
}

function b64url(bytes: Uint8Array) {
  let text = "";
  bytes.forEach((b) => { text += String.fromCharCode(b); });
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function newState() {
  return b64url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function pkcePair() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return { verifier, challenge: b64url(new Uint8Array(digest)) };
}

export function buildAuthUrl(args: { id: ProviderId; origin: string; state: string; challenge?: string; hintEmail?: string; read: EnvReader }) {
  const cfg = PROVIDER_CONFIG[args.id];
  const creds = credsFor(args.id, args.read);
  if (!creds.clientId || !creds.clientSecret) {
    throw new Error(`${args.id.toUpperCase()}_CLIENT_ID and ${args.id.toUpperCase()}_CLIENT_SECRET are not set on the server.`);
  }
  const params = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: redirectUri(args.origin, args.id),
    response_type: "code",
    state: args.state,
  });
  if (cfg.scopes.length) params.set(cfg.scopeParam || "scope", cfg.scopes.join(cfg.scopeSep));
  for (const [key, value] of Object.entries(cfg.authExtra || {})) params.set(key, value);
  if (cfg.pkce && args.challenge) {
    params.set("code_challenge", args.challenge);
    params.set("code_challenge_method", "S256");
  }
  if (args.hintEmail && (args.id === "google" || args.id === "microsoft" || args.id === "nylas")) params.set("login_hint", args.hintEmail);
  if (args.id === "nylas") {
    const nylasProvider = nylasProviderFor(args.hintEmail || "");
    if (nylasProvider) params.set("provider", nylasProvider);
  }
  return `${urlsFor(args.id, args.read).auth}?${params.toString()}`;
}

function toTokenSet(body: Record<string, unknown>, fallbackScope: string, previousRefresh: string | null): TokenSet {
  const accessToken = str(body.access_token);
  const seconds = Number(body.expires_in);
  return {
    accessToken,
    refreshToken: str(body.refresh_token) || previousRefresh,
    expiresAt: seconds > 0 ? new Date(Date.now() + seconds * 1000) : null,
    scope: str(body.scope) || fallbackScope,
    raw: body,
  };
}

async function tokenRequest(id: ProviderId, fields: Record<string, string>, read: EnvReader, f: Fetch) {
  const cfg = PROVIDER_CONFIG[id];
  const creds = credsFor(id, read);
  if (!creds.clientId || !creds.clientSecret) throw new Error(`${id.toUpperCase()} client credentials are not set on the server.`);
  const headers: Record<string, string> = { Accept: "application/json", "User-Agent": UA };
  let body: string;
  if (cfg.jsonToken) {
    headers["Content-Type"] = "application/json";
    if (!cfg.basicAuth) {
      fields.client_id = creds.clientId;
      fields.client_secret = creds.clientSecret;
    }
    body = JSON.stringify(fields);
  } else {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    const form = new URLSearchParams(fields);
    if (!cfg.basicAuth) {
      form.set("client_id", creds.clientId);
      form.set("client_secret", creds.clientSecret);
    } else if (id === "twitter") {
      form.set("client_id", creds.clientId);
    }
    body = form.toString();
  }
  if (cfg.basicAuth) headers.Authorization = `Basic ${btoa(`${creds.clientId}:${creds.clientSecret}`)}`;
  let response: Response;
  try {
    response = await f(urlsFor(id, read).token, { method: "POST", headers, body, signal: AbortSignal.timeout(15000) });
  } catch (error) {
    throw netError(id, error);
  }
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok || data.ok === false || !data.access_token) {
    throw new Error(`${id} token request failed: ${reason(data, response.status)}`);
  }
  return { data, creds };
}

export async function exchangeCode(args: { id: ProviderId; code: string; origin: string; verifier?: string | null; read: EnvReader; f?: Fetch }): Promise<TokenSet> {
  const f = args.f || fetch;
  const cfg = PROVIDER_CONFIG[args.id];
  const fields: Record<string, string> = {
    grant_type: "authorization_code",
    code: args.code,
    redirect_uri: redirectUri(args.origin, args.id),
  };
  if (cfg.pkce && args.verifier) fields.code_verifier = args.verifier;
  const { data, creds } = await tokenRequest(args.id, fields, args.read, f);
  let set = toTokenSet(data, cfg.scopes.join(" "), null);
  if (cfg.upgrade) set = await cfg.upgrade(set, creds, f).catch(() => set);
  return set;
}

export async function refreshAccess(args: { id: ProviderId; refreshToken: string; read: EnvReader; f?: Fetch }): Promise<TokenSet> {
  const f = args.f || fetch;
  const { data } = await tokenRequest(args.id, { grant_type: "refresh_token", refresh_token: args.refreshToken }, args.read, f);
  return toTokenSet(data, PROVIDER_CONFIG[args.id].scopes.join(" "), args.refreshToken);
}

export async function lookupIdentity(id: ProviderId, set: TokenSet, f: Fetch = fetch): Promise<Identity> {
  const who = await PROVIDER_CONFIG[id].identity(set.accessToken, set.raw, f).catch((error: unknown) => {
    if (error instanceof Error && /would not identify/.test(error.message)) throw error;
    throw netError(id, error);
  });
  if (!who.id) throw new Error(`${id} did not return an account id.`);
  return who;
}

export async function checkToken(id: ProviderId, token: string, f: Fetch = fetch): Promise<Health> {
  try {
    return await PROVIDER_CONFIG[id].health(token, f);
  } catch (error) {
    return { ok: false, text: netError(id, error).message };
  }
}

/** Optional allow-list: INTEGRATIONS_GOOGLE_ALLOWED="a@x.com,b@y.com". Unset or "*" allows any account. */
export function accountAllowed(id: ProviderId, email: string, read: EnvReader) {
  if (id !== "google") return true;
  const raw = (read("INTEGRATIONS_GOOGLE_ALLOWED") || "").trim();
  if (!raw || raw === "*") return true;
  return raw.split(",").map((row) => row.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());
}
