var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// attachments/working-worker.js
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var __defProp22 = Object.defineProperty;
var __name22 = /* @__PURE__ */ __name2((target, value) => __defProp22(target, "name", { value, configurable: true }), "__name");
var t = /* @__PURE__ */ __name22(({ base: e = "", routes: t2 = [], ...o2 } = {}) => ({ __proto__: new Proxy({}, { get: /* @__PURE__ */ __name22((o3, r2, a, s) => (o4, ...n) => t2.push([r2.toUpperCase?.(), RegExp(`^${(s = (e + o4).replace(/\/+(\/|$)/g, "$1")).replace(/(\/?\.?):(\w+)\+/g, "($1(?<$2>[^]+))").replace(/(\/?\.?):(\w+)/g, "($1(?<$2>[^$1/]+?))").replace(/\./g, "\\.").replace(/(\/?)\*/g, "($1.*)?")}/*$`), n, s]) && a, "get") }), routes: t2, ...o2, async fetch(e2, ...r2) {
  let a, s, n = new URL(e2.url), c = e2.query = { __proto__: null };
  for (let [e3, t3] of n.searchParams) c[e3] = c[e3] ? [].concat(c[e3], t3) : t3;
  e: try {
    for (let t3 of o2.before || []) if (null != (a = await t3(e2.proxy ?? e2, ...r2))) break e;
    t: for (let [o3, c2, l, i] of t2) if ((o3 == e2.method || "ALL" == o3) && (s = n.pathname.match(c2))) {
      e2.params = s.groups || {}, e2.route = i;
      for (let t3 of l) if (null != (a = await t3(e2.proxy ?? e2, ...r2))) break t;
    }
  } catch (t3) {
    if (!o2.catch) throw t3;
    a = await o2.catch(t3, e2.proxy ?? e2, ...r2);
  }
  try {
    for (let t3 of o2.finally || []) a = await t3(a, e2.proxy ?? e2, ...r2) ?? a;
  } catch (t3) {
    if (!o2.catch) throw t3;
    a = await o2.catch(t3, e2.proxy ?? e2, ...r2);
  }
  return a;
} }), "t");
var o = /* @__PURE__ */ __name22((e = "text/plain; charset=utf-8", t2) => (o2, r2 = {}) => {
  if (void 0 === o2 || o2 instanceof Response) return o2;
  const a = new Response(t2?.(o2) ?? o2, r2.url ? void 0 : r2);
  return a.headers.set("content-type", e), a;
}, "o");
var r = o("application/json; charset=utf-8", JSON.stringify);
var p = o("text/plain; charset=utf-8", String);
var f = o("text/html");
var u = o("image/jpeg");
var h = o("image/png");
var g = o("image/webp");
function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Id, X-Lifeos-Board",
    "Access-Control-Allow-Credentials": "true"
  };
}
__name(corsHeaders, "corsHeaders");
__name2(corsHeaders, "corsHeaders");
__name22(corsHeaders, "corsHeaders");
function withCors(response, origin) {
  const headers = new Headers(response.headers);
  const cors2 = corsHeaders(origin);
  Object.entries(cors2).forEach(([key, value]) => headers.set(key, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
__name(withCors, "withCors");
__name2(withCors, "withCors");
__name22(withCors, "withCors");
var OAUTH_CALLBACK = "https://lifeos1-api.ceogps.workers.dev/oauth/callback";
var DISCORD_CALLBACK = "https://lifeos1-api.ceogps.workers.dev/oauth/callback";
var DISCORD_SCOPES = "identify email guilds connections";
var NYLAS_CALLBACK = "https://lifeos1-api.ceogps.workers.dev/api/nylas/callback";
var OAUTH_ORIGINS = /* @__PURE__ */ new Set(["https://lifeos.ceogps.com", "https://lifeos1.ceogps.com"]);
var OAUTH_PROVIDERS = /* @__PURE__ */ new Set(["google", "microsoft", "github", "slack", "facebook", "instagram", "twitter", "linkedin", "spotify", "discord", "notion"]);
function oauthCallback(env) {
  const named = String(env.OAUTH_REDIRECT_URI || "").trim();
  return named === OAUTH_CALLBACK ? named : OAUTH_CALLBACK;
}
__name(oauthCallback, "oauthCallback");
__name2(oauthCallback, "oauthCallback");
__name22(oauthCallback, "oauthCallback");
function safeOrigin(value) {
  try {
    const origin = new URL(String(value || "")).origin;
    if (OAUTH_ORIGINS.has(origin)) return origin;
  } catch {
  }
  return "https://lifeos.ceogps.com";
}
__name(safeOrigin, "safeOrigin");
__name2(safeOrigin, "safeOrigin");
__name22(safeOrigin, "safeOrigin");
function originFromState(state) {
  const bar = String(state || "").indexOf("|");
  if (bar < 0) return "https://lifeos.ceogps.com";
  try {
    return safeOrigin(decodeURIComponent(state.slice(bar + 1)));
  } catch {
    return "https://lifeos.ceogps.com";
  }
}
__name(originFromState, "originFromState");
__name2(originFromState, "originFromState");
__name22(originFromState, "originFromState");
function supabaseUrl(env) {
  return env["SUPABASE_URL"] || env["SUPABASE_PROJECT_URL"] || env["NEXT_PUBLIC_SUPABASE_URL"] || "https://mhvcdstgkyplhzjptgfr.supabase.co";
}
__name(supabaseUrl, "supabaseUrl");
function supabaseKey(env) {
  return env["SUPABASE_SERVICE_ROLE_KEY"] || env["SUPABASE_SECRET_KEY"] || env["VITE_SUPABASE_SECRET_KEY"] || env["NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"] || "";
}
__name(supabaseKey, "supabaseKey");
function issueState(origin) {
  return `${crypto.randomUUID()}|${encodeURIComponent(safeOrigin(origin))}`;
}
__name(issueState, "issueState");
__name2(issueState, "issueState");
__name22(issueState, "issueState");
var TOKEN_URLS = {
  google: "https://oauth2.googleapis.com/token",
  microsoft: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  github: "https://github.com/login/oauth/access_token",
  slack: "https://slack.com/api/oauth.v2.access",
  facebook: "https://graph.facebook.com/v26.0/oauth/access_token",
  instagram: "https://api.instagram.com/oauth/access_token",
  twitter: "https://api.twitter.com/2/oauth2/token",
  linkedin: "https://www.linkedin.com/oauth/v2/accessToken",
  spotify: "https://accounts.spotify.com/api/token",
  discord: "https://discord.com/api/oauth2/token",
  notion: "https://api.notion.com/v1/oauth/token"
};
function b64urlBytes(bytes) {
  let text = "";
  bytes.forEach((b) => {
    text += String.fromCharCode(b);
  });
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
__name(b64urlBytes, "b64urlBytes");
async function pkcePair() {
  const verifier = b64urlBytes(crypto.getRandomValues(new Uint8Array(48)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return { verifier, challenge: b64urlBytes(new Uint8Array(digest)) };
}
__name(pkcePair, "pkcePair");
function clientCreds(provider, env) {
  const key = provider.toUpperCase();
  return { clientId: env[`${key}_CLIENT_ID`] || "", clientSecret: env[`${key}_CLIENT_SECRET`] || "" };
}
__name(clientCreds, "clientCreds");
async function refreshAccessToken(provider, refreshToken, env) {
  const tokenUrl = TOKEN_URLS[provider];
  const { clientId, clientSecret } = clientCreds(provider, env);
  if (!tokenUrl || !clientId || !clientSecret) throw new Error(`Missing ${provider} client credentials`);
  const params = new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken });
  const headers = { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" };
  if (provider === "spotify" || provider === "twitter") {
    headers.Authorization = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
  } else {
    params.set("client_id", clientId);
    params.set("client_secret", clientSecret);
  }
  const response = await fetch(tokenUrl, { method: "POST", headers, body: params.toString() });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || `Refresh failed: ${response.status}`);
  }
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken,
    expires_in: data.expires_in ?? null
  };
}
__name(refreshAccessToken, "refreshAccessToken");
async function nylasClientId(env) {
  if (env.NYLAS_CLIENT_ID) return env.NYLAS_CLIENT_ID;
  if (!env.NYLAS_API_KEY) return "";
  const listed = await fetch("https://api.us.nylas.com/v3/grants?limit=1", {
    headers: { Authorization: `Bearer ${env.NYLAS_API_KEY}`, Accept: "application/json" }
  });
  if (!listed.ok) return "";
  const body = await listed.json().catch(() => ({}));
  return body?.data?.[0]?.application_id || "";
}
__name(nylasClientId, "nylasClientId");
__name2(nylasClientId, "nylasClientId");
__name22(nylasClientId, "nylasClientId");
async function sessionUserId(request, env) {
  if (request.userId) return request.userId;
  const header = request.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || !supabaseUrl(env) || !supabaseKey(env)) return "";
  const response = await fetch(`${supabaseUrl(env)}/auth/v1/user`, {
    headers: {
      apikey: supabaseKey(env),
      Authorization: `Bearer ${token}`
    }
  });
  if (!response.ok) return "";
  const user = await response.json();
  const id = user && typeof user.id === "string" ? user.id : "";
  if (id) request.userId = id;
  return id;
}
__name(sessionUserId, "sessionUserId");
function isBoardRequest(request) {
  const url = new URL(request.url);
  if (url.searchParams.get("board") === "1") return true;
  if (request.headers.get("x-lifeos-board") === "1") return true;
  return false;
}
__name(isBoardRequest, "isBoardRequest");
function isBoardOauth(request) {
  if (!isBoardRequest(request)) return false;
  const path = new URL(request.url).pathname;
  return path === "/api/oauth/start" || path === "/api/oauth/linked" || path === "/api/oauth/status" || path === "/api/oauth/token/fresh" || path === "/api/oauth/disconnect" || path === "/api/oauth/facebook/check";
}
__name(isBoardOauth, "isBoardOauth");
async function actorId(request, env) {
  return await sessionUserId(request, env) || (isBoardRequest(request) ? "lifeos-owner" : "");
}
__name(actorId, "actorId");
function isPublicApi(request) {
  if (request.method === "OPTIONS") return true;
  const path = new URL(request.url).pathname;
  if (request.method === "GET" && (path === "/health" || path === "/test")) return true;
  if (request.method === "GET" && (path === "/api/config" || path === "/api/config/")) return true;
  if (request.method === "GET" && (path === "/api/oauth/callback" || path === "/oauth/callback" || path === "/api/nylas/callback")) return true;
  if (request.method === "GET" && path.startsWith("/api/upload/object/")) return true;
  return false;
}
__name(isPublicApi, "isPublicApi");
async function requireUser(request, env) {
  const userId = await sessionUserId(request, env);
  if (userId) return null;
  return Response.json({ error: "Sign in required" }, { status: 401, headers: corsHeaders(request.headers.get("Origin") || void 0) });
}
__name(requireUser, "requireUser");
__name2(sessionUserId, "sessionUserId");
__name22(sessionUserId, "sessionUserId");
function serviceHeaders(env, extra) {
  return {
    apikey: supabaseKey(env),
    Authorization: `Bearer ${supabaseKey(env)}`,
    ...extra || {}
  };
}
__name(serviceHeaders, "serviceHeaders");
__name2(serviceHeaders, "serviceHeaders");
__name22(serviceHeaders, "serviceHeaders");
async function putState(env, state, record) {
  if (!env.LIFEOS_KV || !state) return false;
  await env.LIFEOS_KV.put(`oauth:state:${state}`, JSON.stringify(record), { expirationTtl: 600 });
  return true;
}
__name(putState, "putState");
__name2(putState, "putState");
__name22(putState, "putState");
async function storePending(env, row) {
  const saved = await putState(env, row.oauth_state, {
    user_id: row.user_id,
    provider: row.oauth_provider,
    email: row.email || "",
    id: "",
    redirect: row.oauth_redirect_uri || "",
    at: Date.now()
  });
  if (!saved) return null;
  const response = await fetch(`${supabaseUrl(env)}/rest/v1/integrations_credentials`, {
    method: "POST",
    headers: serviceHeaders(env, { "Content-Type": "application/json", Prefer: "return=representation" }),
    body: JSON.stringify(row)
  });
  if (!response.ok) return { id: "", user_id: row.user_id, email: row.email || "", oauth_provider: row.oauth_provider };
  const rows = await response.json();
  const pending = Array.isArray(rows) ? rows[0] : null;
  if (pending?.id) {
    await putState(env, row.oauth_state, {
      user_id: row.user_id,
      provider: row.oauth_provider,
      email: row.email || "",
      id: pending.id,
      redirect: row.oauth_redirect_uri || "",
      at: Date.now()
    });
  }
  return pending || { id: "", user_id: row.user_id, email: row.email || "", oauth_provider: row.oauth_provider };
}
__name(storePending, "storePending");
__name2(storePending, "storePending");
__name22(storePending, "storePending");
async function claimState(env, state, provider) {
  if (!state || !env.LIFEOS_KV) return null;
  const key = `oauth:state:${state}`;
  const raw = await env.LIFEOS_KV.get(key);
  if (!raw) return null;
  await env.LIFEOS_KV.delete(key);
  let row;
  try {
    row = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!row?.user_id || !row.provider) return null;
  if (provider && row.provider !== provider) return null;
  if (!row.at || Date.now() - row.at > 10 * 60 * 1e3) return null;
  return { id: row.id || "", user_id: row.user_id, email: row.email || "", oauth_provider: row.provider, redirect: row.redirect || "" };
}
__name(claimState, "claimState");
__name2(claimState, "claimState");
__name22(claimState, "claimState");
var router = t();
async function facebookProof(env, token) {
  const secret = String(env.FACEBOOK_CLIENT_SECRET || "");
  if (!secret || !token) return "";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const buf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(token));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function facebookMe(env, token) {
  const proof = await facebookProof(env, token);
  const url = "https://graph.facebook.com/v26.0/me?fields=id,name,email&access_token=" + encodeURIComponent(token) + "&appsecret_proof=" + proof;
  const response = await fetch(url, { headers: { "User-Agent": "lifeos1" } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) {
    const message = body.error && body.error.message || "Facebook refused the token.";
    return { ok: false, text: message, email: "", name: "" };
  }
  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || "");
  const who = [name, email].filter(Boolean).join(" · ");
  return { ok: true, text: who ? "Signed in as " + who : "Signed in to Facebook.", email, name };
}
router.post("/facebook/check", async (request, env) => {
  const posted = await request.json().catch(() => ({}));
  let token = String(posted.access_token || "");
  if (!token) {
    const userId = await actorId(request, env);
    const email = String(posted.email || "").trim().toLowerCase();
    if (!userId) return Response.json({ ok: false, text: "Sign in required." }, { status: 401, headers: corsHeaders() });
    let q = supabaseUrl(env) + "/rest/v1/integrations_credentials?user_id=eq." + encodeURIComponent(userId) + "&oauth_provider=eq.facebook&status=eq.on&select=email,oauth_access_token&order=updated_at.desc";
    if (email) q += "&email=eq." + encodeURIComponent(email);
    const rows = await fetch(q, { headers: serviceHeaders(env) }).then((r) => r.json()).catch(() => []);
    token = Array.isArray(rows) && rows[0] ? String(rows[0].oauth_access_token || "") : "";
  }
  if (!token) return Response.json({ ok: false, text: "Facebook is not connected." }, { headers: corsHeaders() });
  const health = await facebookMe(env, token);
  return Response.json({ ok: health.ok, text: health.text, email: health.email }, { headers: corsHeaders() });
});
router.get("/status", async (request, env) => {
  const url = new URL(request.url);
  const provider = url.searchParams.get("provider");
  const userId = await sessionUserId(request, env);
  const accountEmail = url.searchParams.get("account_email");
  if (!userId) {
    return Response.json({ error: "Sign in required" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  try {
    const dbUrl = supabaseUrl(env);
    const dbKey = supabaseKey(env);
    if (!dbUrl || !dbKey) {
      return Response.json({
        error: "Supabase not configured",
        connected: [],
        statuses: {}
      }, { headers: corsHeaders() });
    }
    let queryUrl = `${dbUrl}/rest/v1/integrations_credentials?user_id=eq.${encodeURIComponent(userId)}&select=id,integration_name,email,oauth_provider,oauth_access_token,status,updated_at`;
    if (provider) {
      queryUrl += `&oauth_provider=eq.${encodeURIComponent(provider)}`;
    }
    if (accountEmail) {
      queryUrl += `&email=eq.${encodeURIComponent(accountEmail)}`;
    }
    const response = await fetch(queryUrl, {
      headers: {
        "apikey": dbKey,
        "Authorization": `Bearer ${dbKey}`,
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      throw new Error(`Supabase query failed: ${response.status}`);
    }
    const credentials = await response.json();
    const connected = [];
    const accounts = [];
    const statuses = {};
    for (const cred of credentials) {
      const key = cred.oauth_provider || cred.integration_name;
      const isConnected = cred.status === "on" && !!cred.oauth_access_token;
      if (isConnected) {
        connected.push(key);
        accounts.push({ provider: key, email: cred.email || "" });
        if (!statuses[key] || !statuses[key].connected) {
          statuses[key] = {
            connected: true,
            email: cred.email,
            lastSynced: cred.updated_at
          };
        }
      } else if (!statuses[key]) {
        statuses[key] = { connected: false };
      }
    }
    return Response.json({
      connected,
      statuses,
      accounts
    }, { headers: corsHeaders() });
  } catch (e) {
    console.error("[oauth/status] error:", e);
    return Response.json({
      error: "Failed to check OAuth status",
      connected: [],
      statuses: {}
    }, { headers: corsHeaders() });
  }
});
router.get("/linked", async (request, env) => {
  const userId = await actorId(request, env);
  if (!userId) return Response.json({ error: "Sign in required", accounts: [] }, { status: 401, headers: corsHeaders() });
  if (!supabaseUrl(env) || !supabaseKey(env)) {
    return Response.json({ accounts: [] }, { headers: corsHeaders() });
  }
  const response = await fetch(`${supabaseUrl(env)}/rest/v1/integrations_credentials?user_id=eq.${encodeURIComponent(userId)}&status=eq.on&select=oauth_provider,email,oauth_access_token`, {
    headers: serviceHeaders(env)
  });
  if (!response.ok) return Response.json({ accounts: [] }, { headers: corsHeaders() });
  const rows = await response.json();
  const accounts = Array.isArray(rows) ? rows.filter((row) => row?.oauth_access_token && row?.oauth_provider).map((row) => ({ provider: row.oauth_provider, email: row.email || "" })) : [];
  return Response.json({ accounts }, { headers: corsHeaders() });
});
async function startOauth(request, env) {
  const posted = request.method === "POST" ? await request.json().catch(() => ({})) : null;
  const url = new URL(request.url);
  const provider = String(posted ? posted.provider : url.searchParams.get("provider") || "");
  const accountEmail = String((posted ? posted.account_email : url.searchParams.get("account_email")) || "").trim().toLowerCase();
  const userId = await actorId(request, env);
  if (!userId) {
    return Response.json({ error: "Sign in required. Start OAuth with POST and a Bearer token." }, { status: 401, headers: corsHeaders() });
  }
  if (accountEmail.endsWith("@icloud.com") && provider !== "facebook") {
    return Response.json({ error: "iCloud connects through Nylas, not OAuth." }, { status: 400, headers: corsHeaders() });
  }
  if (provider === "facebook" && accountEmail && accountEmail !== "cagednreality@icloud.com" && accountEmail !== "cagednreality@outlook.com") {
    return Response.json({ error: "Facebook connects as cagednreality@icloud.com or cagednreality@outlook.com." }, { status: 400, headers: corsHeaders() });
  }
  if (provider === "google" && accountEmail && accountEmail !== "chris@ceogps.com" && accountEmail !== "chrisgr33ninc@gmail.com") {
    return Response.json({ error: "Use the mailbox you clicked." }, { status: 400, headers: corsHeaders() });
  }
  if (!OAUTH_PROVIDERS.has(provider)) {
    return Response.json({ error: "Unsupported provider" }, { status: 400, headers: corsHeaders() });
  }
  if (provider === "instagram") {
    return Response.json({ error: "Instagram Basic Display was shut down. Connect Instagram Business through Facebook instead." }, { status: 400, headers: corsHeaders() });
  }
  if (!clientCreds(provider, env).clientId) {
    const back = safeOrigin(posted ? posted.origin : url.searchParams.get("origin"));
    return Response.redirect(`${back}/panel/integrations?oauth_error=${encodeURIComponent(provider + " needs a client id and secret on the card. Paste both, then press Connect.")}`, 302);
  }
  const callbackUri = provider === "discord" ? DISCORD_CALLBACK : oauthCallback(env);
  const state = issueState(posted ? posted.origin : url.searchParams.get("origin"));
  const oauthUrls = {
    google: "https://accounts.google.com/o/oauth2/v2/auth",
    microsoft: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    github: "https://github.com/login/oauth/authorize",
    slack: "https://slack.com/oauth/v2/authorize",
    facebook: "https://www.facebook.com/v26.0/dialog/oauth",
    instagram: "https://api.instagram.com/oauth/authorize",
    twitter: "https://twitter.com/i/oauth2/authorize",
    linkedin: "https://www.linkedin.com/oauth/v2/authorization",
    spotify: "https://accounts.spotify.com/authorize",
    discord: "https://discord.com/oauth2/authorize",
    notion: "https://api.notion.com/v1/oauth/authorize"
  };
  const params = new URLSearchParams({
    client_id: clientCreds(provider, env).clientId,
    redirect_uri: callbackUri,
    response_type: "code",
    scope: getScopes(provider, accountEmail),
    state
  });
  if (provider === "google") {
    params.set("access_type", "offline");
    params.set("prompt", "select_account consent");
    params.set("include_granted_scopes", "true");
    params.set("login_hint", accountEmail || "chrisgr33ninc@gmail.com");
  }
  if (provider === "notion") {
    params.set("owner", "user");
    params.delete("scope");
  }
  if (provider === "twitter") {
    const pkce = await pkcePair();
    params.set("code_challenge", pkce.challenge);
    params.set("code_challenge_method", "S256");
    if (env.LIFEOS_KV) await env.LIFEOS_KV.put(`oauth:pkce:${state}`, pkce.verifier, { expirationTtl: 600 });
  }
  const pending = await storePending(env, {
    user_id: userId,
    integration_name: provider,
    email: accountEmail,
    label: accountEmail,
    oauth_provider: provider,
    status: "pending",
    oauth_state: state,
    oauth_redirect_uri: callbackUri,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  });
  if (!pending) {
    return Response.json({ error: "Could not store OAuth state" }, { status: 500, headers: corsHeaders() });
  }
  const next = `${oauthUrls[provider]}?${params.toString()}`;
  if (request.method === "POST") return Response.json({ url: next }, { headers: corsHeaders() });
  return Response.redirect(next, 302);
}
__name(startOauth, "startOauth");
__name2(startOauth, "startOauth");
__name22(startOauth, "startOauth");
router.get("/start", startOauth);
router.post("/start", startOauth);
async function providerEmail(provider, accessToken) {
  const endpoints = {
    google: "https://www.googleapis.com/oauth2/v3/userinfo",
    discord: "https://discord.com/api/users/@me",
    spotify: "https://api.spotify.com/v1/me",
    facebook: "https://graph.facebook.com/v26.0/me?fields=email",
    microsoft: "https://graph.microsoft.com/v1.0/me",
    linkedin: "https://api.linkedin.com/v2/userinfo"
  };
  if (provider === "github") {
    const gh = await fetch("https://api.github.com/user", { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json", "User-Agent": "lifeos1" } });
    if (!gh.ok) return "";
    const who = await gh.json().catch(() => ({}));
    return String(who.email || who.login || "").trim().toLowerCase();
  }
  if (provider === "slack") {
    const slack = await fetch("https://slack.com/api/auth.test", { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } });
    const team = await slack.json().catch(() => ({}));
    return String(team.user || team.team || "").trim().toLowerCase();
  }
  if (provider === "twitter") {
    const x = await fetch("https://api.twitter.com/2/users/me", { headers: { Authorization: `Bearer ${accessToken}` } });
    const me = await x.json().catch(() => ({}));
    return String(me.data && me.data.username || "").trim().toLowerCase();
  }
  const endpoint = endpoints[provider];
  if (!endpoint) return "";
  const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "lifeos1" } });
  if (!response.ok) return "";
  const body = await response.json().catch(() => ({}));
  return String(body.email || body.mail || body.userPrincipalName || "").trim().toLowerCase();
}
__name(providerEmail, "providerEmail");
function rawParam(search, name) {
  const query = String(search || "").replace(/^\?/, "");
  for (const part of query.split("&")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    let key = part.slice(0, eq);
    try { key = decodeURIComponent(key); } catch { }
    if (key !== name) continue;
    try { return decodeURIComponent(part.slice(eq + 1).replace(/\+/g, "%2B")); } catch { return ""; }
  }
  return "";
}
router.get("/callback", async (request, env) => {
  const url = new URL(request.url);
  const code = rawParam(url.search, "code");
  const state = url.searchParams.get("state") || "";
  const error = url.searchParams.get("error");
  const hinted = url.searchParams.get("provider") || "";
  const origin = originFromState(state);
  const back = /* @__PURE__ */ __name((params) => {
  const err = String(params.oauth_error || "");
  const ok = String(params.oauth_success || "");
  const title = err ? "Not connected" : "Connected";
  const rawMessage = err || (ok ? ok + " is connected. You can return to the app." : "You can return to the app.");
  const message = rawMessage.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
  const stay = err ? "" : "<p style=\"margin:0 0 20px\">This connection stays on the account. You do not sign in again to use it.</p>";
  const href = String(origin) + "/panel/integrations";
  const html = "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><title>" + title + "</title></head><body style=\"margin:0;background:#0b0b0b;color:#f5f5f5;font:16px/1.5 system-ui,sans-serif;padding:48px 24px\"><main style=\"max-width:32rem;margin:0 auto\"><h1 style=\"font-size:1.5rem;margin:0 0 12px\">" + title + "</h1><p style=\"margin:0 0 16px;color:#d0d0d0\">" + message + "</p>" + stay + "<p style=\"margin:0\"><a href=\"" + href + "\" style=\"color:#7dd3fc\">Return to LifeOS</a></p></main>" + (params.spotify_detail ? "<script>(function(){var h=new URLSearchParams(String(location.hash||\"\").replace(/^#/,\"\"));var s=new URLSearchParams(location.search);var spotify=/accounts\\.spotify\\.com/i.test(document.referrer||\"\")||s.get(\"provider\")===\"spotify\"||h.get(\"provider\")===\"spotify\";if(!spotify)return;var msg=h.get(\"error_description\")||s.get(\"error_description\")||h.get(\"error\")||s.get(\"error\")||\"\";var p=document.querySelector(\"main p\");if(!p)return;if(msg)p.textContent=msg;else if(p.textContent===\"Missing code or state\")p.textContent=\"Spotify returned no code and no error. Press Connect again.\";})();</script>" : "") + "</body></html>";
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}, "back");
  if (error) return back({ oauth_error: url.searchParams.get("error_description") || error });
  if (!code || !state.includes("|")) {
    const referer = request.headers.get("referer") || "";
    const spotify = hinted === "spotify" || /accounts\.spotify\.com/i.test(referer);
    if (spotify) {
      const described = rawParam(url.search, "error_description") || rawParam(url.search, "error") || "Spotify returned no code and no error. Press Connect again.";
      return back({ oauth_error: described, spotify_detail: "1" });
    }
    return back({ oauth_error: "Missing code or state", spotify_detail: "1" });
  }
  try {
    const pending = await claimState(env, state, hinted);
    if (!pending) throw new Error("Invalid or expired OAuth state");
    const actualProvider = pending.oauth_provider;
    let verifier = "";
    if (actualProvider === "twitter" && env.LIFEOS_KV) {
      verifier = await env.LIFEOS_KV.get(`oauth:pkce:${state}`) || "";
      await env.LIFEOS_KV.delete(`oauth:pkce:${state}`);
    }
    const tokenResponse = await exchangeCodeForToken(actualProvider, code, pending.redirect || (actualProvider === "discord" ? DISCORD_CALLBACK : oauthCallback(env)), env, verifier);
    if (!tokenResponse.access_token) throw new Error("Failed to obtain access token");
    const email = await providerEmail(actualProvider, tokenResponse.access_token) || pending.email || "";
    if (actualProvider === "facebook") {
      const wanted = pending.email || "cagednreality@icloud.com";
      if (!email) return back({ oauth_error: "Facebook did not share an email. Allow email on the account " + wanted + "." });
      if (email !== wanted) return back({ oauth_error: "You asked for " + wanted + ", but Facebook signed in as " + email + ". Nothing was saved. Switch Facebook accounts and try that link again." });
    }
    if (actualProvider === "google" && pending.email && email && email !== pending.email) {
      return back({ oauth_error: `You clicked ${pending.email}, but Google signed in as ${email}. Nothing was saved. Choose ${pending.email} on Google's account page.` });
    }
    if (actualProvider === "google" && email !== "chris@ceogps.com" && email !== "chrisgr33ninc@gmail.com") {
      return back({ oauth_error: "That Google account is not one of the board mailboxes. Nothing was saved." });
    }
    const updateData = {
      oauth_access_token: tokenResponse.access_token,
      oauth_refresh_token: tokenResponse.refresh_token || null,
      oauth_expires_at: tokenResponse.expires_in ? new Date(Date.now() + tokenResponse.expires_in * 1e3).toISOString() : null,
      oauth_scope: tokenResponse.scope || getScopes(actualProvider, email),
      status: "on",
      oauth_state: null,
      email,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (tokenResponse.id_token) updateData.oauth_id_token = tokenResponse.id_token;
    const row = { ...updateData, user_id: pending.user_id, integration_name: actualProvider, label: email || actualProvider, oauth_provider: actualProvider };
    let saved = await fetch(`${supabaseUrl(env)}/rest/v1/integrations_credentials?on_conflict=user_id,integration_name,email`, {
      method: "POST",
      headers: serviceHeaders(env, { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify(row)
    });
    if (!saved.ok && pending.id) {
      saved = await fetch(`${supabaseUrl(env)}/rest/v1/integrations_credentials?id=eq.${encodeURIComponent(pending.id)}`, {
        method: "PATCH",
        headers: serviceHeaders(env, { "Content-Type": "application/json", Prefer: "return=minimal" }),
        body: JSON.stringify(updateData)
      });
    }
    if (!saved.ok) {
      const detail = (await saved.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 160);
      return back({ oauth_error: "The login finished, but the token was not stored. " + detail });
    }
    if (pending.id) {
      await fetch(`${supabaseUrl(env)}/rest/v1/integrations_credentials?user_id=eq.${encodeURIComponent(pending.user_id)}&oauth_provider=eq.${encodeURIComponent(actualProvider)}&email=eq.${encodeURIComponent(email)}&id=neq.${encodeURIComponent(pending.id)}`, {
        method: "DELETE",
        headers: serviceHeaders(env)
      }).catch(() => void 0);
    }
    return back({ oauth_success: actualProvider });
  } catch (e) {
    console.error("[oauth/callback] error:", e instanceof Error ? e.message : "OAuth failed");
    return back({ oauth_error: e instanceof Error ? e.message : "OAuth failed" });
  }
});
router.get("/disconnect", async (request, env) => {
  const userId = await sessionUserId(request, env);
  if (!userId) return Response.json({ error: "Sign in required" }, { status: 401, headers: corsHeaders() });
  return Response.json({ error: "Use POST" }, { status: 405, headers: corsHeaders() });
});
router.post("/disconnect", async (request, env) => {
  const body = await request.json().catch(() => ({}));
  const { provider, account_email } = body;
  const userId = await actorId(request, env);
  if (!userId) return Response.json({ error: "Sign in required" }, { status: 401, headers: corsHeaders() });
  if (!provider) {
    return Response.json({ error: "Missing provider" }, {
      status: 400,
      headers: corsHeaders()
    });
  }
  try {
    const dbUrl = supabaseUrl(env);
    const dbKey = supabaseKey(env);
    if (!dbUrl || !dbKey) {
      throw new Error("Supabase not configured");
    }
    let deleteUrl = `${dbUrl}/rest/v1/integrations_credentials?user_id=eq.${encodeURIComponent(userId)}&oauth_provider=eq.${encodeURIComponent(provider)}`;
    if (account_email) deleteUrl += `&email=eq.${encodeURIComponent(String(account_email).trim().toLowerCase())}`;
    await fetch(deleteUrl, {
      method: "DELETE",
      headers: {
        "apikey": dbKey,
        "Authorization": `Bearer ${dbKey}`
      }
    });
    return Response.json({ success: true, message: `Disconnected ${provider}` }, {
      headers: corsHeaders()
    });
  } catch (e) {
    console.error("[oauth/disconnect] error:", e);
    return Response.json({ error: "Failed to disconnect" }, {
      status: 500,
      headers: corsHeaders()
    });
  }
});
router.post("/token", async (request, env) => {
  const body = await request.json().catch(() => ({}));
  const { code, provider, state } = body;
  const userId = await sessionUserId(request, env);
  if (!userId) return Response.json({ error: "Sign in required" }, { status: 401, headers: corsHeaders() });
  if (!code || !provider || !state) {
    return Response.json({ error: "Missing code, provider, or state" }, { status: 400, headers: corsHeaders() });
  }
  try {
    const pending = await claimState(env, state, provider);
    if (!pending || pending.user_id !== userId) {
      return Response.json({ error: "Invalid or expired OAuth state" }, { status: 400, headers: corsHeaders() });
    }
    const tokenResponse = await exchangeCodeForToken(provider, code, oauthCallback(env), env);
    await fetch(`${supabaseUrl(env)}/rest/v1/integrations_credentials?id=eq.${encodeURIComponent(pending.id)}`, {
      method: "PATCH",
      headers: serviceHeaders(env, { "Content-Type": "application/json", Prefer: "return=minimal" }),
      body: JSON.stringify({
        status: "on",
        oauth_access_token: tokenResponse.access_token,
        oauth_refresh_token: tokenResponse.refresh_token || null,
        oauth_state: null,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      })
    });
    return Response.json({ ok: true, provider, email: pending.email || "" }, { headers: corsHeaders() });
  } catch (e) {
    console.error("[oauth/token] error:", e instanceof Error ? e.message : "Token exchange failed");
    return Response.json({ error: "Token exchange failed" }, { status: 500, headers: corsHeaders() });
  }
});
router.get("/token/fresh", async (request, env) => {
  const userId = await sessionUserId(request, env);
  if (!userId) return Response.json({ error: "Sign in required" }, { status: 401, headers: corsHeaders() });
  return Response.json({ error: "Use POST" }, { status: 405, headers: corsHeaders() });
});
router.post("/token/fresh", async (request, env) => {
  const userId = await actorId(request, env);
  if (!userId) return Response.json({ error: "Sign in required" }, { status: 401, headers: corsHeaders() });
  const body = await request.json().catch(() => ({}));
  const provider = String(body.provider || "google");
  const email = String(body.email || "").trim().toLowerCase();
  let query = `${supabaseUrl(env)}/rest/v1/integrations_credentials?user_id=eq.${encodeURIComponent(userId)}&oauth_provider=eq.${encodeURIComponent(provider)}&status=eq.on&select=id,email,oauth_access_token,oauth_refresh_token,oauth_expires_at&order=updated_at.desc&limit=1`;
  if (email) query += `&email=eq.${encodeURIComponent(email)}`;
  const listed = await fetch(query, { headers: serviceHeaders(env) });
  const rows = listed.ok ? await listed.json() : [];
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row?.oauth_access_token) return Response.json({ error: "Not connected" }, { status: 404, headers: corsHeaders() });
  const expires = row.oauth_expires_at ? Date.parse(row.oauth_expires_at) : 0;
  if (!expires || expires - Date.now() > 6e4) {
    return Response.json({ access_token: row.oauth_access_token, email: row.email || "", expires_at: row.oauth_expires_at || null }, { headers: corsHeaders() });
  }
  if (!row.oauth_refresh_token) return Response.json({ error: "Token expired. Reconnect this account." }, { status: 401, headers: corsHeaders() });
  try {
    const next = await refreshAccessToken(provider, row.oauth_refresh_token, env);
    const expiresAt = next.expires_in ? new Date(Date.now() + next.expires_in * 1e3).toISOString() : null;
    await fetch(`${supabaseUrl(env)}/rest/v1/integrations_credentials?id=eq.${encodeURIComponent(row.id)}`, {
      method: "PATCH",
      headers: serviceHeaders(env, { "Content-Type": "application/json", Prefer: "return=minimal" }),
      body: JSON.stringify({
        oauth_access_token: next.access_token,
        oauth_refresh_token: next.refresh_token,
        oauth_expires_at: expiresAt,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      })
    });
    return Response.json({ access_token: next.access_token, email: row.email || "", expires_at: expiresAt }, { headers: corsHeaders() });
  } catch (e) {
    console.error("[oauth/token/fresh] error:", e instanceof Error ? e.message : "refresh failed");
    return Response.json({ error: "Refresh failed. Reconnect this account." }, { status: 401, headers: corsHeaders() });
  }
});
router.post("/token/save", async (request, env) => {
  const userId = await sessionUserId(request, env);
  if (!userId) return Response.json({ error: "Sign in required" }, { status: 401, headers: corsHeaders() });
  return Response.json({ error: "Tokens are saved by the callback" }, { status: 405, headers: corsHeaders() });
});
async function exchangeCodeForToken(provider, code, redirectUri, env, verifier) {
  const tokenUrl = TOKEN_URLS[provider];
  if (!tokenUrl) {
    throw new Error(`Unsupported provider: ${provider}`);
  }
  const { clientId, clientSecret } = clientCreds(provider, env);
  if (!clientId || !clientSecret) {
    throw new Error(`Missing ${provider} client credentials`);
  }
  const headers = { Accept: "application/json" };
  let body;
  if (provider === "notion") {
    headers["Content-Type"] = "application/json";
    headers.Authorization = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
    body = JSON.stringify({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
  } else {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    const params = new URLSearchParams();
    params.set("code", code);
    params.set("redirect_uri", redirectUri);
    params.set("grant_type", "authorization_code");
    if (verifier) params.set("code_verifier", verifier);
    if (provider === "spotify") {
      headers.Authorization = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
    } else if (provider === "twitter") {
      headers.Authorization = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
      params.set("client_id", clientId);
    } else {
      params.set("client_id", clientId);
      params.set("client_secret", clientSecret);
    }
    body = params.toString();
  }
  const response = await fetch(tokenUrl, { method: "POST", headers, body });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status} - ${data.error_description || data.error || "provider refused the code"}`);
  }
  if (provider === "slack" && data.ok === false) {
    throw new Error(`Slack refused the login: ${data.error || "unknown error"}`);
  }
  if (data.access_token) {
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token || null,
      expires_in: data.expires_in ?? null,
      token_type: data.token_type || "Bearer",
      scope: data.scope || getScopes(provider),
      id_token: data.id_token || null
    };
  }
  throw new Error((data.error_description || data.error || "Invalid token response") + " | sent=" + redirectUri);
}
__name(exchangeCodeForToken, "exchangeCodeForToken");
__name2(exchangeCodeForToken, "exchangeCodeForToken");
__name22(exchangeCodeForToken, "exchangeCodeForToken");
function getScopes(provider, email) {
  const scopes = {
    google: email === "chris@ceogps.com" ? "openid email profile https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly" : "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.readonly",
    microsoft: "openid email profile offline_access User.Read Mail.ReadWrite Calendars.Read",
    github: "repo user:email",
    slack: "chat:write,channels:read,users:read",
    facebook: "public_profile,email",
    instagram: "instagram_content_publish",
    twitter: "tweet.read tweet.write users.read offline.access",
    linkedin: "openid profile email w_member_social",
    spotify: "user-read-private user-read-email playlist-read-private",
    discord: DISCORD_SCOPES,
    notion: "read"
  };
  return scopes[provider] || "openid email profile";
}
__name(getScopes, "getScopes");
__name2(getScopes, "getScopes");
__name22(getScopes, "getScopes");
var router2 = t();
router2.post("/invoke", async (request, env) => {
  try {
    const body = await request.json();
    const { prompt, systemPrompt, model = "auto", messages } = body;
    if (!prompt && !messages) {
      return Response.json({ error: "Missing prompt or messages" }, {
        status: 400,
        headers: corsHeaders()
      });
    }
    const responseText = typeof prompt === "string" ? `Mock response to: ${prompt.slice(0, 100)}...` : "Mock response to messages";
    return Response.json({
      text: responseText,
      model_used: model,
      usage: { prompt_tokens: 100, completion_tokens: 50 }
    }, { headers: corsHeaders() });
  } catch (e) {
    return Response.json({ error: "Invalid request" }, {
      status: 400,
      headers: corsHeaders()
    });
  }
});
router2.get("/preference", async (request, env) => {
  const userId = request.userId;
  return Response.json({
    preferred: "auto"
  }, { headers: corsHeaders() });
});
router2.post("/preference", async (request, env) => {
  const body = await request.json().catch(() => ({}));
  const { model } = body;
  if (!model) {
    return Response.json({ error: "Missing model" }, {
      status: 400,
      headers: corsHeaders()
    });
  }
  return Response.json({ success: true, model }, { headers: corsHeaders() });
});
var router3 = t();
router3.get("/health", async (request, env) => {
  const userId = await sessionUserId(request, env);
  if (!userId) return Response.json({ error: "Sign in required" }, { status: 401, headers: corsHeaders() });
  const wanted = new Set((new URL(request.url).searchParams.get("ids") || "").split(",").map((item) => item.trim()).filter(Boolean));
  let accounts = [];
  if (supabaseUrl(env) && supabaseKey(env)) {
    const listed = await fetch(`${supabaseUrl(env)}/rest/v1/integrations_credentials?user_id=eq.${encodeURIComponent(userId)}&status=eq.on&select=oauth_provider,email,integration_name`, {
      headers: serviceHeaders(env)
    });
    if (listed.ok) accounts = await listed.json();
  }
  const providers = ["google", "discord", "facebook", "spotify", "nylas"];
  const integrations = providers.filter((provider) => !wanted.size || wanted.has(provider)).map((provider) => {
    const rows = (Array.isArray(accounts) ? accounts : []).filter((row) => (row.oauth_provider || row.integration_name) === provider);
    const emails = rows.map((row) => row.email || "").filter(Boolean);
    const clientSet = provider === "google" ? Boolean(env.GOOGLE_CLIENT_ID) : provider === "nylas" ? Boolean(env.NYLAS_API_KEY) : Boolean(env[`${provider.toUpperCase()}_CLIENT_ID`]);
    return {
      id: provider,
      kind: provider === "nylas" ? "both" : "oauth",
      status: emails.length ? "connected" : clientSet ? "not_configured" : "not_configured",
      reason: emails.length ? "Connected" : "Not connected",
      source: emails.length ? "worker-secret" : null,
      oauth: { provider, client_configured: clientSet, accounts: emails.length, expired: 0, emails }
    };
  });
  return Response.json({ integrations }, { headers: corsHeaders() });
});
router3.get("/credential", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json({}, { headers: corsHeaders() });
});
router3.post("/credential", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  const body = await request.json().catch(() => ({}));
  return Response.json({ success: true, id: crypto.randomUUID() }, { headers: corsHeaders() });
});
router3.delete("/credential", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  const url = new URL(request.url);
  const integrationName = url.searchParams.get("integration_name");
  const label = url.searchParams.get("label");
  return Response.json({ success: true }, { headers: corsHeaders() });
});
var router4 = t();
router4.get("/events", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") || "200");
  const source = url.searchParams.get("source");
  const unread = url.searchParams.get("unread");
  return Response.json({
    events: [],
    total: 0,
    has_more: false
  }, { headers: corsHeaders() });
});
router4.post("/events/mark-all-read", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  const body = await request.json().catch(() => ({}));
  return Response.json({ marked: 0 }, { headers: corsHeaders() });
});
router4.post("/events/:id/read", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json({ success: true }, { headers: corsHeaders() });
});
router4.post("/events/:id/dismiss", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json({ success: true }, { headers: corsHeaders() });
});
var router5 = t();
router5.get("/kv", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  const url = new URL(request.url);
  const prefix = url.searchParams.get("prefix");
  return Response.json({ keys: [] }, { headers: corsHeaders() });
});
router5.get("/kv/:key", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  const key = request.params.key;
  return Response.json({ value: null }, { headers: corsHeaders() });
});
router5.post("/kv/:key", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  const key = request.params.key;
  const body = await request.json().catch(() => ({}));
  const { value } = body;
  return Response.json({ success: true }, { headers: corsHeaders() });
});
router5.delete("/kv/:key", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  const key = request.params.key;
  return Response.json({ success: true }, { headers: corsHeaders() });
});
var router6 = t();
router6.get("/status", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json({ locked: true, initialized: false }, { headers: corsHeaders() });
});
router6.post("/init", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json({ success: true }, { headers: corsHeaders() });
});
router6.post("/unlock", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json({ success: true }, { headers: corsHeaders() });
});
router6.post("/lock", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json({ success: true }, { headers: corsHeaders() });
});
router6.post("/change-password", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json({ success: true }, { headers: corsHeaders() });
});
router6.get("/items", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json({ items: [] }, { headers: corsHeaders() });
});
router6.post("/export", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json({ data: "{}" }, { headers: corsHeaders() });
});
router6.post("/purge", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json({ success: true }, { headers: corsHeaders() });
});
var router7 = t();
router7.get("/accounts", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json([], { headers: corsHeaders() });
});
router7.post("/send", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json({ success: true, id: crypto.randomUUID() }, { headers: corsHeaders() });
});
router7.get("/campaigns", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json([], { headers: corsHeaders() });
});
var router8 = t();
router8.get("/summary", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json({
    revenue: 0,
    customers: 0,
    subscriptions: 0,
    charges: []
  }, { headers: corsHeaders() });
});
var router9 = t();
router9.get("/user", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json({
    login: "",
    name: "",
    repos: 0,
    followers: 0
  }, { headers: corsHeaders() });
});
var router10 = t();
router10.get("/workspace", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json({
    name: "",
    channels: 0,
    members: 0
  }, { headers: corsHeaders() });
});
var router11 = t();
router11.get("/me", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json({
    name: "",
    workspace: ""
  }, { headers: corsHeaders() });
});
var router12 = t();
router12.get("/events", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json([], { headers: corsHeaders() });
});
var router13 = t();
router13.get("/me", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json({
    display_name: "",
    followers: { total: 0 },
    images: []
  }, { headers: corsHeaders() });
});
var router14 = t();
router14.get("/channel", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json({
    title: "",
    subscribers: 0,
    videos: 0
  }, { headers: corsHeaders() });
});
var router15 = t();
router15.get("/summary", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json({
    zones: 0,
    workers: 0,
    requests: 0
  }, { headers: corsHeaders() });
});
var router16 = t();
router16.post("/connect", async (request, env) => {
  const userId = await sessionUserId(request, env);
  if (!userId) return Response.json({ error: "Sign in required" }, { status: 401, headers: corsHeaders() });
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  if (!email.endsWith("@icloud.com")) {
    return Response.json({ error: "Nylas connect is for iCloud mail." }, { status: 400, headers: corsHeaders() });
  }
  const apiKey = env.NYLAS_API_KEY || "";
  const clientId = await nylasClientId(env);
  if (!apiKey || !clientId) {
    return Response.json({ error: "NYLAS_API_KEY and NYLAS_CLIENT_ID are required" }, { status: 500, headers: corsHeaders() });
  }
  const state = issueState(body.origin);
  const pending = await storePending(env, {
    user_id: userId,
    integration_name: "nylas",
    email,
    label: email,
    oauth_provider: "nylas",
    status: "pending",
    oauth_state: state,
    oauth_redirect_uri: NYLAS_CALLBACK,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  });
  if (!pending) return Response.json({ error: "Could not store OAuth state" }, { status: 500, headers: corsHeaders() });
  const response = await fetch("https://api.us.nylas.com/v3/connect/auth", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      redirect_uri: NYLAS_CALLBACK,
      provider: "icloud",
      login_hint: email,
      state,
      access_type: "offline",
      response_type: "code"
    })
  });
  const data = await response.json().catch(() => ({}));
  const next = data?.data?.url || data?.url || "";
  if (!response.ok || !next) {
    return Response.json({ error: "Nylas did not start iCloud auth" }, { status: 502, headers: corsHeaders() });
  }
  return Response.json({ url: next }, { headers: corsHeaders() });
});
router16.get("/callback", async (request, env) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const error = url.searchParams.get("error") || "";
  const origin = originFromState(state);
  if (error || !code) {
    return Response.redirect(`${origin}/panel/integrations?oauth_error=${encodeURIComponent(error || "Nylas did not return a code")}`, 302);
  }
  const pending = await claimState(env, state, "nylas");
  if (!pending) {
    return Response.redirect(`${origin}/panel/integrations?oauth_error=${encodeURIComponent("Invalid or expired OAuth state")}`, 302);
  }
  const apiKey = env.NYLAS_API_KEY || "";
  const clientId = await nylasClientId(env);
  const exchanged = await fetch("https://api.us.nylas.com/v3/connect/token", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: apiKey,
      grant_type: "authorization_code",
      code,
      redirect_uri: NYLAS_CALLBACK
    })
  });
  const token = await exchanged.json().catch(() => ({}));
  if (!exchanged.ok || !(token.grant_id || token.access_token)) {
    return Response.redirect(`${origin}/panel/integrations?oauth_error=${encodeURIComponent("Nylas token exchange failed")}`, 302);
  }
  await fetch(`${supabaseUrl(env)}/rest/v1/integrations_credentials?id=eq.${encodeURIComponent(pending.id)}`, {
    method: "PATCH",
    headers: serviceHeaders(env, { "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify({
      status: "on",
      email: token.email || pending.email,
      oauth_access_token: token.access_token || "",
      oauth_refresh_token: token.grant_id ? `grant:${token.grant_id}` : null,
      oauth_state: null,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    })
  });
  return Response.redirect(`${origin}/panel/integrations?connected=nylas`, 302);
});
var router17 = t();
router17.post("/post", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json({ success: true, id: crypto.randomUUID() }, { headers: corsHeaders() });
});
router17.post("/schedule", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json({ success: true, id: crypto.randomUUID() }, { headers: corsHeaders() });
});
var router18 = t();
router18.get("/", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json([], { headers: corsHeaders() });
});
var router19 = t();
router19.get("/", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json([], { headers: corsHeaders() });
});
router19.post("/run", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json({ success: true, runId: crypto.randomUUID() }, { headers: corsHeaders() });
});
router19.get("/status", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json({ running: [] }, { headers: corsHeaders() });
});
var router20 = t();
router20.get("/", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") || "500");
  return Response.json([], { headers: corsHeaders() });
});
router20.post("/reorder", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json({ success: true }, { headers: corsHeaders() });
});
var router21 = t();
router21.get("/balances", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json({
    netWorth: 0,
    assets: 0,
    liabilities: 0
  }, { headers: corsHeaders() });
});
router21.get("/market", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json({
    stocks: [],
    crypto: []
  }, { headers: corsHeaders() });
});
router21.get("/news", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json([], { headers: corsHeaders() });
});
var router22 = t();
router22.get("/", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json([], { headers: corsHeaders() });
});
var router23 = t();
router23.get("/fetch", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json({ html: "", title: "" }, { headers: corsHeaders() });
});
router23.get("/search", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json({ results: [] }, { headers: corsHeaders() });
});
var router24 = t();
router24.get("/", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json({ results: [] }, { headers: corsHeaders() });
});
var router25 = t();
function json(data, status = 200, origin) {
  return Response.json(data, {
    status,
    headers: corsHeaders(origin || "*")
  });
}
__name(json, "json");
__name2(json, "json");
__name22(json, "json");
function extFromFile(file) {
  const fromName = file.name.includes(".") ? file.name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  if (fromName) return fromName.slice(0, 12);
  const mime = (file.type || "").toLowerCase();
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "mp4";
  if (mime === "application/pdf") return "pdf";
  return "bin";
}
__name(extFromFile, "extFromFile");
__name2(extFromFile, "extFromFile");
__name22(extFromFile, "extFromFile");
function userIdFromRequest(request) {
  return request.userId ? String(request.userId).slice(0, 128) : "";
}
__name(userIdFromRequest, "userIdFromRequest");
__name2(userIdFromRequest, "userIdFromRequest");
__name22(userIdFromRequest, "userIdFromRequest");
router25.post("/", async (request, env) => {
  const origin = request.headers.get("Origin");
  const userId = userIdFromRequest(request);
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return json({ error: "Invalid multipart body" }, 400, origin);
  }
  const file = formData.get("file");
  if (!file || typeof file.arrayBuffer !== "function") {
    return json({ error: "No file provided" }, 400, origin);
  }
  if (!env.LIFEOS_STORAGE) {
    return json(
      { error: "LIFEOS_STORAGE R2 binding is not configured on this worker" },
      503,
      origin
    );
  }
  const url = new URL(request.url);
  const type = (url.searchParams.get("type") || "files").replace(/[^a-z0-9_-]/gi, "") || "files";
  const id = crypto.randomUUID();
  const key = `${type}/${userId}/${id}.${extFromFile(file)}`;
  await env.LIFEOS_STORAGE.put(key, await file.arrayBuffer(), {
    httpMetadata: {
      contentType: file.type || "application/octet-stream",
      contentDisposition: `inline; filename="${(file.name || "file").replace(/"/g, "")}"`
    },
    customMetadata: {
      originalName: file.name || "",
      uploadedBy: userId,
      type
    }
  });
  const publicUrl = new URL(request.url);
  publicUrl.pathname = `/api/upload/object/${key}`;
  publicUrl.search = "";
  return json(
    {
      url: publicUrl.toString(),
      file_url: publicUrl.toString(),
      id,
      key
    },
    200,
    origin
  );
});
router25.get("/object/*", async (request, env) => {
  const origin = request.headers.get("Origin");
  if (!env.LIFEOS_STORAGE) {
    return json({ error: "LIFEOS_STORAGE R2 binding is not configured" }, 503, origin);
  }
  const url = new URL(request.url);
  const marker = "/object/";
  const idx = url.pathname.indexOf(marker);
  const key = idx >= 0 ? decodeURIComponent(url.pathname.slice(idx + marker.length)) : "";
  if (!key || key.includes("..")) {
    return json({ error: "Missing object key" }, 400, origin);
  }
  const obj = await env.LIFEOS_STORAGE.get(key);
  if (!obj) {
    return json({ error: "Not found" }, 404, origin);
  }
  const headers = new Headers(corsHeaders(origin || "*"));
  headers.set("Content-Type", obj.httpMetadata?.contentType || "application/octet-stream");
  if (obj.httpMetadata?.contentDisposition) {
    headers.set("Content-Disposition", obj.httpMetadata.contentDisposition);
  }
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  if (obj.httpEtag) headers.set("ETag", obj.httpEtag);
  return new Response(obj.body, { status: 200, headers });
});
router25.get("/", async (request, env) => {
  const origin = request.headers.get("Origin");
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  return json(
    {
      ok: true,
      storage: Boolean(env.LIFEOS_STORAGE),
      type: type || "files",
      usage: "POST multipart field `file` to /api/upload?type=<kind>"
    },
    200,
    origin
  );
});
var router26 = t();
router26.get("/feed", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") || "8");
  return Response.json({ data: [], paging: {} }, { headers: corsHeaders() });
});
router26.get("/status", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json({ connected: false }, { headers: corsHeaders() });
});
router26.get("/instagram/feed", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") || "10");
  return Response.json({ data: [], paging: {} }, { headers: corsHeaders() });
});
var router27 = t();
router27.get("/timeline", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  const url = new URL(request.url);
  const handle = url.searchParams.get("handle");
  const max = parseInt(url.searchParams.get("max") || "10");
  return Response.json({ data: [], meta: {} }, { headers: corsHeaders() });
});
router27.get("/user", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  const url = new URL(request.url);
  const handle = url.searchParams.get("handle");
  return Response.json({
    username: handle,
    name: "",
    followers: 0,
    following: 0
  }, { headers: corsHeaders() });
});
var router28 = t();
router28.post("/generate", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json({
    trackId: crypto.randomUUID(),
    status: "generating"
  }, { headers: corsHeaders() });
});
router28.get("/playlists", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json([], { headers: corsHeaders() });
});
router28.post("/polish", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json({
    trackId: crypto.randomUUID(),
    status: "polishing"
  }, { headers: corsHeaders() });
});
var router29 = t();
router29.get("/", async (request, env) => {
  const userId = request.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders()
    });
  }
  return Response.json([], { headers: corsHeaders() });
});
var router30 = t();
router30.get("/", async (request, env) => {
  return Response.json({
    supabaseUrl: supabaseUrl(env) || "https://mhvcdstgkyplhzjptgfr.supabase.co",
    supabaseAnonKey: env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_SUPABASE_PUBLISHABLE_KEY || ""
  }, { headers: corsHeaders() });
});
var router31 = t();
function mount(prefix, sub) {
  return (request, env, ctx) => {
    const url = new URL(request.url);
    if (url.pathname !== prefix && !url.pathname.startsWith(prefix + "/")) return void 0;
    url.pathname = url.pathname.slice(prefix.length) || "/";
    return sub.fetch(new Request(url.toString(), request), env, ctx);
  };
}
__name(mount, "mount");
__name2(mount, "mount");
__name22(mount, "mount");
router31.get("/health", () => withCors(new Response(JSON.stringify({ status: "ok", service: "lifeos1" }), {
  headers: { "Content-Type": "application/json" }
})));
router31.get("/test", () => withCors(new Response(JSON.stringify({ message: "test works" }), {
  headers: { "Content-Type": "application/json" }
})));
router31.options("*", (request) => new Response(null, {
  headers: corsHeaders(request.headers.get("Origin") || "*")
}));
router31.all("/api/config*", mount("/api/config", router30));
router31.all("/api/oauth/*", mount("/api/oauth", router));
router31.all("/api/llm/*", mount("/api/llm", router2));
router31.all("/api/integrations/*", mount("/api/integrations", router3));
router31.all("/api/activity/*", mount("/api/activity", router4));
router31.all("/api/kv*", mount("/api", router5));
router31.all("/api/vault/*", mount("/api/vault", router6));
router31.all("/api/email/*", mount("/api/email", router7));
router31.all("/api/stripe/*", mount("/api/stripe", router8));
router31.all("/api/github/*", mount("/api/github", router9));
router31.all("/api/slack/*", mount("/api/slack", router10));
router31.all("/api/notion/*", mount("/api/notion", router11));
router31.all("/api/calendar/*", mount("/api/calendar", router12));
router31.all("/api/spotify/*", mount("/api/spotify", router13));
router31.all("/api/youtube/*", mount("/api/youtube", router14));
router31.all("/api/cloudflare/*", mount("/api/cloudflare", router15));
router31.all("/api/nylas/*", mount("/api/nylas", router16));
router31.all("/api/social/*", mount("/api/social", router17));
router31.all("/api/contacts/*", mount("/api/contacts", router18));
router31.all("/api/agents/*", mount("/api/agents", router19));
router31.all("/api/tasks*", mount("/api/tasks", router20));
router31.all("/api/finance/*", mount("/api/finance", router21));
router31.all("/api/projects/*", mount("/api/projects", router22));
router31.all("/api/browse*", mount("/api/browse", router23));
router31.all("/api/search*", mount("/api/search", router24));
router31.all("/api/upload*", mount("/api/upload", router25));
router31.all("/api/meta/*", mount("/api/meta", router26));
router31.all("/api/x/*", mount("/api/x", router27));
router31.all("/api/music/*", mount("/api/music", router28));
router31.all("/api/tags*", mount("/api/tags", router29));
router31.all("*", () => withCors(new Response(JSON.stringify({ error: "Not found" }), {
  status: 404,
  headers: { "Content-Type": "application/json" }
})));
var working_worker_default = {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || void 0;
    try {
      if (!isPublicApi(request) && !isBoardOauth(request)) {
        const denied = await requireUser(request, env);
        if (denied) return withCors(denied, origin);
      }
      return await router31.fetch(request, env, ctx);
    } catch (err) {
      return withCors(new Response(JSON.stringify({ error: "Internal error", detail: String(err?.message || err) }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }), origin);
    }
  }
};

