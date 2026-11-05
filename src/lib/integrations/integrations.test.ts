import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "../db.ts";
import { decryptText, encryptText } from "./crypto.server.ts";
import { buildAuthUrl, checkToken, exchangeCode, isConfigured, pkcePair, redirectUri, refreshAccess } from "./oauth.server.ts";
import { oauthAttemptCookie, oauthAuthorizeUrl, oauthMissing, oauthSpec, rawParam, readOauthAttempt } from "./oauth-flow.server.ts";
import { completeCallback, freshAccessToken, loadPayload, removeAccount, removeMailbox, saveExpectedEmails, setPrimary, startFlow, testAccount, testMailbox, type CallbackResult, type Ctx } from "./service.server.ts";
import { bustMailboxes, listMailboxes, listMailboxesCached, nylasProviderFor } from "./nylas.server.ts";
import { createLimiter } from "./limit.server.ts";
import { paintChecked, workerAccountRef } from "./worker-account.ts";

const ENV: Record<string, string> = {
  GOOGLE_CLIENT_ID: "g-id", GOOGLE_CLIENT_SECRET: "g-secret",
  NOTION_CLIENT_ID: "n-id", NOTION_CLIENT_SECRET: "n-secret",
  TWITTER_CLIENT_ID: "t-id", TWITTER_CLIENT_SECRET: "t-secret",
  SLACK_CLIENT_ID: "s-id", SLACK_CLIENT_SECRET: "s-secret",
  FACEBOOK_CLIENT_ID: "f-id", FACEBOOK_CLIENT_SECRET: "f-secret",
  SPOTIFY_CLIENT_ID: "sp-id", SPOTIFY_CLIENT_SECRET: "sp-secret",
  GITHUB_CLIENT_ID: "gh-id", GITHUB_CLIENT_SECRET: "gh-secret",
  NYLAS_CLIENT_ID: "ny-app", NYLAS_API_KEY: "ny-key",
};
const read = (name: string) => ENV[name];
const ORIGIN = "https://app.example.com";

function acct(out: CallbackResult) {
  if (!out.ok || !out.account) throw new Error("expected a connected account");
  return out.account;
}

