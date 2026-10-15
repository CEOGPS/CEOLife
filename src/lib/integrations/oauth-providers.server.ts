/**
 * The server half of the integrations engine: real OAuth 2.0 providers.
 *
 * One spec per provider drives the whole lifecycle — authorize, token exchange,
 * identity check and refresh — so the app runs the login itself instead of
 * handing the browser to a third-party relay. Client ids and secrets are read
 * from the environment only (`envBag()`), never from source or the client.
 *
 * A provider with no credentials configured is reported as unconfigured; it is
 * never shown as connected.
 */

import { envBag } from "@/lib/lifeos/env-bag.server";

export type OAuthCredentials = { clientId: string; clientSecret: string };

export type IdentitySpec = {
  url: string;
  method?: "GET" | "POST";
  /** Body sent with a POST identity check (form-encoded). */
  form?: Record<string, string>;
  headers?: Record<string, string>;
  /** Human label for the connected account. */
  label: (body: Record<string, unknown>) => string;
};

export type OAuthProvider = {
  id: string;
  name: string;
  docs: string;
  /** Environment names checked, in order, for the client id / secret. */
  env: { id: string[]; secret: string[] };
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string;
  scopeSeparator?: string;
  /** Send PKCE (S256). */
  pkce?: boolean;
  /** Public client: exchange without a secret (PKCE only). */
  publicClient?: boolean;
  /** Some providers call the client id something else (TikTok: client_key). */
  clientIdParam?: string;
  tokenAuth?: "body" | "basic" | "basic-json";
  extraAuthorize?: Record<string, string>;
  identity: IdentitySpec;
  revoke?: { url: string; style: "token-query" | "token-body" };
  /** Refresh is not offered by these providers. */
  noRefresh?: boolean;
};

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export const OAUTH_PROVIDERS: OAuthProvider[] = [
  {
    id: "google",
    name: "Google",
    docs: "https://console.cloud.google.com/apis/credentials",
    env: { id: ["GOOGLE_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_ID"], secret: ["GOOGLE_CLIENT_SECRET", "GOOGLE_OAUTH_CLIENT_SECRET"] },
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/drive.metadata.readonly",
      "https://www.googleapis.com/auth/webmasters.readonly",
      "https://www.googleapis.com/auth/analytics.readonly",
    ].join(" "),
    pkce: true,
    extraAuthorize: { access_type: "offline", prompt: "consent", include_granted_scopes: "true" },
    identity: {
      url: "https://openidconnect.googleapis.com/v1/userinfo",
      label: (body) => text(body.email) || text(body.name) || "Google account",
    },
    revoke: { url: "https://oauth2.googleapis.com/revoke", style: "token-query" },
  },
  {
    id: "microsoft",
    name: "Microsoft",
    docs: "https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade",
    env: { id: ["MICROSOFT_CLIENT_ID", "AZURE_CLIENT_ID"], secret: ["MICROSOFT_CLIENT_SECRET", "AZURE_CLIENT_SECRET"] },
    authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scopes: "openid email profile offline_access User.Read Mail.Read Calendars.Read",
    pkce: true,
    identity: {
      url: "https://graph.microsoft.com/v1.0/me",
      label: (body) => text(body.mail) || text(body.userPrincipalName) || text(body.displayName) || "Microsoft account",
    },
  },
  {
    id: "github",
    name: "GitHub",
    docs: "https://github.com/settings/developers",
    env: { id: ["GITHUB_CLIENT_ID", "GITHUB_OAUTH_CLIENT_ID"], secret: ["GITHUB_CLIENT_SECRET", "GITHUB_OAUTH_CLIENT_SECRET"] },
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scopes: "read:user user:email repo",
    identity: {
      url: "https://api.github.com/user",
      headers: { "User-Agent": "LifeOS", Accept: "application/vnd.github+json" },
      label: (body) => text(body.login) || "GitHub account",
    },
    revoke: { url: "https://api.github.com/applications/{client_id}/token", style: "token-body" },
  },
  {
    id: "gitlab",
    name: "GitLab",
    docs: "https://gitlab.com/-/user_settings/applications",
    env: { id: ["GITLAB_CLIENT_ID"], secret: ["GITLAB_CLIENT_SECRET"] },
    authorizeUrl: "https://gitlab.com/oauth/authorize",
    tokenUrl: "https://gitlab.com/oauth/token",
    scopes: "read_user read_api",
    pkce: true,
    identity: {
      url: "https://gitlab.com/api/v4/user",
      label: (body) => text(body.username) || text(body.name) || "GitLab account",
    },
  },
  {
    id: "slack",
    name: "Slack",
    docs: "https://api.slack.com/apps",
    env: { id: ["SLACK_CLIENT_ID"], secret: ["SLACK_CLIENT_SECRET"] },
    authorizeUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    scopes: "channels:read users:read team:read chat:write",
    scopeSeparator: ",",
    identity: {
      url: "https://slack.com/api/auth.test",
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      label: (body) => text(body.team) && text(body.user) ? `${body.team} · ${body.user}` : text(body.team) || text(body.user) || "Slack workspace",
    },
  },
  {
    id: "notion",
    name: "Notion",
    docs: "https://www.notion.so/my-integrations",
    env: { id: ["NOTION_CLIENT_ID", "NOTION_OAUTH_CLIENT_ID"], secret: ["NOTION_CLIENT_SECRET", "NOTION_OAUTH_CLIENT_SECRET"] },
    authorizeUrl: "https://api.notion.com/v1/oauth/authorize",
    tokenUrl: "https://api.notion.com/v1/oauth/token",
    scopes: "",
    tokenAuth: "basic-json",
    extraAuthorize: { owner: "user" },
    identity: {
      url: "https://api.notion.com/v1/users/me",
      headers: { "Notion-Version": "2022-06-28" },
      label: (body) => {
        const bot = record(body.bot);
        const person = record(body.person);
        const name = text(person.email) || text(body.name);
        return name || (Object.keys(bot).length ? "Notion workspace" : "Notion account");
      },
    },
  },
  {
    id: "discord",
    name: "Discord",
    docs: "https://discord.com/developers/applications",
    env: { id: ["DISCORD_CLIENT_ID"], secret: ["DISCORD_CLIENT_SECRET"] },
    authorizeUrl: "https://discord.com/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    scopes: "identify email guilds",
    identity: {
      url: "https://discord.com/api/users/@me",
      label: (body) => text(body.username) ? `${body.username}${body.discriminator && body.discriminator !== "0" ? `#${body.discriminator}` : ""}` : "Discord account",
    },
  },
  {
    id: "spotify",
    name: "Spotify",
    docs: "https://developer.spotify.com/dashboard",
    env: { id: ["SPOTIFY_CLIENT_ID"], secret: ["SPOTIFY_CLIENT_SECRET"] },
    authorizeUrl: "https://accounts.spotify.com/authorize",
    tokenUrl: "https://accounts.spotify.com/api/token",
    scopes: "user-read-email playlist-read-private user-top-read",
    tokenAuth: "basic",
    identity: {
      url: "https://api.spotify.com/v1/me",
      label: (body) => text(body.email) || text(body.display_name) || "Spotify account",
    },
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    docs: "https://www.linkedin.com/developers/apps",
    env: { id: ["LINKEDIN_CLIENT_ID"], secret: ["LINKEDIN_CLIENT_SECRET"] },
    authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scopes: "openid profile email w_member_social",
    identity: {
      url: "https://api.linkedin.com/v2/userinfo",
      label: (body) => text(body.email) || text(body.name) || "LinkedIn account",
    },
  },
  {
    id: "reddit",
    name: "Reddit",
    docs: "https://www.reddit.com/prefs/apps",
    env: { id: ["REDDIT_CLIENT_ID"], secret: ["REDDIT_CLIENT_SECRET"] },
    authorizeUrl: "https://www.reddit.com/api/v1/authorize",
    tokenUrl: "https://www.reddit.com/api/v1/access_token",
    scopes: "identity read",
    scopeSeparator: ",",
    tokenAuth: "basic",
    extraAuthorize: { duration: "permanent" },
    identity: {
      url: "https://oauth.reddit.com/api/v1/me",
      headers: { "User-Agent": "LifeOS/1.0" },
      label: (body) => text(body.name) || "Reddit account",
    },
  },
  {
    id: "dropbox",
    name: "Dropbox",
    docs: "https://www.dropbox.com/developers/apps",
    env: { id: ["DROPBOX_CLIENT_ID", "DROPBOX_APP_KEY"], secret: ["DROPBOX_CLIENT_SECRET", "DROPBOX_APP_SECRET"] },
    authorizeUrl: "https://www.dropbox.com/oauth2/authorize",
    tokenUrl: "https://api.dropboxapi.com/oauth2/token",
    scopes: "account_info.read files.metadata.read",
    extraAuthorize: { token_access_type: "offline" },
    identity: {
      url: "https://api.dropboxapi.com/2/users/get_current_account",
      method: "POST",
      label: (body) => text(body.email) || text(body.name) || "Dropbox account",
    },
  },
  {
    id: "zoom",
    name: "Zoom",
    docs: "https://marketplace.zoom.us/develop/create",
    env: { id: ["ZOOM_CLIENT_ID"], secret: ["ZOOM_CLIENT_SECRET"] },
    authorizeUrl: "https://zoom.us/oauth/authorize",
    tokenUrl: "https://zoom.us/oauth/token",
    scopes: "user:read",
    tokenAuth: "basic",
    identity: {
      url: "https://api.zoom.us/v2/users/me",
      label: (body) => text(body.email) || text(body.display_name) || "Zoom account",
    },
  },
  {
    id: "x",
    name: "X",
    docs: "https://developer.x.com/en/portal/dashboard",
    env: { id: ["X_CLIENT_ID", "TWITTER_CLIENT_ID"], secret: ["X_CLIENT_SECRET", "TWITTER_CLIENT_SECRET"] },
    authorizeUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    scopes: "users.read tweet.read offline.access",
    pkce: true,
    publicClient: true,
    identity: {
      url: "https://api.twitter.com/2/users/me",
      label: (body) => {
        const data = record(body.data);
        return text(data.username) || text(data.name) || "X account";
      },
    },
  },
  {
    id: "facebook",
    name: "Meta",
    docs: "https://developers.facebook.com/apps",
    env: { id: ["FACEBOOK_CLIENT_ID", "META_CLIENT_ID", "FACEBOOK_APP_ID", "META_APP_ID"], secret: ["FACEBOOK_CLIENT_SECRET", "META_CLIENT_SECRET", "FACEBOOK_APP_SECRET", "META_APP_SECRET"] },
    authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    scopes: "email public_profile pages_show_list",
    identity: {
      url: "https://graph.facebook.com/v21.0/me?fields=id,name,email",
      label: (body) => text(body.email) || text(body.name) || "Meta account",
    },
  },
  {
    id: "pinterest",
    name: "Pinterest",
    docs: "https://developers.pinterest.com/apps/",
    env: { id: ["PINTEREST_CLIENT_ID"], secret: ["PINTEREST_CLIENT_SECRET"] },
    authorizeUrl: "https://www.pinterest.com/oauth/",
    tokenUrl: "https://api.pinterest.com/v5/oauth/token",
    scopes: "boards:read pins:read user_accounts:read",
    scopeSeparator: ",",
    tokenAuth: "basic",
    identity: {
      url: "https://api.pinterest.com/v5/user_account",
      label: (body) => text(body.username) || text(body.business_name) || "Pinterest account",
    },
  },
  {
    id: "tiktok",
    name: "TikTok",
    docs: "https://developers.tiktok.com/apps",
    env: { id: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_ID"], secret: ["TIKTOK_CLIENT_SECRET"] },
    authorizeUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    scopes: "user.info.basic",
    scopeSeparator: ",",
    clientIdParam: "client_key",
    pkce: true,
    identity: {
      url: "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name",
      label: (body) => {
        const data = record(body.data);
        const user = record(data.user);
        return text(user.display_name) || "TikTok account";
      },
    },
  },
  {
    id: "clickup",
    name: "ClickUp",
    docs: "https://app.clickup.com/settings/apps",
    env: { id: ["CLICKUP_CLIENT_ID", "CLICKUP_OAUTH_CLIENT_ID"], secret: ["CLICKUP_CLIENT_SECRET", "CLICKUP_OAUTH_CLIENT_SECRET"] },
    authorizeUrl: "https://app.clickup.com/api",
    tokenUrl: "https://api.clickup.com/api/v2/oauth/token",
    scopes: "",
    identity: {
      url: "https://api.clickup.com/api/v2/user",
      label: (body) => {
        const user = record(body.user);
        return text(user.email) || text(user.username) || "ClickUp account";
      },
    },
  },
  {
    id: "yahoo",
    name: "Yahoo",
    docs: "https://developer.yahoo.com/apps/",
    env: { id: ["YAHOO_CLIENT_ID"], secret: ["YAHOO_CLIENT_SECRET"] },
    authorizeUrl: "https://api.login.yahoo.com/oauth2/request_auth",
    tokenUrl: "https://api.login.yahoo.com/oauth2/get_token",
    scopes: "openid email profile",
    tokenAuth: "basic",
    identity: {
      url: "https://api.login.yahoo.com/openid/v1/userinfo",
      label: (body) => text(body.email) || text(body.nickname) || "Yahoo account",
    },
  },
];

