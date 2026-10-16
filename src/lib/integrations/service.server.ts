import type { Sql } from "../db.ts";
import type { AccountView, IntegrationsPayload, ProviderId } from "./providers.ts";
import { PROVIDER_IDS } from "./providers.ts";
import {
  accountAllowed, buildAuthUrl, checkToken, exchangeCode, isConfigured, lookupIdentity,
  newState, overlayApps, PROVIDER_CONFIG, pkcePair, refreshAccess, type EnvReader, type Fetch,
} from "./oauth.server.ts";
import {
  deleteAccount, findAccountRow, getAccountRow, listAccounts, listAppCreds, listChecks, listExpected, makePrimary, markAccount,
  readTokens, saveAppCred, saveExpected, saveState, takeState, updateTokens, upsertAccount,
} from "./store.server.ts";
import { checkMailbox, listMailboxes, revokeMailbox } from "./nylas.server.ts";

export class IntegrationError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "IntegrationError";
    this.status = status;
  }
}

export type Ctx = { sql: Sql; read: EnvReader; secret: string; f?: Fetch };

function needSecret(ctx: Ctx) {
  if (!ctx.secret) throw new IntegrationError(503, "Set INTEGRATIONS_ENCRYPTION_KEY (any long random string) on the server before connecting accounts.");
}