// worker/index.ts
function allowedOrigins(env) {
  const raw = String(env.CORS_ORIGINS || "https://lifeos.ceogps.com,https://lifeos1.ceogps.com");
  return new Set(raw.split(",").map((item) => item.trim()).filter(Boolean));
}
__name(allowedOrigins, "allowedOrigins");
function returnOrigin(state, allowed) {
  const fallback = allowed.has("https://lifeos.ceogps.com") ? "https://lifeos.ceogps.com" : [...allowed][0] || "https://lifeos.ceogps.com";
  const bar = state.indexOf("|");
  if (bar < 0) return fallback;
  try {
    const origin = decodeURIComponent(state.slice(bar + 1));
    if (allowed.has(origin)) return origin;
  } catch {
  }
  return fallback;
}
__name(returnOrigin, "returnOrigin");
var index_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const allowed = allowedOrigins(env);
    let inbound = request;
    if (url.pathname === "/oauth/callback") {
      const rewritten = new URL(request.url);
      rewritten.pathname = "/api/oauth/callback";
      inbound = new Request(rewritten, request);
    }
    const response = await working_worker_default.fetch(inbound, env, ctx);
    if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
      return cors(new Response(null, { status: 204 }), request, allowed);
    }
    if (url.pathname.startsWith("/api/")) return cors(response, request, allowed);
    return response;
  }
};
function cors(response, request, allowed) {
  const origin = request.headers.get("Origin") || "";
  if (!allowed.has(origin)) return response;
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-User-Id, X-Lifeos-Board");
  headers.set("Vary", "Origin");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
__name(cors, "cors");
export {
  index_default as default
};