const BY_ID = new Map(OAUTH_PROVIDERS.map((provider) => [provider.id, provider]));

export function oauthProvider(id: string): OAuthProvider | undefined {
  return BY_ID.get(id.trim().toLowerCase());
}

export function oauthProviders(): OAuthProvider[] {
  return OAUTH_PROVIDERS;
}

export function redirectUriFor(origin: string) {
  return `${origin.replace(/\/$/, "")}/api/integrations/callback`;
}

/** Read this provider's client id/secret from the environment. Never logged. */
export async function credentials(spec: OAuthProvider): Promise<OAuthCredentials> {
  const bag = await envBag();
  const pick = (names: string[]) => {
    for (const name of names) {
      const value = (bag[name] || "").trim();
      if (value) return value;
    }
    return "";
  };
  return { clientId: pick(spec.env.id), clientSecret: pick(spec.env.secret) };
}

/** Human-readable list of what is missing for a provider, for an honest error. */
export function missingCredentials(spec: OAuthProvider, creds: OAuthCredentials) {
  const missing: string[] = [];
  if (!creds.clientId) missing.push(spec.env.id[0]);
  if (!spec.publicClient && !creds.clientSecret) missing.push(spec.env.secret[0]);
  return missing;
}

export function authorizeUrl(spec: OAuthProvider, input: { redirectUri: string; state: string; codeChallenge?: string; clientId: string }) {
  const url = new URL(spec.authorizeUrl);
  url.searchParams.set(spec.clientIdParam || "client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("state", input.state);
  url.searchParams.set("response_type", "code");
  if (spec.scopes.trim()) url.searchParams.set("scope", spec.scopeSeparator ? spec.scopes.split(" ").join(spec.scopeSeparator) : spec.scopes);
  if (spec.pkce && input.codeChallenge) {
    url.searchParams.set("code_challenge", input.codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
  }
  for (const [name, value] of Object.entries(spec.extraAuthorize || {})) url.searchParams.set(name, value);
  return url.toString();
}

export type TokenSet = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string | null;
  scopes: string;
};

function tokenSet(body: Record<string, unknown>, spec: OAuthProvider, previousRefresh = ""): TokenSet {
  const accessToken = text(body.access_token);
  const refreshToken = text(body.refresh_token) || previousRefresh;
  const expiresIn = Number(body.expires_in || 0);
  return {
    accessToken,
    refreshToken,
    expiresAt: expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
    scopes: text(body.scope, spec.scopes),
  };
}

async function postToken(spec: OAuthProvider, creds: OAuthCredentials, params: Record<string, string>) {
  const headers: Record<string, string> = { Accept: "application/json" };
  let body = "";
  const clientIdParam = spec.clientIdParam || "client_id";
  if (spec.tokenAuth === "basic-json") {
    headers["Content-Type"] = "application/json";
    headers.Authorization = `Basic ${Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64")}`;
    body = JSON.stringify({ ...params, grant_type: params.grant_type });
  } else if (spec.tokenAuth === "basic") {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    headers.Authorization = `Basic ${Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64")}`;
    body = new URLSearchParams(params).toString();
  } else {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    const all = new URLSearchParams({ ...params, [clientIdParam]: creds.clientId });
    if (!spec.publicClient && creds.clientSecret) all.set("client_secret", creds.clientSecret);
    body = all.toString();
  }
  const response = await fetch(spec.tokenUrl, { method: "POST", headers, body, signal: AbortSignal.timeout(15000) });
  const raw = await response.text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    parsed = Object.fromEntries(new URLSearchParams(raw));
  }
  return { ok: response.ok, status: response.status, body: parsed };
}