export async function loadPayload(ctx: Ctx, userId: string): Promise<IntegrationsPayload> {
  const [accounts, checks, expected, boxes, saved] = await Promise.all([
    listAccounts(ctx.sql, userId),
    listChecks(ctx.sql, userId),
    listExpected(ctx.sql, userId),
    listMailboxes(ctx.read, ctx.f),
    listAppCreds(ctx.sql, userId, ctx.secret).catch(() => []),
  ]);
  const configured = Object.fromEntries(PROVIDER_IDS.map((id) => [id, isConfigured(id, ctx.read)])) as Record<ProviderId, boolean>;
  const apps: IntegrationsPayload["apps"] = {};
  for (const app of saved) if (app.clientId || app.clientSecret) apps[app.provider] = { clientId: app.clientId, hasSecret: Boolean(app.clientSecret) };
  return { accounts, checks, configured, expected, apps, mailboxes: boxes.mailboxes, mailboxNote: boxes.note, encryptionReady: Boolean(ctx.secret) };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function saveApp(ctx: Ctx, userId: string, provider: ProviderId, clientId: string, clientSecret: string) {
  const id = clientId.trim().slice(0, 200);
  const secret = clientSecret.trim().slice(0, 500);
  if (!id && !secret) {
    await saveAppCred(ctx.sql, userId, provider, "", "", ctx.secret);
    return;
  }
  if (!id) throw new IntegrationError(400, "Type the client id.");
  try {
    await saveAppCred(ctx.sql, userId, provider, id, secret, ctx.secret);
  } catch (error) {
    throw new IntegrationError(400, error instanceof Error ? error.message : "Could not save the app.");
  }
}
export async function saveExpectedEmails(ctx: Ctx, userId: string, map: Partial<Record<ProviderId, string>>) {
  for (const [provider, raw] of Object.entries(map)) {
    if (!(PROVIDER_IDS as string[]).includes(provider)) throw new IntegrationError(400, `Unknown service: ${provider}.`);
    const email = String(raw || "").trim().toLowerCase();
    if (email && !EMAIL.test(email)) throw new IntegrationError(400, `"${email}" is not a valid email address.`);
    await saveExpected(ctx.sql, userId, provider as ProviderId, email);
  }
}

export async function setPrimary(ctx: Ctx, userId: string, accountId: string) {
  if (!(await makePrimary(ctx.sql, userId, accountId))) throw new IntegrationError(404, "That account is not connected.");
}

export async function testMailbox(ctx: Ctx, mailboxId: string) {
  return checkMailbox(ctx.read, mailboxId, ctx.f);
}

export async function removeMailbox(ctx: Ctx, mailboxId: string) {
  const out = await revokeMailbox(ctx.read, mailboxId, ctx.f);
  if (!out.ok) throw new IntegrationError(502, out.text);
}

/**
 * Starts a sign-in. Three ways to choose the account:
 *  - `hintEmail`   a specific address: the provider preselects it and any other login is refused
 *  - `choose`      the person picks on the provider's own page: no hint, nothing is refused
 *  - neither       falls back to the address saved as "Account to use", if there is one
 */
export async function startFlow(ctx: Ctx, args: { userId: string; provider: ProviderId; origin: string; hintEmail?: string; choose?: boolean; clientId?: string; clientSecret?: string }) {
  if (args.provider !== "nylas") needSecret(ctx);
  const typedId = String(args.clientId || "").trim();
  const typedSecret = String(args.clientSecret || "").trim();
  if (typedId || typedSecret) {
    try {
      await saveApp(ctx, args.userId, args.provider, typedId, typedSecret);
    } catch (error) {
      if (!typedId || !typedSecret) throw error;
    }
  }
  let read = ctx.read;
  if (typedId && typedSecret) read = overlayApps(ctx.read, [{ provider: args.provider, clientId: typedId, clientSecret: typedSecret }]);
  if (!isConfigured(args.provider, read)) {
    const key = args.provider.toUpperCase();
    throw new IntegrationError(400, `Paste ${key}_CLIENT_ID and ${key}_CLIENT_SECRET into this card, then press Connect.`);
  }
  const state = newState();
  const pkce = PROVIDER_CONFIG[args.provider].pkce ? await pkcePair() : null;
  const expected = args.choose ? "" : (await listExpected(ctx.sql, args.userId))[args.provider] || "";
  const hintEmail = args.choose ? "" : (args.hintEmail || expected).trim().toLowerCase().slice(0, 200);
  await saveState(ctx.sql, { state, userId: args.userId, provider: args.provider, verifier: pkce?.verifier ?? null, hintEmail });
  return { url: buildAuthUrl({ id: args.provider, origin: args.origin, state, challenge: pkce?.challenge, hintEmail, read }) };
}

/** `account` is null for Nylas mailboxes: Nylas holds those, so nothing is stored here. */
export type CallbackResult = { ok: true; provider: ProviderId; account: AccountView | null } | { ok: false; provider: ProviderId | null; error: string };

export async function completeCallback(ctx: Ctx, args: { state: string; code: string; origin: string; sessionUserId?: string | null }): Promise<CallbackResult> {
  let provider: ProviderId | null = null;
  try {
    const st = await takeState(ctx.sql, args.state);
    if (!st) return { ok: false, provider, error: "That sign-in link expired or was already used. Press Connect again." };
    provider = st.provider;
    if (st.provider !== "nylas") needSecret(ctx);
    if (args.sessionUserId && args.sessionUserId !== st.userId) {
      return { ok: false, provider, error: "This sign-in was started by a different user. Press Connect again." };
    }
    const set = await exchangeCode({ id: st.provider, code: args.code, origin: args.origin, verifier: st.verifier, read: ctx.read, f: ctx.f });
    const who = await lookupIdentity(st.provider, set, ctx.f);
    if (st.provider === "nylas") {
      if (st.hintEmail && who.email && who.email !== st.hintEmail) {
        // Nylas already created the mailbox. Undo it so the wrong address is not left connected.
        await revokeMailbox(ctx.read, who.id, ctx.f);
        return { ok: false, provider, error: `You picked ${st.hintEmail}, but signed in as ${who.email}. Nothing was connected. Try again with ${st.hintEmail}.` };
      }
      return { ok: true, provider, account: null };
    }
    if (!accountAllowed(st.provider, who.email, ctx.read)) {
      return { ok: false, provider, error: `${who.email || "That account"} is not on the allowed list for ${st.provider}. Nothing was saved.` };
    }
    if (st.hintEmail && who.email && who.email !== st.hintEmail) {
      return { ok: false, provider, error: `You picked ${st.hintEmail}, but ${st.provider} signed in as ${who.email}. Nothing was saved. Choose ${st.hintEmail} on the account page.` };
    }
    const account = await upsertAccount(ctx.sql, ctx.secret, {
      userId: st.userId, provider: st.provider, externalId: who.id, email: who.email, name: who.name,
      scopes: set.scope, accessToken: set.accessToken, refreshToken: set.refreshToken, expiresAt: set.expiresAt,
      expectedEmail: (await listExpected(ctx.sql, st.userId))[st.provider] || "",
    });
    return { ok: true, provider, account };
  } catch (error) {
    return { ok: false, provider, error: error instanceof Error ? error.message : "The connection failed." };
  }
}

/** Returns a token that is valid right now, refreshing it first when it is about to expire. */
async function liveToken(ctx: Ctx, row: Record<string, unknown>) {
  const id = String(row.id);
  const provider = String(row.provider) as ProviderId;
  const stored = await readTokens(row, ctx.secret);
  const expiring = stored.expiresAt && stored.expiresAt.getTime() - Date.now() < 60_000;
  if (!expiring) return { accessToken: stored.accessToken, expiresAt: stored.expiresAt };
  if (!stored.refreshToken) {
    await markAccount(ctx.sql, id, false, "The login expired and this service gave no way to renew it. Reconnect.");
    throw new IntegrationError(401, "This login expired. Reconnect the account.");
  }
  try {
    const next = await refreshAccess({ id: provider, refreshToken: stored.refreshToken, read: ctx.read, f: ctx.f });
    await updateTokens(ctx.sql, ctx.secret, id, next);
    return { accessToken: next.accessToken, expiresAt: next.expiresAt };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Renewal failed.";
    await markAccount(ctx.sql, id, false, detail);
    throw new IntegrationError(401, `Renewing the login failed (${detail}). Reconnect the account.`);
  }
}

export async function testAccount(ctx: Ctx, userId: string, accountId: string) {
  needSecret(ctx);
  const row = await getAccountRow(ctx.sql, userId, accountId);
  if (!row) throw new IntegrationError(404, "That account is not connected.");
  let token: string;
  try {
    token = (await liveToken(ctx, row)).accessToken;
  } catch (error) {
    return { ok: false, text: error instanceof Error ? error.message : "The login could not be renewed." };
  }
  const health = await checkToken(String(row.provider) as ProviderId, token, ctx.f);
  await markAccount(ctx.sql, accountId, health.ok, health.text);
  return health;
}

export async function freshAccessToken(ctx: Ctx, userId: string, provider: ProviderId, email: string) {
  needSecret(ctx);
  const row = await findAccountRow(ctx.sql, userId, provider, email);
  if (!row) throw new IntegrationError(404, `${provider} is not connected.`);
  const live = await liveToken(ctx, row);
  return { accessToken: live.accessToken, expiresAt: live.expiresAt ? live.expiresAt.toISOString() : null, email: String(row.email || ""), id: String(row.id) };
}

export async function removeAccount(ctx: Ctx, userId: string, accountId: string) {
  const removed = await deleteAccount(ctx.sql, userId, accountId);
  if (!removed) throw new IntegrationError(404, "That account is not connected.");
}
