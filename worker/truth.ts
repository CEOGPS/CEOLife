/** Supabase-backed checks, activity, mail probes, briefs, and projects. Service role stays on the worker. */

type Env = Record<string, unknown>;
type User = { id: string; email: string };

const OWNERS = new Set(["chris@ceogps.com", "chrisgr33ninc@gmail.com", "cagednreality@icloud.com"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TOKEN_URLS: Record<string, string> = {
  google: "https://oauth2.googleapis.com/token",
  microsoft: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  github: "https://github.com/login/oauth/access_token",
  slack: "https://slack.com/api/oauth.v2.access",
  facebook: "https://graph.facebook.com/v26.0/oauth/access_token",
  twitter: "https://api.twitter.com/2/oauth2/token",
  linkedin: "https://www.linkedin.com/oauth/v2/accessToken",
  spotify: "https://accounts.spotify.com/api/token",
  discord: "https://discord.com/api/oauth2/token",
  notion: "https://api.notion.com/v1/oauth/token",
};

function supabaseUrl(env: Env) {
  return String(env.SUPABASE_URL || env.SUPABASE_PROJECT_URL || env.NEXT_PUBLIC_SUPABASE_URL || "https://mhvcdstgkyplhzjptgfr.supabase.co");
}

function serviceKey(env: Env) {
  return String(
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.SUPABASE_SERVICE_KEY ||
    env.SUPABASE_SECRET_KEY ||
    env.VITE_SUPABASE_SECRET_KEY ||
    env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_SECRET_KEY ||
    "",
  );
}

function clip(value: unknown, max = 400) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function safeError(error: unknown) {
  return clip(error instanceof Error ? error.message : error, 300).replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

async function rest(env: Env, path: string, init?: RequestInit) {
  const key = serviceKey(env);
  if (!key) throw new Error("Supabase service role is not on the worker.");
  const headers = new Headers(init?.headers);
  headers.set("apikey", key);
  headers.set("Authorization", `Bearer ${key}`);
  return fetch(`${supabaseUrl(env)}/rest/v1/${path}`, { ...init, headers });
}

async function session(request: Request, env: Env): Promise<User | null> {
  const header = request.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const key = serviceKey(env);
  if (!token || !key) return null;
  const response = await fetch(`${supabaseUrl(env)}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  const user = await response.json() as { id?: string; email?: string };
  if (!user.id) return null;
  return { id: user.id, email: String(user.email || "").toLowerCase() };
}

function ownerScope(user: User) {
  if (!OWNERS.has(user.email)) return `user_id=eq.${encodeURIComponent(user.id)}`;
  return `or=(user_id.eq.${encodeURIComponent(user.id)},user_id.eq.lifeos-owner)`;
}

async function logActivity(env: Env, userId: string, source: string, kind: string, title: string, body: string) {
  await rest(env, "activity_feed", {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ user_id: userId, source: clip(source, 80), kind: clip(kind, 40), title: clip(title, 180), body: clip(body, 2000) }),
  }).catch(() => undefined);
}

async function saveCheck(env: Env, userId: string, subject: string, state: "green" | "red", detail: string, provider: string) {
  const response = await rest(env, "integration_checks?on_conflict=user_id,subject", {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      user_id: userId,
      subject: clip(subject, 180),
      state,
      detail: clip(detail, 400),
      provider: clip(provider, 40),
      checked_at: new Date().toISOString(),
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(clip(text, 240) || `Check was not saved (HTTP ${response.status}).`);
  }
}

type Cred = {
  id: string;
  user_id: string;
  oauth_provider: string;
  email: string;
  oauth_access_token: string;
  oauth_refresh_token: string;
  oauth_expires_at: string | null;
};

function clientCreds(provider: string, env: Env) {
  if (provider === "google") {
    return {
      clientId: String(env.GOOGLE_CLIENT_ID || env.GOOGLE_OAUTH_CLIENT_ID || "").trim(),
      clientSecret: String(env.GOOGLE_CLIENT_SECRET || env.GOOGLE_OAUTH_CLIENT_SECRET || env.GOOGLE_SECRET || "").trim(),
    };
  }
  const key = provider.toUpperCase();
  return { clientId: String(env[`${key}_CLIENT_ID`] || "").trim(), clientSecret: String(env[`${key}_CLIENT_SECRET`] || "").trim() };
}

async function refreshAccess(provider: string, refreshToken: string, env: Env) {
  const tokenUrl = TOKEN_URLS[provider];
  const { clientId, clientSecret } = clientCreds(provider, env);
  if (!tokenUrl || !clientId || !clientSecret) throw new Error(`Missing ${provider} client credentials on the worker.`);
  if (provider === "notion") {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ grant_type: "refresh_token", refresh_token: refreshToken }),
    });
    const data = await response.json().catch(() => ({})) as { access_token?: string; refresh_token?: string; expires_in?: number; error_description?: string; error?: string };
    if (!response.ok || !data.access_token) throw new Error(data.error_description || data.error || `Refresh failed (HTTP ${response.status}).`);
    return data;
  }
  const params = new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken });
  const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" };
  if (provider === "spotify" || provider === "twitter") headers.Authorization = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
  else {
    params.set("client_id", clientId);
    params.set("client_secret", clientSecret);
  }
  const response = await fetch(tokenUrl, { method: "POST", headers, body: params.toString() });
  const data = await response.json().catch(() => ({})) as { access_token?: string; refresh_token?: string; expires_in?: number; error_description?: string; error?: string; ok?: boolean };
  if (provider === "slack" && data.ok === false) throw new Error(data.error || "Slack refused the refresh");
  if (!response.ok || !data.access_token) throw new Error(data.error_description || data.error || `Refresh failed (HTTP ${response.status}).`);
  return data;
}

async function proof(token: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(token));
  return [...new Uint8Array(sig)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function probeToken(provider: string, token: string, env: Env) {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}`, Accept: "application/json" };
  const targets: Record<string, string> = {
    google: "https://www.googleapis.com/oauth2/v2/userinfo",
    github: "https://api.github.com/user",
    facebook: "https://graph.facebook.com/v26.0/me?fields=id,name",
    spotify: "https://api.spotify.com/v1/me",
    discord: "https://discord.com/api/users/@me",
    microsoft: "https://graph.microsoft.com/v1.0/me",
    linkedin: "https://api.linkedin.com/v2/userinfo",
    twitter: "https://api.twitter.com/2/users/me",
    notion: "https://api.notion.com/v1/users/me",
    slack: "https://slack.com/api/auth.test",
  };
  let url = targets[provider];
  if (!url) return { ok: false, detail: `${provider} has no probe.` };
  if (provider === "facebook") {
    const secret = String(env.FACEBOOK_CLIENT_SECRET || env.META_APP_SECRET || "").trim();
    if (!secret) return { ok: false, detail: "Facebook Graph requires appsecret_proof and META_APP_SECRET is not on the worker." };
    url += `&appsecret_proof=${await proof(token, secret)}`;
  }
  if (provider === "github") headers["User-Agent"] = "LifeOS";
  if (provider === "notion") headers["Notion-Version"] = "2022-06-28";
  const response = await fetch(url, { headers });
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok || body.ok === false) {
    const error = body.error;
    const message = typeof error === "string" ? error : (error && typeof error === "object" && "message" in error ? String((error as { message?: string }).message || "") : "");
    return { ok: false, detail: `HTTP ${response.status}: ${message || String(body.error_description || body.message || `${provider} refused the token.`)}` };
  }
  const who = String(body.email || body.login || body.name || body.display_name || body.id || "the account");
  return { ok: true, detail: `${provider} answered for ${who}.` };
}

async function probeCredential(env: Env, row: Cred) {
  const provider = String(row.oauth_provider || "").toLowerCase();
  const subject = `oauth:${provider}:${row.email || row.id}`;
  let token = row.oauth_access_token || "";
  const expires = row.oauth_expires_at ? Date.parse(row.oauth_expires_at) : 0;
  if (expires && expires - Date.now() < 60_000 && row.oauth_refresh_token) {
    try {
      const next = await refreshAccess(provider, row.oauth_refresh_token, env);
      token = next.access_token || token;
      await rest(env, `integrations_credentials?id=eq.${encodeURIComponent(row.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({
          oauth_access_token: next.access_token,
          oauth_refresh_token: next.refresh_token || row.oauth_refresh_token,
          oauth_expires_at: next.expires_in ? new Date(Date.now() + next.expires_in * 1000).toISOString() : row.oauth_expires_at,
          updated_at: new Date().toISOString(),
        }),
      });
    } catch (error) {
      const detail = safeError(error);
      await saveCheck(env, row.user_id, subject, "red", detail, provider);
      await logActivity(env, row.user_id, "probe", "error", `${provider} refresh failed`, detail);
      return { provider, email: row.email || "", state: "red" as const, detail };
    }
  }
  if (!token) {
    const detail = `${provider} is marked on and has no access token.`;
    await saveCheck(env, row.user_id, subject, "red", detail, provider);
    await logActivity(env, row.user_id, "probe", "error", `${provider} has no token`, detail);
    return { provider, email: row.email || "", state: "red" as const, detail };
  }
  try {
    let result = await probeToken(provider, token, env);
    if (!result.ok && row.oauth_refresh_token && /401|expired|invalid/i.test(result.detail)) {
      try {
        const next = await refreshAccess(provider, row.oauth_refresh_token, env);
        await rest(env, `integrations_credentials?id=eq.${encodeURIComponent(row.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify({
            oauth_access_token: next.access_token,
            oauth_refresh_token: next.refresh_token || row.oauth_refresh_token,
            oauth_expires_at: next.expires_in ? new Date(Date.now() + next.expires_in * 1000).toISOString() : null,
            updated_at: new Date().toISOString(),
          }),
        });
        result = await probeToken(provider, next.access_token || "", env);
      } catch (error) {
        result = { ok: false, detail: `${result.detail} Refresh: ${safeError(error)}` };
      }
    }
    const state = result.ok ? "green" as const : "red" as const;
    await saveCheck(env, row.user_id, subject, state, result.detail, provider);
    await logActivity(env, row.user_id, "probe", state, `${provider} ${state}`, result.detail);
    return { provider, email: row.email || "", state, detail: result.detail };
  } catch (error) {
    const detail = safeError(error);
    await saveCheck(env, row.user_id, subject, "red", detail, provider);
    await logActivity(env, row.user_id, "probe", "error", `${provider} probe failed`, detail);
    return { provider, email: row.email || "", state: "red" as const, detail };
  }
}

export async function probeGreen(env: Env, user?: User) {
  const filter = user ? `${ownerScope(user)}&status=eq.on` : "status=eq.on";
  const listed = await rest(env, `integrations_credentials?${filter}&select=id,user_id,oauth_provider,email,oauth_access_token,oauth_refresh_token,oauth_expires_at`);
  if (!listed.ok) throw new Error(`Credentials could not be read (HTTP ${listed.status}).`);
  const rows = await listed.json() as Cred[];
  const out = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    if (row.oauth_provider) out.push(await probeCredential(env, row));
  }
  return out;
}

async function readJson(url: string, headers?: Record<string, string>) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(12000) });
  const body = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, body };
}