function errorText(spec: OAuthProvider, body: Record<string, unknown>, status: number) {
  const message =
    text(body.error_description) ||
    text(body.message) ||
    text(record(body.error).message) ||
    text(body.error);
  return message ? `${message} (HTTP ${status})` : `${spec.name} refused the request (HTTP ${status}).`;
}

export async function exchangeCode(spec: OAuthProvider, creds: OAuthCredentials, input: { code: string; redirectUri: string; verifier: string }) {
  const params: Record<string, string> = { grant_type: "authorization_code", code: input.code, redirect_uri: input.redirectUri };
  if (spec.pkce && input.verifier) params.code_verifier = input.verifier;
  const result = await postToken(spec, creds, params);
  if (!result.ok) return { ok: false as const, text: errorText(spec, result.body, result.status) };
  const tokens = tokenSet(result.body, spec);
  if (!tokens.accessToken) return { ok: false as const, text: "The provider accepted the login but returned no access token." };
  return { ok: true as const, tokens, body: result.body };
}

export async function refreshAccessToken(spec: OAuthProvider, creds: OAuthCredentials, refreshToken: string) {
  if (spec.noRefresh || !refreshToken) return null;
  const result = await postToken(spec, creds, { grant_type: "refresh_token", refresh_token: refreshToken });
  if (!result.ok) return null;
  const tokens = tokenSet(result.body, spec, refreshToken);
  if (!tokens.accessToken) return null;
  return tokens;
}