type Call = { url: string; init?: RequestInit };
function mockFetch(handlers: Record<string, (call: Call) => unknown>) {
  const calls: Call[] = [];
  const f = (async (url: string | URL | Request, init?: RequestInit) => {
    const href = String(url);
    calls.push({ url: href, init });
    const key = Object.keys(handlers).find((k) => href.startsWith(k));
    if (!key) return new Response(JSON.stringify({ error: `no mock for ${href}` }), { status: 404 });
    const out = handlers[key]({ url: href, init });
    if (out instanceof Response) return out;
    return new Response(JSON.stringify(out), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  return { f, calls };
}

async function freshDb() {
  const db = new PGlite();
  for (const file of ["0004_integrations.sql", "0005_integration_accounts_map.sql"]) {
    await db.exec(readFileSync(new URL(`../../../migrations/${file}`, import.meta.url), "utf8"));
  }
  const sql = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.reduce((acc, part, i) => acc + part + (i < values.length ? `$${i + 1}` : ""), "");
    return (await db.query(text, values)).rows;
  }) as unknown as Sql;
  (sql as { query: unknown }).query = async (text: string, params?: unknown[]) => (await db.query(text, params)).rows;
  return { db, sql };
}

const googleHandlers = (opts: { email?: string; expires?: number } = {}): Record<string, (call: Call) => unknown> => ({
  "https://oauth2.googleapis.com/token": (call: Call) => {
    const body = new URLSearchParams(String(call.init?.body));
    if (body.get("grant_type") === "refresh_token") return { access_token: "g-access-2", expires_in: 3600, scope: "openid email" };
    return { access_token: "g-access-1", refresh_token: "g-refresh-1", expires_in: opts.expires ?? 3600, scope: "openid email profile" };
  },
  "https://www.googleapis.com/oauth2/v3/userinfo": () => ({ sub: "g-1", email: opts.email || "Chris@Example.com", name: "Chris" }),
  "https://gmail.googleapis.com/gmail/v1/users/me/profile": () => ({ messagesTotal: 42 }),
});

describe("crypto", () => {
  it("round-trips and never stores plaintext", async () => {
    const blob = await encryptText("super-secret-token", "key-1");
    assert.ok(!blob.includes("super-secret-token"));
    assert.equal(await decryptText(blob, "key-1"), "super-secret-token");
  });
  it("rejects the wrong key and tampering", async () => {
    const blob = await encryptText("x", "key-1");
    await assert.rejects(decryptText(blob, "key-2"));
    const parts = blob.split(".");
    parts[2] = parts[2].slice(0, -4) + "AAAA";
    await assert.rejects(decryptText(parts.join("."), "key-1"));
  });
  it("refuses to run with no secret", async () => {
    await assert.rejects(encryptText("x", ""), /INTEGRATIONS_ENCRYPTION_KEY/);
  });
});

describe("auth urls", () => {
  it("google asks for offline access, consent and a login hint", () => {
    const url = new URL(buildAuthUrl({ id: "google", origin: ORIGIN, state: "st", hintEmail: "a@b.com", read }));
    assert.equal(url.origin + url.pathname, "https://accounts.google.com/o/oauth2/v2/auth");
    assert.equal(url.searchParams.get("redirect_uri"), `${ORIGIN}/api/integrations/callback/google`);
    assert.equal(url.searchParams.get("access_type"), "offline");
    assert.match(url.searchParams.get("prompt") || "", /consent/);
    assert.equal(url.searchParams.get("login_hint"), "a@b.com");
    assert.match(url.searchParams.get("scope") || "", /gmail\.readonly/);
    assert.equal(url.searchParams.get("state"), "st");
  });
  it("notion sends owner=user and no scope", () => {
    const url = new URL(buildAuthUrl({ id: "notion", origin: ORIGIN, state: "st", read }));
    assert.equal(url.searchParams.get("owner"), "user");
    assert.equal(url.searchParams.has("scope"), false);
  });
  it("twitter sends a PKCE S256 challenge", async () => {
    const pair = await pkcePair();
    const url = new URL(buildAuthUrl({ id: "twitter", origin: ORIGIN, state: "st", challenge: pair.challenge, read }));
    assert.equal(url.searchParams.get("code_challenge"), pair.challenge);
    assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  });
  it("slack scopes are comma separated; unconfigured providers throw clearly", () => {
    const url = new URL(buildAuthUrl({ id: "slack", origin: ORIGIN, state: "st", read }));
    assert.match(url.searchParams.get("scope") || "", /^channels:read,chat:write/);
    assert.throws(() => buildAuthUrl({ id: "linkedin", origin: ORIGIN, state: "st", read }), /LINKEDIN_CLIENT_ID/);
    assert.equal(isConfigured("linkedin", read), false);
    assert.equal(isConfigured("google", read), true);
  });
});

describe("code exchange", () => {
  it("google puts credentials in the form body", async () => {
    const { f, calls } = mockFetch(googleHandlers());
    const set = await exchangeCode({ id: "google", code: "c1", origin: ORIGIN, read, f });
    const body = new URLSearchParams(String(calls[0].init?.body));
    assert.equal(body.get("client_id"), "g-id");
    assert.equal(body.get("client_secret"), "g-secret");
    assert.equal(body.get("redirect_uri"), redirectUri(ORIGIN, "google"));
    assert.equal(set.accessToken, "g-access-1");
    assert.equal(set.refreshToken, "g-refresh-1");
    assert.ok(set.expiresAt && set.expiresAt.getTime() > Date.now());
  });
  it("notion uses Basic auth with a JSON body", async () => {
    const { f, calls } = mockFetch({ "https://api.notion.com/v1/oauth/token": () => ({ access_token: "n-1", workspace_id: "w1" }) });
    await exchangeCode({ id: "notion", code: "c", origin: ORIGIN, read, f });
    const headers = calls[0].init?.headers as Record<string, string>;
    assert.equal(headers.Authorization, `Basic ${btoa("n-id:n-secret")}`);
    assert.equal(headers["Content-Type"], "application/json");
    assert.equal(JSON.parse(String(calls[0].init?.body)).grant_type, "authorization_code");
  });
  it("notion refresh sends Basic and a JSON body with no client secret", async () => {
    const { f, calls } = mockFetch({ "https://api.notion.com/v1/oauth/token": () => ({ access_token: "n-2", expires_in: 3600 }) });
    await refreshAccess({ id: "notion", refreshToken: "n-r", read, f });
    const headers = calls[0].init?.headers as Record<string, string>;
    const body = JSON.parse(String(calls[0].init?.body)) as Record<string, string>;
    assert.equal(headers.Authorization, `Basic ${btoa("n-id:n-secret")}`);
    assert.equal(headers["Content-Type"], "application/json");
    assert.equal(body.grant_type, "refresh_token");
    assert.equal(body.refresh_token, "n-r");
    assert.equal("client_id" in body, false);
    assert.equal("client_secret" in body, false);
  });
  it("slack refresh puts the client secret in the form and treats ok:false as failure", async () => {
    const ok = mockFetch({ "https://slack.com/api/oauth.v2.access": () => ({ ok: true, access_token: "s-1", expires_in: 3600 }) });
    await refreshAccess({ id: "slack", refreshToken: "s-r", read, f: ok.f });
    const body = new URLSearchParams(String(ok.calls[0].init?.body));
    const headers = ok.calls[0].init?.headers as Record<string, string>;
    assert.equal(body.get("grant_type"), "refresh_token");
    assert.equal(body.get("client_id"), "s-id");
    assert.equal(body.get("client_secret"), "s-secret");
    assert.equal(headers.Authorization, undefined);
    const bad = mockFetch({ "https://slack.com/api/oauth.v2.access": () => ({ ok: false, error: "invalid_refresh_token" }) });
    await assert.rejects(refreshAccess({ id: "slack", refreshToken: "s-r", read, f: bad.f }), /invalid_refresh_token/);
  });
  it("linkedin and discord refresh put credentials in the form body", async () => {
    const extra: Record<string, string> = { DISCORD_CLIENT_ID: "d-id", DISCORD_CLIENT_SECRET: "d-secret", LINKEDIN_CLIENT_ID: "li-id", LINKEDIN_CLIENT_SECRET: "li-secret" };
    const readMore = (name: string) => read(name) || extra[name];
    for (const [id, url, clientId] of [
      ["linkedin", "https://www.linkedin.com/oauth/v2/accessToken", "li-id"],
      ["discord", "https://discord.com/api/oauth2/token", "d-id"],
    ] as const) {
      const { f, calls } = mockFetch({ [url]: () => ({ access_token: "a-1", expires_in: 3600 }) });
      await refreshAccess({ id, refreshToken: "r-1", read: readMore, f });
      const body = new URLSearchParams(String(calls[0].init?.body));
      const headers = calls[0].init?.headers as Record<string, string>;
      assert.equal(body.get("client_id"), clientId);
      assert.equal(body.has("client_secret"), true);
      assert.equal(headers.Authorization, undefined);
      assert.equal(headers["Content-Type"], "application/x-www-form-urlencoded");
    }
  });
  it("twitter refresh sends Basic and leaves the secret out of the body", async () => {
    const { f, calls } = mockFetch({ "https://api.twitter.com/2/oauth2/token": () => ({ access_token: "t-2", expires_in: 7200 }) });
    await refreshAccess({ id: "twitter", refreshToken: "t-r", read, f });
    const body = new URLSearchParams(String(calls[0].init?.body));
    const headers = calls[0].init?.headers as Record<string, string>;
    assert.equal(body.get("grant_type"), "refresh_token");
    assert.equal(body.get("refresh_token"), "t-r");
    assert.equal(body.has("client_secret"), false);
    assert.equal(headers.Authorization, `Basic ${btoa("t-id:t-secret")}`);
  });
  it("spotify refresh sends Basic and leaves the secret out of the body", async () => {
    const { f, calls } = mockFetch({ "https://accounts.spotify.com/api/token": () => ({ access_token: "sp-1", expires_in: 3600 }) });
    await refreshAccess({ id: "spotify", refreshToken: "sp-r", read, f });
    const body = new URLSearchParams(String(calls[0].init?.body));
    const headers = calls[0].init?.headers as Record<string, string>;
    assert.equal(body.get("grant_type"), "refresh_token");
    assert.equal(body.get("refresh_token"), "sp-r");
    assert.equal(body.has("client_id"), false);
    assert.equal(body.has("client_secret"), false);
    assert.equal(headers.Authorization, `Basic ${btoa("sp-id:sp-secret")}`);
  });
  it("twitter uses Basic auth and sends the PKCE verifier", async () => {
    const { f, calls } = mockFetch({ "https://api.twitter.com/2/oauth2/token": () => ({ access_token: "t-1", refresh_token: "t-r", expires_in: 7200 }) });
    await exchangeCode({ id: "twitter", code: "c", origin: ORIGIN, verifier: "ver123", read, f });
    const body = new URLSearchParams(String(calls[0].init?.body));
    assert.equal(body.get("code_verifier"), "ver123");
    assert.equal(body.has("client_secret"), false);
    assert.ok((calls[0].init?.headers as Record<string, string>).Authorization.startsWith("Basic "));
  });
  it("slack reports ok:false inside a 200 as an error", async () => {
    const { f } = mockFetch({ "https://slack.com/api/oauth.v2.access": () => ({ ok: false, error: "invalid_code" }) });
    await assert.rejects(exchangeCode({ id: "slack", code: "c", origin: ORIGIN, read, f }), /invalid_code/);
  });
  it("facebook swaps for a long-lived token", async () => {
    const { f } = mockFetch({
      "https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token": () => ({ access_token: "fb-long", expires_in: 5184000 }),
      "https://graph.facebook.com/oauth/access_token": () => ({ access_token: "fb-short", expires_in: 3600 }),
    });
    const set = await exchangeCode({ id: "facebook", code: "c", origin: ORIGIN, read, f });
    assert.equal(set.accessToken, "fb-long");
    assert.ok(set.expiresAt && set.expiresAt.getTime() - Date.now() > 50 * 86400_000);
  });
});

describe("network failures", () => {
  const down = (async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch;
  const timedOut = (async () => { throw new DOMException("The operation was aborted due to timeout", "TimeoutError"); }) as unknown as typeof fetch;
  it("explains an unreachable provider instead of saying 'fetch failed'", async () => {
    await assert.rejects(exchangeCode({ id: "google", code: "c", origin: ORIGIN, read, f: down }), /Could not reach google.*try again/i);
    const health = await checkToken("google", "tok", down);
    assert.equal(health.ok, false);
    assert.match(health.text, /Could not reach google/);
  });
  it("explains a timeout", async () => {
    await assert.rejects(exchangeCode({ id: "slack", code: "c", origin: ORIGIN, read, f: timedOut }), /did not answer in time/);
  });
});

describe("full connect flow (real SQL, encrypted at rest)", () => {
  async function setup(handlers = googleHandlers(), env = read) {
    const { db, sql } = await freshDb();
    const { f, calls } = mockFetch(handlers);
    const ctx: Ctx = { sql, read: env, secret: "test-secret", f };
    return { db, sql, ctx, calls };
  }
  const connect = async (ctx: Ctx, userId = "user-1", hintEmail?: string) => {
    const { url } = await startFlow(ctx, { userId, provider: "google", origin: ORIGIN, hintEmail });
    const state = new URL(url).searchParams.get("state") as string;
    return { state, result: (code = "code-1") => completeCallback(ctx, { state, code, origin: ORIGIN }) };
  };

  it("connects, lowercases the email and encrypts tokens", async () => {
    const { ctx, db } = await setup();
    const { result } = await connect(ctx);
    const out = await result();
    assert.ok(out.ok);
    assert.equal(acct(out).email, "chris@example.com");
    const raw = (await db.query("select access_token_enc, refresh_token_enc from integration_accounts")).rows[0] as Record<string, string>;
    assert.ok(raw.access_token_enc.startsWith("v1.") && !raw.access_token_enc.includes("g-access-1"));
    assert.ok(raw.refresh_token_enc.startsWith("v1."));
    const payload = await loadPayload(ctx, "user-1");
    assert.equal(payload.accounts.length, 1);
    assert.equal(payload.configured.google, true);
    assert.equal(payload.configured.linkedin, false);
    assert.equal(payload.encryptionReady, true);
  });

  it("a callback link cannot be replayed", async () => {
    const { ctx } = await setup();
    const { result } = await connect(ctx);
    assert.ok((await result()).ok);
    const again = await result();
    assert.equal(again.ok, false);
    if (!again.ok) assert.match(again.error, /expired or was already used/);
  });

  it("rejects an unknown state and a different signed-in user", async () => {
    const { ctx } = await setup();
    const bogus = await completeCallback(ctx, { state: "nope", code: "c", origin: ORIGIN });
    assert.equal(bogus.ok, false);
    const { state } = await connect(ctx, "user-1");
    const other = await completeCallback(ctx, { state, code: "c", origin: ORIGIN, sessionUserId: "user-2" });
    assert.equal(other.ok, false);
    if (!other.ok) assert.match(other.error, /different user/);
  });

  it("refuses when Google signs in as a different mailbox than the one picked", async () => {
    const { ctx, db } = await setup(googleHandlers({ email: "other@example.com" }));
    const { result } = await connect(ctx, "user-1", "chris@example.com");
    const out = await result();
    assert.equal(out.ok, false);
    if (!out.ok) assert.match(out.error, /signed in as other@example\.com/);
    assert.equal(((await db.query("select count(*)::int as n from integration_accounts")).rows[0] as { n: number }).n, 0);
  });

  it("honours the Google allow-list", async () => {
    const env = (name: string) => (name === "INTEGRATIONS_GOOGLE_ALLOWED" ? "boss@example.com" : ENV[name]);
    const { ctx } = await setup(googleHandlers(), env);
    const { result } = await connect(ctx);
    const out = await result();
    assert.equal(out.ok, false);
    if (!out.ok) assert.match(out.error, /not on the allowed list/);
  });

  it("scopes accounts to their owner", async () => {
    const { ctx } = await setup();
    assert.ok((await (await connect(ctx, "user-1")).result()).ok);
    assert.equal((await loadPayload(ctx, "user-2")).accounts.length, 0);
    await assert.rejects(freshAccessToken(ctx, "user-2", "google", ""), /not connected/);
  });

  it("serves the stored token while it is valid", async () => {
    const { ctx, calls } = await setup();
    await (await connect(ctx)).result();
    const before = calls.length;
    const live = await freshAccessToken(ctx, "user-1", "google", "chris@example.com");
    assert.equal(live.accessToken, "g-access-1");
    assert.equal(calls.length, before, "no network call needed");
  });

  it("refreshes an expiring token with the stored refresh token and persists it", async () => {
    const { ctx, db } = await setup(googleHandlers({ expires: 10 }));
    await (await connect(ctx)).result();
    const live = await freshAccessToken(ctx, "user-1", "google", "");
    assert.equal(live.accessToken, "g-access-2");
    const row = (await db.query("select access_token_enc, refresh_token_enc from integration_accounts")).rows[0] as Record<string, string>;
    assert.equal(await decryptText(row.access_token_enc, "test-secret"), "g-access-2");
    assert.equal(await decryptText(row.refresh_token_enc, "test-secret"), "g-refresh-1", "refresh token is kept");
  });

  it("flags the account for reconnect when renewal fails", async () => {
    const handlers = googleHandlers({ expires: 10 });
    handlers["https://oauth2.googleapis.com/token"] = (call: Call) => {
      const body = new URLSearchParams(String(call.init?.body));
      if (body.get("grant_type") === "refresh_token") return new Response(JSON.stringify({ error: "invalid_grant", error_description: "Token has been expired or revoked." }), { status: 400 });
      return { access_token: "g-access-1", refresh_token: "g-refresh-1", expires_in: 10 };
    };
    const { ctx } = await setup(handlers);
    await (await connect(ctx)).result();
    await assert.rejects(freshAccessToken(ctx, "user-1", "google", ""), /Reconnect/);
    const payload = await loadPayload(ctx, "user-1");
    assert.equal(payload.accounts[0].status, "needs_reauth");
    assert.match(payload.accounts[0].lastError, /expired or revoked/);
  });

  it("tests a live connection and records the result", async () => {
    const { ctx } = await setup();
    const out = await (await connect(ctx)).result();
    assert.ok(out.ok);
    if (!out.ok) return;
    const health = await testAccount(ctx, "user-1", acct(out).id);
    assert.equal(health.ok, true);
    assert.match(health.text, /42 messages/);
    await assert.rejects(testAccount(ctx, "user-2", acct(out).id), /not connected/);
  });

  it("marks the account when the provider rejects the token on test", async () => {
    const handlers = googleHandlers();
    const { ctx } = await setup(handlers);
    const out = await (await connect(ctx)).result();
    if (!out.ok) throw new Error("setup failed");
    handlers["https://www.googleapis.com/oauth2/v3/userinfo"] = () => new Response(JSON.stringify({ error: { message: "Invalid Credentials" } }), { status: 401 });
    const health = await testAccount(ctx, "user-1", acct(out).id);
    assert.equal(health.ok, false);
    assert.match(health.text, /Invalid Credentials/);
    assert.equal((await loadPayload(ctx, "user-1")).accounts[0].status, "needs_reauth");
  });

  it("reconnecting the same Google account updates it instead of duplicating", async () => {
    const { ctx } = await setup();
    await (await connect(ctx)).result();
    await (await connect(ctx)).result();
    assert.equal((await loadPayload(ctx, "user-1")).accounts.length, 1);
  });

  it("disconnect removes the account and only for its owner", async () => {
    const { ctx } = await setup();
    const out = await (await connect(ctx)).result();
    if (!out.ok) throw new Error("setup failed");
    await assert.rejects(removeAccount(ctx, "user-2", acct(out).id), /not connected/);
    await removeAccount(ctx, "user-1", acct(out).id);
    assert.equal((await loadPayload(ctx, "user-1")).accounts.length, 0);
  });

  it("blocks connecting until an encryption key exists, and until the provider is configured", async () => {
    const { ctx } = await setup();
    await assert.rejects(startFlow({ ...ctx, secret: "" }, { userId: "u", provider: "google", origin: ORIGIN }), /INTEGRATIONS_ENCRYPTION_KEY/);
    await assert.rejects(startFlow(ctx, { userId: "u", provider: "linkedin", origin: ORIGIN }), /LINKEDIN_CLIENT_ID/);
    assert.equal((await loadPayload({ ...ctx, secret: "" }, "u")).encryptionReady, false);
  });
});

describe("several emails across services", () => {
  const MAIL = { gmail: "chrisgr33ninc@gmail.com", work: "chris@ceogps.com", icloud: "cagednreality@icloud.com" };

  /** A provider mock whose signed-in account can change between connects. */
  function accounts() {
    const who = { google: { sub: "g-gmail", email: MAIL.gmail }, github: { id: 7, email: MAIL.work }, spotify: { id: "sp-1", email: MAIL.work } };
    const handlers: Record<string, (call: Call) => unknown> = {
      "https://oauth2.googleapis.com/token": () => ({ access_token: `g-${who.google.sub}`, refresh_token: `r-${who.google.sub}`, expires_in: 3600 }),
      "https://www.googleapis.com/oauth2/v3/userinfo": () => ({ sub: who.google.sub, email: who.google.email, name: "Chris" }),
      "https://gmail.googleapis.com/gmail/v1/users/me/profile": () => ({ messagesTotal: 5 }),
      "https://github.com/login/oauth/access_token": () => ({ access_token: "gh-tok", scope: "read:user" }),
      "https://api.github.com/user": () => ({ id: who.github.id, login: "chris", name: "Chris", email: who.github.email }),
      "https://accounts.spotify.com/api/token": () => ({ access_token: "sp-tok", refresh_token: "sp-ref", expires_in: 3600 }),
      "https://api.spotify.com/v1/me": () => ({ id: who.spotify.id, email: who.spotify.email, display_name: "Chris" }),
    };
    return { who, handlers };
  }

  async function env() {
    return freshDb();
  }

  async function run(provider: "google" | "github" | "spotify", ctx: Ctx, userId = "user-1", hintEmail?: string) {
    const { url } = await startFlow(ctx, { userId, provider, origin: ORIGIN, hintEmail });
    const params = new URL(url).searchParams;
    return { url, loginHint: params.get("login_hint"), done: () => completeCallback(ctx, { state: params.get("state") as string, code: "c", origin: ORIGIN }) };
  }

  it("keeps each service on its own email, all connected at once", async () => {
    const { sql } = await env();
    const { handlers } = accounts();
    const { f } = mockFetch(handlers);
    const ctx: Ctx = { sql, read, secret: "s", f };
    assert.ok((await (await run("google", ctx)).done()).ok);
    assert.ok((await (await run("github", ctx)).done()).ok);
    assert.ok((await (await run("spotify", ctx)).done()).ok);
    const payload = await loadPayload(ctx, "user-1");
    const byProvider = Object.fromEntries(payload.accounts.map((row) => [row.provider, row.email]));
    assert.deepEqual(byProvider, { google: MAIL.gmail, github: MAIL.work, spotify: MAIL.work });
  });

  it("allows two Google accounts with different emails and marks the first primary", async () => {
    const { sql } = await env();
    const { who, handlers } = accounts();
    const { f } = mockFetch(handlers);
    const ctx: Ctx = { sql, read, secret: "s", f };
    assert.ok((await (await run("google", ctx)).done()).ok);
    who.google = { sub: "g-work", email: MAIL.work };
    assert.ok((await (await run("google", ctx)).done()).ok);
    const google = (await loadPayload(ctx, "user-1")).accounts.filter((row) => row.provider === "google");
    assert.deepEqual(google.map((row) => [row.email, row.primary]), [[MAIL.gmail, true], [MAIL.work, false]]);
  });

  it("serves the primary account by default and a specific one on request", async () => {
    const { sql } = await env();
    const { who, handlers } = accounts();
    const { f } = mockFetch(handlers);
    const ctx: Ctx = { sql, read, secret: "s", f };
    await (await run("google", ctx)).done();
    who.google = { sub: "g-work", email: MAIL.work };
    await (await run("google", ctx)).done();
    assert.equal((await freshAccessToken(ctx, "user-1", "google", "")).accessToken, "g-g-gmail");
    assert.equal((await freshAccessToken(ctx, "user-1", "google", MAIL.work)).accessToken, "g-g-work");
    const work = (await loadPayload(ctx, "user-1")).accounts.find((row) => row.email === MAIL.work)!;
    await setPrimary(ctx, "user-1", work.id);
    assert.equal((await freshAccessToken(ctx, "user-1", "google", "")).accessToken, "g-g-work");
    await assert.rejects(setPrimary(ctx, "user-2", work.id), /not connected/);
  });

  it("promotes another account when the primary one is disconnected", async () => {
    const { sql } = await env();
    const { who, handlers } = accounts();
    const { f } = mockFetch(handlers);
    const ctx: Ctx = { sql, read, secret: "s", f };
    await (await run("google", ctx)).done();
    who.google = { sub: "g-work", email: MAIL.work };
    await (await run("google", ctx)).done();
    const first = (await loadPayload(ctx, "user-1")).accounts.find((row) => row.primary)!;
    await removeAccount(ctx, "user-1", first.id);
    const left = (await loadPayload(ctx, "user-1")).accounts;
    assert.equal(left.length, 1);
    assert.equal(left[0].primary, true);
  });

  it("an expected email becomes the login hint and wins primary when it connects", async () => {
    const { sql } = await env();
    const { who, handlers } = accounts();
    const { f } = mockFetch(handlers);
    const ctx: Ctx = { sql, read, secret: "s", f };
    who.google = { sub: "g-work", email: MAIL.work };
    await (await run("google", ctx, "user-1", MAIL.work)).done(); // a work Google account is linked first
    await saveExpectedEmails(ctx, "user-1", { google: MAIL.gmail.toUpperCase() });
    assert.equal((await loadPayload(ctx, "user-1")).expected.google, MAIL.gmail, "stored lower-case");
    who.google = { sub: "g-gmail", email: MAIL.gmail };
    const attempt = await run("google", ctx);
    assert.equal(attempt.loginHint, MAIL.gmail, "no email typed, so the saved one is used");
    assert.ok((await attempt.done()).ok);
    const google = (await loadPayload(ctx, "user-1")).accounts.filter((row) => row.provider === "google");
    assert.equal(google.find((row) => row.primary)?.email, MAIL.gmail);
  });

  it("setting the expected email promotes an already-linked account", async () => {
    const { sql } = await env();
    const { who, handlers } = accounts();
    const { f } = mockFetch(handlers);
    const ctx: Ctx = { sql, read, secret: "s", f };
    await (await run("google", ctx)).done();
    who.google = { sub: "g-work", email: MAIL.work };
    await (await run("google", ctx)).done();
    await saveExpectedEmails(ctx, "user-1", { google: MAIL.work });
    assert.equal((await loadPayload(ctx, "user-1")).accounts.find((row) => row.primary)?.email, MAIL.work);
  });

  it("refuses a login that is not the expected email, and saves nothing", async () => {
    const { sql } = await env();
    const { who, handlers } = accounts();
    const { f } = mockFetch(handlers);
    const ctx: Ctx = { sql, read, secret: "s", f };
    await saveExpectedEmails(ctx, "user-1", { github: MAIL.work });
    who.github = { id: 9, email: "someone.else@example.com" };
    const out = await (await run("github", ctx)).done();
    assert.equal(out.ok, false);
    if (!out.ok) assert.match(out.error, /signed in as someone\.else@example\.com/);
    assert.equal((await loadPayload(ctx, "user-1")).accounts.length, 0);
  });

  it("clears an expected email, and rejects bad addresses and unknown services", async () => {
    const { sql } = await env();
    const ctx: Ctx = { sql, read, secret: "s" };
    await saveExpectedEmails(ctx, "user-1", { slack: MAIL.work });
    await saveExpectedEmails(ctx, "user-1", { slack: "" });
    assert.equal((await loadPayload(ctx, "user-1")).expected.slack, undefined);
    await assert.rejects(saveExpectedEmails(ctx, "user-1", { slack: "not-an-email" }), /not a valid email/);
    await assert.rejects(saveExpectedEmails(ctx, "user-1", { nope: "a@b.co" } as never), /Unknown service/);
  });

  it("keeps every user's choices separate", async () => {
    const { sql } = await env();
    const ctx: Ctx = { sql, read, secret: "s" };
    await saveExpectedEmails(ctx, "user-1", { google: MAIL.gmail });
    assert.deepEqual((await loadPayload(ctx, "user-2")).expected, {});
  });
});

describe("iCloud and other mailboxes through Nylas", () => {
  const grants = (rows: unknown[]) => ({ "https://api.us.nylas.com/v3/grants?": () => ({ data: rows }) });

  it("picks the right sign-in page for an address", () => {
    assert.equal(nylasProviderFor("cagednreality@icloud.com"), "icloud");
    assert.equal(nylasProviderFor("a@me.com"), "icloud");
    assert.equal(nylasProviderFor("chrisgr33ninc@gmail.com"), "google");
    assert.equal(nylasProviderFor("x@outlook.com"), "microsoft");
    assert.equal(nylasProviderFor("chris@ceogps.com"), "");
  });

  it("lists the mailboxes Nylas holds, using the server key", async () => {
    const { f, calls } = mockFetch(grants([
      { id: "g1", provider: "icloud", email: "CagedNReality@iCloud.com", grant_status: "valid", created_at: 1700000000 },
      { id: "g2", provider: "google", email: "chrisgr33ninc@gmail.com", grant_status: "invalid", created_at: 1700000100 },
      { provider: "imap" },
    ]));
    const out = await listMailboxes(read, f);
    assert.equal(out.note, "");
    assert.deepEqual(out.mailboxes.map((row) => [row.email, row.status]), [["cagednreality@icloud.com", "valid"], ["chrisgr33ninc@gmail.com", "invalid"]]);
    assert.equal((calls[0].init?.headers as Record<string, string>).Authorization, "Bearer ny-key");
  });

  it("explains a missing key, a refusal and an outage instead of failing", async () => {
    assert.match((await listMailboxes(() => undefined)).note, /NYLAS_API_KEY/);
    const refused = mockFetch({ "https://api.us.nylas.com/v3/grants": () => new Response(JSON.stringify({ error: { message: "Invalid API key" } }), { status: 401 }) });
    assert.match((await listMailboxes(read, refused.f)).note, /Invalid API key/);
    const down = (async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch;
    assert.match((await listMailboxes(read, down)).note, /Could not reach Nylas/);
  });

  it("shows mailboxes in the payload without touching stored accounts", async () => {
    const { sql } = await freshDb();
    const { f } = mockFetch(grants([{ id: "g1", provider: "icloud", email: "cagednreality@icloud.com", grant_status: "valid" }]));
    const payload = await loadPayload({ sql, read, secret: "s", f }, "user-1");
    assert.equal(payload.mailboxes[0].email, "cagednreality@icloud.com");
    assert.equal(payload.accounts.length, 0);
    assert.equal(payload.configured.nylas, true);
  });

  it("tests and disconnects a mailbox", async () => {
    const calls: Call[] = [];
    const { f } = mockFetch({
      "https://api.us.nylas.com/v3/grants/g1": (call) => { calls.push(call); return call.init?.method === "DELETE" ? { request_id: "r" } : { data: { id: "g1", email: "cagednreality@icloud.com", provider: "icloud", grant_status: "valid" } }; },
      "https://api.us.nylas.com/v3/grants/g2": () => ({ data: { id: "g2", email: "old@icloud.com", provider: "icloud", grant_status: "invalid" } }),
    });
    const { sql } = await freshDb();
    const ctx: Ctx = { sql, read, secret: "s", f };
    const good = await testMailbox(ctx, "g1");
    assert.equal(good.ok, true);
    assert.match(good.text, /cagednreality@icloud.com is connected/);
    const stale = await testMailbox(ctx, "g2");
    assert.equal(stale.ok, false);
    assert.match(stale.text, /needs to be reconnected/);
    await removeMailbox(ctx, "g1");
    assert.equal(calls.at(-1)?.init?.method, "DELETE");
  });

  it("does not need the token-encryption key, because Nylas keeps the mailbox", async () => {
    const { sql } = await freshDb();
    const { f } = mockFetch({ "https://api.us.nylas.com/v3/connect/token": () => ({ access_token: "t", grant_id: "g1", email: "cagednreality@icloud.com", provider: "icloud" }) });
    const ctx: Ctx = { sql, read, secret: "", f };
    const { url } = await startFlow(ctx, { userId: "u", provider: "nylas", origin: ORIGIN, hintEmail: "cagednreality@icloud.com" });
    const out = await completeCallback(ctx, { state: new URL(url).searchParams.get("state") as string, code: "c", origin: ORIGIN });
    assert.equal(out.ok, true);
  });

  it("starts hosted sign-in for iCloud with the right provider and login hint", async () => {
    const { sql } = await freshDb();
    const ctx: Ctx = { sql, read, secret: "s" };
    const { url } = await startFlow(ctx, { userId: "u", provider: "nylas", origin: ORIGIN, hintEmail: "CagedNReality@icloud.com" });
    const u = new URL(url);
    assert.equal(u.origin + u.pathname, "https://api.us.nylas.com/v3/connect/auth");
    assert.equal(u.searchParams.get("client_id"), "ny-app");
    assert.equal(u.searchParams.get("provider"), "icloud");
    assert.equal(u.searchParams.get("login_hint"), "cagednreality@icloud.com");
    assert.equal(u.searchParams.get("redirect_uri"), `${ORIGIN}/api/integrations/callback/nylas`);
  });

  it("finishes a connect without storing anything (Nylas holds the mailbox)", async () => {
    const { db, sql } = await freshDb();
    const { f, calls } = mockFetch({ "https://api.us.nylas.com/v3/connect/token": () => ({ access_token: "ny-tok", grant_id: "g1", email: "cagednreality@icloud.com", provider: "icloud" }) });
    const ctx: Ctx = { sql, read, secret: "s", f };
    const { url } = await startFlow(ctx, { userId: "u", provider: "nylas", origin: ORIGIN, hintEmail: "cagednreality@icloud.com" });
    const out = await completeCallback(ctx, { state: new URL(url).searchParams.get("state") as string, code: "c", origin: ORIGIN });
    assert.equal(out.ok, true);
    assert.equal(((await db.query("select count(*)::int as n from integration_accounts")).rows[0] as { n: number }).n, 0);
    const body = JSON.parse(String(calls[0].init?.body));
    assert.equal(body.client_id, "ny-app");
    assert.equal(body.client_secret, "ny-key");
    assert.equal(body.grant_type, "authorization_code");
  });

  it("revokes the mailbox it just created when the wrong address signed in", async () => {
    const { sql } = await freshDb();
    const { f, calls } = mockFetch({
      "https://api.us.nylas.com/v3/connect/token": () => ({ access_token: "ny-tok", grant_id: "g-wrong", email: "other@icloud.com", provider: "icloud" }),
      "https://api.us.nylas.com/v3/grants/g-wrong": () => ({ request_id: "r" }),
    });
    const ctx: Ctx = { sql, read, secret: "s", f };
    const { url } = await startFlow(ctx, { userId: "u", provider: "nylas", origin: ORIGIN, hintEmail: "cagednreality@icloud.com" });
    const out = await completeCallback(ctx, { state: new URL(url).searchParams.get("state") as string, code: "c", origin: ORIGIN });
    assert.equal(out.ok, false);
    if (!out.ok) assert.match(out.error, /signed in as other@icloud\.com/);
    assert.equal(calls.at(-1)?.init?.method, "DELETE");
    assert.ok(calls.at(-1)?.url.endsWith("/grants/g-wrong"));
  });
});

describe("choosing the account during sign-in", () => {
  async function setup() {
    const { sql } = await freshDb();
    const state = { google: { sub: "g-1", email: "chrisgr33ninc@gmail.com" } };
    const { f } = mockFetch({
      "https://oauth2.googleapis.com/token": () => ({ access_token: "g-a", refresh_token: "g-r", expires_in: 3600 }),
      "https://www.googleapis.com/oauth2/v3/userinfo": () => ({ sub: state.google.sub, email: state.google.email, name: "Chris" }),
    });
    return { sql, state, ctx: { sql, read, secret: "s", f } as Ctx };
  }
  const stateOf = (url: string) => new URL(url).searchParams.get("state") as string;

  it("'choose' sends no login hint and still shows the provider's account picker", async () => {
    const { ctx } = await setup();
    await saveExpectedEmails(ctx, "u", { google: "chris@ceogps.com" });
    const { url } = await startFlow(ctx, { userId: "u", provider: "google", origin: ORIGIN, choose: true });
    const params = new URL(url).searchParams;
    assert.equal(params.has("login_hint"), false, "the saved expected email is not forced");
    assert.match(params.get("prompt") || "", /select_account/);
  });

  it("'choose' accepts whichever account was picked, even if it is not the expected one", async () => {
    const { ctx, state } = await setup();
    await saveExpectedEmails(ctx, "u", { google: "chris@ceogps.com" });
    const { url } = await startFlow(ctx, { userId: "u", provider: "google", origin: ORIGIN, choose: true });
    const out = await completeCallback(ctx, { state: stateOf(url), code: "c", origin: ORIGIN });
    assert.equal(out.ok, true);
    assert.equal(acct(out).email, state.google.email);
    const payload = await loadPayload(ctx, "u");
    assert.equal(payload.expected.google, "chris@ceogps.com", "choosing does not silently change the saved preference");
  });

  it("a typed address is still enforced", async () => {
    const { ctx, state } = await setup();
    state.google.email = "wrong@example.com";
    const { url } = await startFlow(ctx, { userId: "u", provider: "google", origin: ORIGIN, hintEmail: "Chrisgr33ninc@gmail.com" });
    assert.equal(new URL(url).searchParams.get("login_hint"), "chrisgr33ninc@gmail.com");
    const out = await completeCallback(ctx, { state: stateOf(url), code: "c", origin: ORIGIN });
    assert.equal(out.ok, false);
  });

  it("with no choice made it still falls back to the saved account", async () => {
    const { ctx } = await setup();
    await saveExpectedEmails(ctx, "u", { google: "chris@ceogps.com" });
    const { url } = await startFlow(ctx, { userId: "u", provider: "google", origin: ORIGIN });
    assert.equal(new URL(url).searchParams.get("login_hint"), "chris@ceogps.com");
  });

  it("GitHub always shows its account picker", () => {
    const url = new URL(buildAuthUrl({ id: "github", origin: ORIGIN, state: "s", read }));
    assert.equal(url.searchParams.get("prompt"), "select_account");
  });

  it("a mailbox can be started with no address, so the person picks on the next page", async () => {
    const { ctx } = await setup();
    const { url } = await startFlow(ctx, { userId: "u", provider: "nylas", origin: ORIGIN, choose: true });
    const params = new URL(url).searchParams;
    assert.equal(params.has("login_hint"), false);
    assert.equal(params.has("provider"), false, "Nylas shows its own provider list");
  });
});

describe("rate limiting", () => {
  it("allows up to the limit inside the window, then says how long to wait", () => {
    let clock = 0;
    const limiter = createLimiter(() => clock);
    for (let i = 0; i < 3; i += 1) assert.equal(limiter.take("u", 3, 60_000).ok, true);
    const blocked = limiter.take("u", 3, 60_000);
    assert.equal(blocked.ok, false);
    assert.equal(blocked.retryAfterSeconds, 60);
    clock = 30_000;
    assert.equal(limiter.take("u", 3, 60_000).retryAfterSeconds, 30);
  });

  it("recovers once the window passes, and keeps users and buckets separate", () => {
    let clock = 0;
    const limiter = createLimiter(() => clock);
    limiter.take("a", 1, 1000);
    assert.equal(limiter.take("a", 1, 1000).ok, false);
    assert.equal(limiter.take("b", 1, 1000).ok, true);
    clock = 1001;
    assert.equal(limiter.take("a", 1, 1000).ok, true);
  });
});

describe("faster, safer token handling", () => {
  const MAIL = "chrisgr33ninc@gmail.com";
  async function linked(opts: { expiresIn: number; rotate?: boolean }) {
    const { sql, db } = await freshDb();
    const refreshCalls: string[] = [];
    let validRefresh = "r-0";
    let counter = 0;
    const { f } = mockFetch({
      "https://oauth2.googleapis.com/token": (call: Call) => {
        const body = new URLSearchParams(String(call.init?.body));
        if (body.get("grant_type") === "refresh_token") {
          refreshCalls.push(body.get("refresh_token") as string);
          if (opts.rotate && body.get("refresh_token") !== validRefresh) {
            return new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 });
          }
          counter += 1;
          if (opts.rotate) validRefresh = `r-${counter}`;
          return { access_token: `a-${counter}`, refresh_token: opts.rotate ? validRefresh : undefined, expires_in: 3600 };
        }
        return { access_token: "a-first", refresh_token: "r-0", expires_in: opts.expiresIn };
      },
      "https://www.googleapis.com/oauth2/v3/userinfo": () => ({ sub: "g-1", email: MAIL, name: "Chris" }),
    });
    const ctx: Ctx = { sql, read, secret: "s", f };
    const { url } = await startFlow(ctx, { userId: "u", provider: "google", origin: ORIGIN });
    await completeCallback(ctx, { state: new URL(url).searchParams.get("state") as string, code: "c", origin: ORIGIN });
    return { ctx, db, refreshCalls };
  }

  it("renews a token that is about to expire, before it actually does", async () => {
    const { ctx, refreshCalls } = await linked({ expiresIn: 180 });
    const live = await freshAccessToken(ctx, "u", "google", "");
    assert.equal(live.accessToken, "a-1");
    assert.equal(refreshCalls.length, 1);
  });

  it("leaves a token with plenty of time alone", async () => {
    const { ctx, refreshCalls } = await linked({ expiresIn: 3600 });
    assert.equal((await freshAccessToken(ctx, "u", "google", "")).accessToken, "a-first");
    assert.equal(refreshCalls.length, 0);
  });

  it("many desks asking at once share one renewal", async () => {
    const { ctx, refreshCalls } = await linked({ expiresIn: 120 });
    const results = await Promise.all(Array.from({ length: 6 }, () => freshAccessToken(ctx, "u", "google", "")));
    assert.equal(refreshCalls.length, 1);
    assert.ok(results.every((row) => row.accessToken === "a-1"));
  });

  it("does not break a provider that rotates refresh tokens when callers overlap", async () => {
    const { ctx, refreshCalls } = await linked({ expiresIn: 120, rotate: true });
    const results = await Promise.all([freshAccessToken(ctx, "u", "google", ""), freshAccessToken(ctx, "u", "google", ""), freshAccessToken(ctx, "u", "google", "")]);
    assert.equal(refreshCalls.length, 1);
    assert.ok(results.every((row) => row.accessToken === "a-1"));
    assert.equal((await loadPayload(ctx, "u", { mailboxes: false })).accounts[0].status, "ok");
  });

  it("keeps working across two renewals in a row with a rotating provider", async () => {
    const { ctx, db, refreshCalls } = await linked({ expiresIn: 120, rotate: true });
    await freshAccessToken(ctx, "u", "google", "");
    await db.query("update integration_accounts set expires_at = now() + interval '90 seconds'");
    const second = await freshAccessToken(ctx, "u", "google", "");
    assert.equal(second.accessToken, "a-2");
    assert.deepEqual(refreshCalls, ["r-0", "r-1"]);
  });

  it("serves the still-valid token when a renewal fails early, and only flags the account once it really expired", async () => {
    const { sql, db } = await freshDb();
    const { f } = mockFetch({
      "https://oauth2.googleapis.com/token": (call: Call) => {
        const body = new URLSearchParams(String(call.init?.body));
        if (body.get("grant_type") === "refresh_token") return new Response(JSON.stringify({ error: "server_error" }), { status: 503 });
        return { access_token: "a-first", refresh_token: "r-0", expires_in: 120 };
      },
      "https://www.googleapis.com/oauth2/v3/userinfo": () => ({ sub: "g-1", email: MAIL }),
    });
    const ctx: Ctx = { sql, read, secret: "s", f };
    const { url } = await startFlow(ctx, { userId: "u", provider: "google", origin: ORIGIN });
    await completeCallback(ctx, { state: new URL(url).searchParams.get("state") as string, code: "c", origin: ORIGIN });
    const early = await freshAccessToken(ctx, "u", "google", "");
    assert.equal(early.accessToken, "a-first");
    assert.equal((await loadPayload(ctx, "u", { mailboxes: false })).accounts[0].status, "ok");
    await db.query("update integration_accounts set expires_at = now() - interval '1 minute'");
    await assert.rejects(freshAccessToken(ctx, "u", "google", ""), /Reconnect/);
    assert.equal((await loadPayload(ctx, "u", { mailboxes: false })).accounts[0].status, "needs_reauth");
  });
});

describe("a faster panel", () => {
  const grants = (rows: unknown[]) => ({ "https://api.us.nylas.com/v3/grants?": () => ({ data: rows }) });

  it("the main list does not wait for Nylas, and says so", async () => {
    const { sql } = await freshDb();
    const { f, calls } = mockFetch(grants([{ id: "g1", provider: "icloud", email: "cagednreality@icloud.com", grant_status: "valid" }]));
    const payload = await loadPayload({ sql, read, secret: "s", f }, "u", { mailboxes: false });
    assert.equal(calls.length, 0);
    assert.equal(payload.mailboxesLoaded, false);
    assert.deepEqual(payload.mailboxes, []);
  });

  it("repeat mailbox lookups reuse one Nylas call until something changes", async () => {
    bustMailboxes();
    const { f, calls } = mockFetch(grants([{ id: "g1", provider: "icloud", email: "cagednreality@icloud.com", grant_status: "valid" }]));
    await listMailboxesCached(read, f);
    await listMailboxesCached(read, f);
    await listMailboxesCached(read, f);
    assert.equal(calls.length, 1);
    bustMailboxes();
    await listMailboxesCached(read, f);
    assert.equal(calls.length, 2);
  });

  it("expires the cached list after 30 seconds", async () => {
    bustMailboxes();
    const { f, calls } = mockFetch(grants([]));
    let clock = 1_000_000;
    await listMailboxesCached(read, f, () => clock);
    clock += 29_000;
    await listMailboxesCached(read, f, () => clock);
    assert.equal(calls.length, 1);
    clock += 2_000;
    await listMailboxesCached(read, f, () => clock);
    assert.equal(calls.length, 2);
  });

  it("never caches a failure, so recovery is immediate", async () => {
    bustMailboxes();
    let up = false;
    const { f, calls } = mockFetch({
      "https://api.us.nylas.com/v3/grants?": () => (up
        ? { data: [{ id: "g1", provider: "icloud", email: "a@icloud.com", grant_status: "valid" }] }
        : new Response("{}", { status: 503 })),
    });
    assert.notEqual((await listMailboxesCached(read, f)).note, "");
    up = true;
    const again = await listMailboxesCached(read, f);
    assert.equal(again.note, "");
    assert.equal(again.mailboxes.length, 1);
    assert.equal(calls.length, 2);
  });

  it("disconnecting a mailbox forgets the cached list", async () => {
    bustMailboxes();
    const { sql } = await freshDb();
    const { f, calls } = mockFetch({
      "https://api.us.nylas.com/v3/grants/g1": () => ({ request_id: "r" }),
      "https://api.us.nylas.com/v3/grants?": () => ({ data: [{ id: "g1", provider: "icloud", email: "a@icloud.com", grant_status: "valid" }] }),
    });
    const ctx: Ctx = { sql, read, secret: "s", f };
    await loadPayload(ctx, "u");
    await removeMailbox(ctx, "g1");
    const before = calls.length;
    await loadPayload(ctx, "u");
    assert.equal(calls.length, before + 1);
  });
});

describe("one callback for every card", () => {
  const callback = "https://lifeos.ceogps.com/api/oauth/callback";

  it("gmail and the work account ask Google for different scopes, and never the account picker", () => {
    const spec = oauthSpec("google");
    assert.ok(spec);
    const gmail = new URL(oauthAuthorizeUrl(spec, { clientId: "cid", redirectUri: callback, state: "s", account: "chrisgr33ninc@gmail.com", challenge: "ch" }));
    assert.equal(gmail.searchParams.get("redirect_uri"), callback);
    assert.equal(gmail.searchParams.get("login_hint"), "chrisgr33ninc@gmail.com");
    assert.equal(gmail.searchParams.get("prompt"), "consent");
    assert.equal(gmail.searchParams.has("select_account") || (gmail.searchParams.get("prompt") || "").includes("select_account"), false);
    assert.equal(gmail.searchParams.get("code_challenge_method"), "S256");
    assert.match(gmail.searchParams.get("scope") || "", /gmail\.readonly/);
    assert.doesNotMatch(gmail.searchParams.get("scope") || "", /analytics/);
    const work = new URL(oauthAuthorizeUrl(spec, { clientId: "cid", redirectUri: callback, state: "s", account: "chris@ceogps.com" }));
    assert.equal(work.searchParams.get("login_hint"), "chris@ceogps.com");
    assert.match(work.searchParams.get("scope") || "", /analytics\.readonly/);
    assert.match(work.searchParams.get("scope") || "", /webmasters\.readonly/);
    assert.doesNotMatch(work.searchParams.get("scope") || "", /gmail/);
    assert.doesNotMatch(work.searchParams.get("scope") || "", /calendar/);
  });

  it("keeps a plus sign inside the authorization code", () => {
    assert.equal(rawParam("?code=abc+def%2F&state=s", "code"), "abc+def/");
    assert.equal(rawParam("?state=s&code=plain", "code"), "plain");
  });

  it("remembers the redirect from the start, and ignores a different path", () => {
    const cookie = oauthAttemptCookie(callback, "sid-1", true);
    const readBack = readOauthAttempt(cookie.split(";")[0]);
    assert.equal(readBack.redirectUri, callback);
    assert.equal(readBack.sid, "sid-1");
    const swapped = `lifeos_oauth=${encodeURIComponent(JSON.stringify({ ru: "https://lifeos.ceogps.com/steal", sid: "x" }))}`;
    assert.equal(readOauthAttempt(swapped).redirectUri, "");
  });

  it("names the secret that is missing, and lets a public client skip one", () => {
    const slack = oauthSpec("slack");
    const twitter = oauthSpec("twitter");
    assert.ok(slack && twitter);
    assert.deepEqual(oauthMissing(slack, { clientId: "x", clientSecret: "" }), ["SLACK_CLIENT_SECRET"]);
    assert.deepEqual(oauthMissing(twitter, { clientId: "x", clientSecret: "" }), []);
  });

  it("facebook scopes stay comma separated", () => {
    const spec = oauthSpec("facebook");
    assert.ok(spec);
    const url = new URL(oauthAuthorizeUrl(spec, { clientId: "cid", redirectUri: callback, state: "s", account: "" }));
    assert.match(url.searchParams.get("scope") || "", /^public_profile,email,pages_show_list$/);
  });

  it("the registered callback is the worker /oauth/callback, and a worker card only looks tested after a real check", () => {
    const worker = readFileSync(new URL("../../../attachments/working-worker.js", import.meta.url), "utf8");
    const toml = readFileSync(new URL("../../../wrangler.toml", import.meta.url), "utf8");
    const callbackUri = "https://lifeos1-api.ceogps.workers.dev/oauth/callback";
    assert.match(worker, /var OAUTH_CALLBACK = "https:\/\/lifeos1-api\.ceogps\.workers\.dev\/oauth\/callback"/);
    assert.match(toml, /OAUTH_REDIRECT_URI = "https:\/\/lifeos1-api\.ceogps\.workers\.dev\/oauth\/callback"/);
    assert.match(worker, /select_account consent/);
    assert.match(worker, /This connection stays on the account/);
    assert.doesNotMatch(worker, /oauth_success: actualProvider/);
    assert.equal(workerAccountRef("worker:dropbox:a@b.com"), null);
    assert.deepEqual(workerAccountRef("worker:google:chris@ceogps.com"), { provider: "google", email: "chris@ceogps.com" });
    const blank = {
      id: "worker:google:chrisgr33ninc@gmail.com", provider: "google" as const, email: "chrisgr33ninc@gmail.com", name: "",
      primary: true, status: "ok" as const, scopes: [], expiresAt: null, lastCheckedAt: null, lastError: "",
    };
    assert.equal(paintChecked(blank).lastCheckedAt, null);
    const painted = paintChecked(blank, { state: "ok", text: "Signed in as chrisgr33ninc@gmail.com", checkedAt: "2026-10-16T17:00:00.000Z" });
    assert.equal(painted.status, "ok");
    assert.equal(painted.lastError, "Signed in as chrisgr33ninc@gmail.com");
    assert.equal(painted.lastCheckedAt, "2026-10-16T17:00:00.000Z");
    const failed = paintChecked(blank, { state: "error", text: "Google refused the token: invalid", checkedAt: "2026-10-16T17:01:00.000Z" });
    assert.equal(failed.status, "needs_reauth");
    assert.match(failed.lastError, /refused the token/);
  });
});