export async function probeFeatures(env: Env) {
  const listed = await rest(env, "integrations_credentials?status=eq.on&select=id,user_id,oauth_provider,email,oauth_access_token,oauth_refresh_token,oauth_expires_at");
  if (!listed.ok) throw new Error(`Credentials could not be read (HTTP ${listed.status}).`);
  const rows = await listed.json() as Cred[];
  const creds = Array.isArray(rows) ? rows : [];
  const userId = creds.find((row) => row.user_id)?.user_id || "lifeos-owner";
  const out: { feature: string; ok: boolean; detail: string }[] = [];
  const note = async (feature: string, ok: boolean, detail: string) => {
    const text = clip(detail, 400);
    out.push({ feature, ok, detail: text });
    await logActivity(env, userId, feature, ok ? "action" : "error", `${feature} probe`, text);
  };
  const tokenFor = (provider: string) => creds.find((row) => String(row.oauth_provider || "").toLowerCase() === provider && row.oauth_access_token)?.oauth_access_token || "";

  const github = tokenFor("github");
  if (!github) await note("creator", false, "GitHub is not connected.");
  else {
    try {
      const response = await readJson("https://api.github.com/user/repos?per_page=3&sort=updated", { Authorization: `Bearer ${github}`, "User-Agent": "LifeOS", Accept: "application/vnd.github+json" });
      const body = response.body as { message?: string } | { full_name?: string }[] | null;
      if (!response.ok) await note("creator", false, `GitHub HTTP ${response.status}: ${body && !Array.isArray(body) && body.message ? body.message : "refused the token."}`);
      else {
        const names = Array.isArray(body) ? body.map((row) => row.full_name).filter(Boolean).slice(0, 3) : [];
        await note("creator", names.length > 0, names.length ? `GitHub repos: ${names.join(", ")}` : "GitHub returned no repositories.");
      }
    } catch (error) {
      await note("creator", false, safeError(error));
    }
  }

  const spotify = tokenFor("spotify");
  if (!spotify) await note("einstein", false, "Spotify is not connected.");
  else {
    try {
      const response = await readJson("https://api.spotify.com/v1/me/top/tracks?limit=5&time_range=short_term", { Authorization: `Bearer ${spotify}`, Accept: "application/json" });
      const body = response.body as { items?: { name?: string }[]; error?: { message?: string } } | null;
      if (!response.ok) await note("einstein", false, `Spotify refused the token. HTTP ${response.status}: ${body?.error?.message || "no message."}`);
      else {
        const names = (body?.items || []).map((row) => row.name).filter(Boolean).slice(0, 5);
        await note("einstein", names.length > 0, names.length ? `Spotify tracks: ${names.join(", ")}` : "Spotify returned no tracks.");
      }
    } catch (error) {
      await note("einstein", false, safeError(error));
    }
  }

  const facebook = tokenFor("facebook");
  if (!facebook) await note("social", false, "Facebook is not connected.");
  else {
    try {
      const secret = String(env.FACEBOOK_CLIENT_SECRET || env.META_APP_SECRET || "").trim();
      if (!secret) await note("social", false, "Facebook Graph requires appsecret_proof and META_APP_SECRET is not on the worker.");
      else {
        const proofValue = await proof(facebook, secret);
        const response = await readJson(`https://graph.facebook.com/v26.0/me/accounts?fields=id,name,fan_count&access_token=${encodeURIComponent(facebook)}&appsecret_proof=${proofValue}`);
        const body = response.body as { data?: { name?: string; fan_count?: number }[]; error?: { message?: string } } | null;
        if (!response.ok) await note("social", false, body?.error?.message || `Facebook HTTP ${response.status}.`);
        else {
          const pages = body?.data || [];
          await note("social", pages.length > 0, pages.length ? `Facebook pages: ${pages.map((row) => `${row.name || "page"} ${row.fan_count || 0}`).join(", ")}` : "Facebook returned no pages.");
        }
      }
    } catch (error) {
      await note("social", false, safeError(error));
    }
  }

  const emails = [...new Set(creds.map((row) => String(row.email || "").trim().toLowerCase()).filter((row) => row.includes("@")))];
  if (!emails.length) await note("omnisearch", false, "No connected email to reverse.");
  else {
    const found: string[] = [];
    const misses: string[] = [];
    for (const email of emails) {
      try {
        const response = await readJson(`https://api.github.com/search/users?q=${encodeURIComponent(`${email} in:email`)}&per_page=3`, { "User-Agent": "LifeOS", Accept: "application/vnd.github+json" });
        const body = response.body as { items?: { login?: string; html_url?: string }[]; message?: string } | null;
        if (!response.ok) misses.push(`${email} HTTP ${response.status}: ${body?.message || "GitHub refused the lookup."}`);
        else {
          const hits = (body?.items || []).filter((row) => row.html_url).map((row) => row.login).filter(Boolean);
          if (hits.length) found.push(`${email}: ${hits.join(", ")}`);
          else misses.push(`${email} returned no GitHub user`);
        }
      } catch (error) {
        misses.push(safeError(error));
      }
    }
    await note("omnisearch", found.length > 0, found.length ? `Reverse email hits: ${found.join(" | ")}` : `Reverse email: ${misses.join(" | ")}`);
  }

  try {
    const response = await readJson("https://api.duckduckgo.com/?q=%222025550100%22&format=json&no_redirect=1&no_html=1");
    const body = response.body as { RelatedTopics?: unknown[]; AbstractText?: string } | null;
    const topics = Array.isArray(body?.RelatedTopics) ? body.RelatedTopics.length : 0;
    const abstract = body?.AbstractText || "";
    if (!response.ok) await note("omnisearch", false, `Reverse phone HTTP ${response.status}.`);
    else if (topics || abstract) await note("omnisearch", true, `Reverse phone hits: ${topics} topics.${abstract ? ` ${abstract}` : ""}`);
    else await note("omnisearch", false, "Reverse phone returned no DuckDuckGo hit for 2025550100.");
  } catch (error) {
    await note("omnisearch", false, safeError(error));
  }

  try {
    const image = "https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png";
    const response = await readJson(`https://saucenao.com/search.php?output_type=2&numres=4&url=${encodeURIComponent(image)}`);
    const body = response.body as { results?: { header?: { similarity?: string }; data?: { ext_urls?: string[] } }[]; header?: { message?: string } } | null;
    if (!response.ok) await note("omnisearch", false, `Reverse image HTTP ${response.status}: ${body?.header?.message || "SauceNAO refused the lookup."}`);
    else {
      const hits = (body?.results || []).filter((row) => Number(row.header?.similarity || 0) >= 50 && row.data?.ext_urls?.[0]);
      await note("omnisearch", hits.length > 0, hits.length ? `Reverse image hits: ${hits.length} SauceNAO matches.` : `Reverse image returned no SauceNAO match. ${body?.header?.message || ""}`.trim());
    }
  } catch (error) {
    await note("omnisearch", false, safeError(error));
  }

  try {
    const response = await readJson("https://hn.algolia.com/api/v1/search?query=side%20hustle&tags=story&hitsPerPage=5");
    const body = response.body as { hits?: { title?: string }[] } | null;
    if (!response.ok) await note("lucid", false, `Lucid search HTTP ${response.status}.`);
    else {
      const titles = (body?.hits || []).map((row) => row.title).filter(Boolean).slice(0, 3);
      await note("lucid", titles.length > 0, titles.length ? `Lucid posts: ${titles.join(" | ")}` : "Lucid search returned no posts.");
    }
  } catch (error) {
    await note("lucid", false, safeError(error));
  }

  return out;
}