/** A real provider call that proves the token works, and names the account. */
export async function identify(spec: OAuthProvider, accessToken: string) {
  try {
    const response = await fetch(spec.identity.url, {
      method: spec.identity.method || "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        ...(spec.identity.form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
        ...(spec.identity.headers || {}),
      },
      ...(spec.identity.form ? { body: new URLSearchParams(spec.identity.form).toString() } : {}),
      signal: AbortSignal.timeout(12000),
    });
    const raw = await response.text();
    let body: Record<string, unknown> = {};
    try {
      body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    } catch {
      body = { message: raw.slice(0, 200) };
    }
    if (!response.ok) {
      const message = text(body.message) || text(body.error_description) || text(record(body.error).message) || `HTTP ${response.status}`;
      return { ok: false as const, label: "", text: `${spec.name} refused the stored token: ${message}` };
    }
    if (body.ok === false) {
      return { ok: false as const, label: "", text: `${spec.name} refused the stored token: ${text(body.error) || "ok=false"}` };
    }
    const label = spec.identity.label(body) || `${spec.name} account`;
    return { ok: true as const, label, text: `Connected · ${label}` };
  } catch (error) {
    return { ok: false as const, label: "", text: error instanceof Error ? error.message : `${spec.name} did not answer.` };
  }
}

export async function revoke(spec: OAuthProvider, creds: OAuthCredentials, token: string) {
  if (!spec.revoke || !token) return;
  try {
    if (spec.revoke.style === "token-query") {
      await fetch(`${spec.revoke.url}?token=${encodeURIComponent(token)}`, { method: "POST", signal: AbortSignal.timeout(8000) });
      return;
    }
    await fetch(spec.revoke.url.replace("{client_id}", encodeURIComponent(creds.clientId)), {
      method: "DELETE",
      headers: {
        Authorization: `Basic ${Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64")}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github+json",
        "User-Agent": "LifeOS",
      },
      body: JSON.stringify({ access_token: token }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    /* revocation is best effort; the local row is removed either way */
  }
}