async function probeNylas(env: Env, user: User) {
  const key = String(env.NYLAS_API_KEY || "").trim();
  const statuses: { email: string; ok: boolean; text: string; count: number }[] = [];
  if (!key) {
    const detail = "Nylas key is not on the server.";
    await saveCheck(env, user.id, "mail:nylas", "red", detail, "nylas");
    await logActivity(env, user.id, "mail", "error", "Nylas key missing", detail);
    return [{ email: "", ok: false, text: detail, count: 0 }];
  }
  const listed = await fetch("https://api.us.nylas.com/v3/grants?limit=20", {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  const body = await listed.json().catch(() => ({})) as { data?: { id?: string; email?: string; grant_status?: string }[]; error?: { message?: string } };
  if (!listed.ok) {
    const detail = body.error?.message || `Nylas refused the key (HTTP ${listed.status}).`;
    await saveCheck(env, user.id, "mail:nylas", "red", detail, "nylas");
    await logActivity(env, user.id, "mail", "error", "Nylas list failed", detail);
    return [{ email: "", ok: false, text: detail, count: 0 }];
  }
  const grants = Array.isArray(body.data) ? body.data : [];
  if (!grants.length) {
    const detail = "Nylas accepted the key. No mailbox is connected.";
    await saveCheck(env, user.id, "mail:nylas", "red", detail, "nylas");
    await logActivity(env, user.id, "mail", "status", "No Nylas mailbox", detail);
    return [{ email: "", ok: false, text: detail, count: 0 }];
  }
  for (const grant of grants) {
    const email = String(grant.email || "");
    const subject = `mail:${email || grant.id || "grant"}`;
    if (grant.grant_status && grant.grant_status !== "valid") {
      const detail = `Nylas says ${grant.grant_status}. Reconnect this mailbox.`;
      await saveCheck(env, user.id, subject, "red", detail, "nylas");
      statuses.push({ email, ok: false, text: detail, count: 0 });
      continue;
    }
    if (!grant.id) {
      const detail = "Nylas returned this mailbox without an id.";
      await saveCheck(env, user.id, subject, "red", detail, "nylas");
      statuses.push({ email, ok: false, text: detail, count: 0 });
      continue;
    }
    const messages = await fetch(`https://api.us.nylas.com/v3/grants/${encodeURIComponent(grant.id)}/messages?limit=20`, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    });
    const mail = await messages.json().catch(() => ({})) as { data?: unknown[]; error?: { message?: string } };
    if (!messages.ok) {
      const detail = mail.error?.message || `Nylas mail failed (HTTP ${messages.status}).`;
      await saveCheck(env, user.id, subject, "red", detail, "nylas");
      statuses.push({ email, ok: false, text: detail, count: 0 });
      continue;
    }
    const count = Array.isArray(mail.data) ? mail.data.length : 0;
    const detail = count ? `${count} messages.` : "Connected. The inbox is empty.";
    await saveCheck(env, user.id, subject, "green", detail, "nylas");
    statuses.push({ email, ok: true, text: detail, count });
  }
  await logActivity(env, user.id, "mail", "status", "Nylas probe", statuses.map((row) => `${row.email || "Nylas"}: ${row.text}`).join(" | "));
  return statuses;
}

async function listChecks(env: Env, user: User) {
  const response = await rest(env, `integration_checks?${ownerScope(user)}&select=subject,state,detail,provider,checked_at&order=checked_at.desc&limit=200`);
  if (!response.ok) throw new Error(`Checks could not be read (HTTP ${response.status}).`);
  const rows = await response.json() as { subject: string; state: string; detail: string; provider: string; checked_at: string }[];
  const seen = new Set<string>();
  return (Array.isArray(rows) ? rows : []).filter((row) => {
    if (seen.has(row.subject)) return false;
    seen.add(row.subject);
    return true;
  });
}

async function listFeed(env: Env, user: User, limit: number) {
  const response = await rest(env, `activity_feed?${ownerScope(user)}&select=id,source,kind,title,body,read,created_at&order=created_at.desc&limit=${limit}`);
  if (!response.ok) throw new Error(`Activity could not be read (HTTP ${response.status}).`);
  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function requireOwner(request: Request, env: Env) {
  const user = await session(request, env);
  if (!user) return { user: null, error: json({ error: "Sign in required" }, 401) };
  if (!OWNERS.has(user.email)) return { user: null, error: json({ error: "This action is limited to the LifeOS owner." }, 403) };
  return { user, error: null };
}

export async function handleTruth(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "") || "/";
  const owned = path.startsWith("/api/checks") || path.startsWith("/api/activity") || path === "/api/mail/probe" || path.startsWith("/api/briefs") || path.startsWith("/api/projects") || path === "/api/features/probe" || path === "/api/board";
  if (!owned) return null;
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  try {
    // Cloudflare KV fallback for the board doc, used only when Supabase (the primary store) is
    // unreachable. Mirrors the Supabase lifeos_board shape (device -> {doc, updated_at}) so the
    // client's merge logic treats it the same way regardless of which store answered.
    if (path === "/api/board" && request.method === "GET") {
      const device = clip(url.searchParams.get("device"), 120);
      if (!device) return json({ error: "device required" }, 400);
      const kv = env.LIFEOS_KV as KVNamespace | undefined;
      if (!kv) return json({ error: "KV not bound" }, 500);
      const raw = await kv.get(`board:${device}`);
      if (!raw) return json({ doc: null, at: 0 });
      const parsed = JSON.parse(raw) as { doc: unknown; at: number };
      return json(parsed);
    }
    if (path === "/api/board" && request.method === "POST") {
      const device = clip(url.searchParams.get("device"), 120);
      if (!device) return json({ error: "device required" }, 400);
      const kv = env.LIFEOS_KV as KVNamespace | undefined;
      if (!kv) return json({ error: "KV not bound" }, 500);
      const body = await request.json().catch(() => null) as { doc?: unknown } | null;
      if (!body || body.doc === undefined) return json({ error: "doc required" }, 400);
      await kv.put(`board:${device}`, JSON.stringify({ doc: body.doc, at: Date.now() }));
      return json({ ok: true });
    }
    if (path === "/api/checks" && request.method === "GET") {
      const user = await session(request, env);
      if (!user) return json({ error: "Sign in required" }, 401);
      return json({ checks: await listChecks(env, user) });
    }
    if (path === "/api/checks/probe" && request.method === "POST") {
      const gate = await requireOwner(request, env);
      if (!gate.user) return gate.error as Response;
      const checks = await probeGreen(env, gate.user);
      return json({ checks });
    }
    if (path === "/api/features/probe" && request.method === "POST") {
      const gate = await requireOwner(request, env);
      if (!gate.user) return gate.error as Response;
      return json({ results: await probeFeatures(env) });
    }
    if (path === "/api/mail/probe" && request.method === "POST") {
      const gate = await requireOwner(request, env);
      if (!gate.user) return gate.error as Response;
      const statuses = await probeNylas(env, gate.user);
      const google = (await probeGreen(env, gate.user)).filter((row) => row.provider === "google");
      for (const row of google) {
        statuses.push({ email: row.email, ok: row.state === "green", text: row.detail, count: 0 });
      }
      return json({ statuses });
    }
    if ((path === "/api/activity/feed" || path === "/api/activity/events") && request.method === "GET") {
      const user = await session(request, env);
      if (!user) return json({ error: "Sign in required" }, 401);
      const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 80)));
      const events = await listFeed(env, user, limit);
      return json({ events, total: events.length, has_more: false });
    }
    if (path === "/api/activity/log" && request.method === "POST") {
      const user = await session(request, env);
      if (!user) return json({ error: "Sign in required" }, 401);
      const body = await request.json().catch(() => ({})) as { source?: string; kind?: string; title?: string; body?: string };
      const title = clip(body.title, 180);
      if (!title) return json({ error: "Title required" }, 400);
      await logActivity(env, user.id, body.source || "app", body.kind || "action", title, String(body.body || ""));
      return json({ ok: true });
    }
    if (path === "/api/activity/events/mark-all-read" && request.method === "POST") {
      const user = await session(request, env);
      if (!user) return json({ error: "Sign in required" }, 401);
      const response = await rest(env, `activity_feed?${ownerScope(user)}&read=eq.false`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify({ read: true }),
      });
      const rows = response.ok ? await response.json() : [];
      return json({ marked: Array.isArray(rows) ? rows.length : 0 });
    }
    const readMatch = path.match(/^\/api\/activity\/events\/([0-9a-f-]{36})\/(read|dismiss)$/i);
    if (readMatch && request.method === "POST") {
      const user = await session(request, env);
      if (!user) return json({ error: "Sign in required" }, 401);
      const id = readMatch[1];
      if (readMatch[2] === "dismiss") {
        const response = await rest(env, `activity_feed?id=eq.${id}&${ownerScope(user)}`, { method: "DELETE", headers: { Prefer: "return=representation" } });
        if (!response.ok) return json({ error: `Dismiss failed (HTTP ${response.status}).` }, response.status);
        return json({ ok: true });
      }
      const response = await rest(env, `activity_feed?id=eq.${id}&${ownerScope(user)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ read: true }),
      });
      if (!response.ok) return json({ error: `Read failed (HTTP ${response.status}).` }, response.status);
      return json({ ok: true });
    }
    if (path === "/api/briefs" && request.method === "GET") {
      const user = await session(request, env);
      if (!user) return json({ error: "Sign in required" }, 401);
      const day = url.searchParams.get("day") || today();
      const response = await rest(env, `daily_briefs?user_id=eq.${encodeURIComponent(user.id)}&day=eq.${encodeURIComponent(day)}&select=kind,body,source,day,created_at`);
      if (!response.ok) return json({ error: `Briefs could not be read (HTTP ${response.status}).` }, response.status);
      return json({ briefs: await response.json() });
    }
    if (path === "/api/briefs" && request.method === "POST") {
      const user = await session(request, env);
      if (!user) return json({ error: "Sign in required" }, 401);
      const body = await request.json().catch(() => ({})) as { kind?: string; body?: string; source?: string };
      const kind = clip(body.kind, 40);
      const text = clip(body.body, 4000);
      if (!kind || !text) return json({ error: "Kind and body required" }, 400);
      const response = await rest(env, "daily_briefs?on_conflict=user_id,day,kind", {
        method: "POST",
        headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ user_id: user.id, day: today(), kind, body: text, source: clip(body.source || "model", 40) }),
      });
      if (!response.ok) return json({ error: clip(await response.text(), 240) || "Brief was not saved." }, response.status);
      await logActivity(env, user.id, "daily", "status", `Daily ${kind}`, text.slice(0, 180));
      return json({ ok: true });
    }
    if (path === "/api/projects" && request.method === "GET") {
      const user = await session(request, env);
      if (!user || !UUID.test(user.id)) return json({ error: "Sign in required" }, 401);
      const projects = await rest(env, `projects?user_id=eq.${user.id}&select=id,name,status,budget_cents,description,client_name,deadline,updated_at&order=updated_at.desc`);
      const lines = await rest(env, `project_budget_lines?user_id=eq.${user.id}&select=id,project_id,label,amount_cents,kind&order=created_at.desc`);
      if (!projects.ok) return json({ error: `Projects could not be read (HTTP ${projects.status}).` }, projects.status);
      return json({ projects: await projects.json(), lines: lines.ok ? await lines.json() : [], linesError: lines.ok ? "" : `Budget lines could not be read (HTTP ${lines.status}).` });
    }
    if (path === "/api/projects" && request.method === "POST") {
      const user = await session(request, env);
      if (!user || !UUID.test(user.id)) return json({ error: "Sign in required" }, 401);
      const body = await request.json().catch(() => ({})) as { name?: string; description?: string; budget_cents?: number; client_name?: string };
      const name = clip(body.name, 160);
      if (!name) return json({ error: "Name required" }, 400);
      const budget = Number.isFinite(Number(body.budget_cents)) ? Math.round(Number(body.budget_cents)) : 0;
      const response = await rest(env, "projects", {
        method: "POST",
        headers: { "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify({ user_id: user.id, name, description: clip(body.description, 2000), client_name: clip(body.client_name, 160), budget_cents: budget, status: "open" }),
      });
      if (!response.ok) return json({ error: clip(await response.text(), 240) || "Project was not saved." }, response.status);
      const rows = await response.json() as { id?: string; name?: string }[];
      await logActivity(env, user.id, "lucid", "action", `Project ${name}`, `Budget cents ${budget}.`);
      return json({ project: Array.isArray(rows) ? rows[0] : null });
    }
    if (path === "/api/projects/line" && request.method === "POST") {
      const user = await session(request, env);
      if (!user || !UUID.test(user.id)) return json({ error: "Sign in required" }, 401);
      const body = await request.json().catch(() => ({})) as { project_id?: string; label?: string; amount_cents?: number; kind?: string };
      if (!body.project_id || !UUID.test(body.project_id)) return json({ error: "Project required" }, 400);
      const owned = await rest(env, `projects?id=eq.${body.project_id}&user_id=eq.${user.id}&select=id`);
      const found = owned.ok ? await owned.json() : [];
      if (!Array.isArray(found) || !found.length) return json({ error: "That project is not on this account." }, 404);
      const label = clip(body.label, 160);
      if (!label) return json({ error: "Label required" }, 400);
      const amount = Number.isFinite(Number(body.amount_cents)) ? Math.round(Number(body.amount_cents)) : NaN;
      if (!Number.isFinite(amount)) return json({ error: "Amount required" }, 400);
      const response = await rest(env, "project_budget_lines", {
        method: "POST",
        headers: { "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify({ user_id: user.id, project_id: body.project_id, label, amount_cents: amount, kind: body.kind === "income" ? "income" : "expense" }),
      });
      if (!response.ok) return json({ error: clip(await response.text(), 240) || "Budget line was not saved." }, response.status);
      await logActivity(env, user.id, "lucid", "action", `Budget ${label}`, `${amount} cents.`);
      const rows = await response.json();
      return json({ line: Array.isArray(rows) ? rows[0] : null });
    }
    return json({ error: "Not found" }, 404);
  } catch (error) {
    return json({ error: safeError(error) }, 500);
  }
}
