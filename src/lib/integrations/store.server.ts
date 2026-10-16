import type { Sql } from "../db.ts";
import type { AccountView, CheckView, ProviderId } from "./providers.ts";
import { isProviderId } from "./providers.ts";
import { decryptText, encryptText } from "./crypto.server.ts";

type Row = Record<string, unknown>;

const iso = (value: unknown) => (value ? new Date(value as string | number | Date).toISOString() : null);
const text = (value: unknown) => (value == null ? "" : String(value));

export function toAccountView(row: Row): AccountView | null {
  const provider = text(row.provider);
  if (!isProviderId(provider)) return null;
  return {
    id: text(row.id),
    provider,
    email: text(row.email),
    name: text(row.display_name),
    primary: row.is_primary === true,
    status: row.status === "needs_reauth" ? "needs_reauth" : "ok",
    scopes: text(row.scopes).split(/[ ,]+/).filter(Boolean),
    expiresAt: iso(row.expires_at),
    lastCheckedAt: iso(row.last_checked_at),
    lastError: text(row.last_error),
  };
}

export async function saveState(sql: Sql, row: { state: string; userId: string; provider: ProviderId; verifier: string | null; hintEmail: string }) {
  await sql`delete from integration_oauth_states where expires_at < now()`;
  await sql`insert into integration_oauth_states (state, user_id, provider, verifier, hint_email, expires_at)
    values (${row.state}, ${row.userId}, ${row.provider}, ${row.verifier}, ${row.hintEmail}, now() + interval '10 minutes')`;
}

/** One-shot: reading a state deletes it, so a callback URL can never be replayed. */
export async function takeState(sql: Sql, state: string) {
  const rows = await sql<Row>`delete from integration_oauth_states where state = ${state} returning user_id, provider, verifier, hint_email, expires_at`;
  const row = rows[0];
  if (!row) return null;
  if (new Date(row.expires_at as string).getTime() < Date.now()) return null;
  const provider = text(row.provider);
  if (!isProviderId(provider)) return null;
  return { userId: text(row.user_id), provider, verifier: row.verifier ? text(row.verifier) : null, hintEmail: text(row.hint_email) };
}

export async function upsertAccount(sql: Sql, secret: string, args: {
  userId: string; provider: ProviderId; externalId: string; email: string; name: string; scopes: string;
  accessToken: string; refreshToken: string | null; expiresAt: Date | null; expectedEmail?: string;
}) {
  const accessEnc = await encryptText(args.accessToken, secret);
  const refreshEnc = args.refreshToken ? await encryptText(args.refreshToken, secret) : null;
  const id = `acc_${crypto.randomUUID()}`;
  const rows = await sql<Row>`insert into integration_accounts
      (id, user_id, provider, external_id, email, display_name, scopes, access_token_enc, refresh_token_enc, expires_at, status, last_checked_at, last_error)
    values (${id}, ${args.userId}, ${args.provider}, ${args.externalId}, ${args.email}, ${args.name}, ${args.scopes}, ${accessEnc}, ${refreshEnc}, ${args.expiresAt}, 'ok', now(), '')
    on conflict (user_id, provider, external_id) do update set
      email = excluded.email,
      display_name = excluded.display_name,
      scopes = excluded.scopes,
      access_token_enc = excluded.access_token_enc,
      refresh_token_enc = coalesce(excluded.refresh_token_enc, integration_accounts.refresh_token_enc),
      expires_at = excluded.expires_at,
      status = 'ok',
      last_checked_at = now(),
      last_error = '',
      updated_at = now()
    returning *`;
  const saved = rows[0] as Row;
  await settlePrimary(sql, args.userId, args.provider, text(saved.id), args.email, args.expectedEmail || "");
  const fresh = await sql<Row>`select * from integration_accounts where id = ${text(saved.id)}`;
  return toAccountView(fresh[0] as Row) as AccountView;
}

/**
 * Picks the primary account after a connect: the one matching the expected email wins,
 * otherwise the first account linked for that service becomes primary.
 */
async function settlePrimary(sql: Sql, userId: string, provider: ProviderId, accountId: string, email: string, expected: string) {
  const current = await sql<Row>`select id from integration_accounts where user_id = ${userId} and provider = ${provider} and is_primary`;
  const matches = Boolean(expected) && email.toLowerCase() === expected.toLowerCase();
  if (current.length && !matches) return;
  if (current.length && text(current[0].id) === accountId) return;
  await sql`update integration_accounts set is_primary = false where user_id = ${userId} and provider = ${provider} and id <> ${accountId}`;
  await sql`update integration_accounts set is_primary = true where id = ${accountId}`;
}

export async function makePrimary(sql: Sql, userId: string, accountId: string) {
  const row = await getAccountRow(sql, userId, accountId);
  if (!row) return false;
  const provider = text(row.provider);
  await sql`update integration_accounts set is_primary = false where user_id = ${userId} and provider = ${provider} and id <> ${accountId}`;
  await sql`update integration_accounts set is_primary = true where id = ${accountId}`;
  return true;
}

export async function listAccounts(sql: Sql, userId: string) {
  const rows = await sql<Row>`select * from integration_accounts where user_id = ${userId} order by provider, is_primary desc, email`;
  return rows.map(toAccountView).filter((row): row is AccountView => Boolean(row));
}

export async function getAccountRow(sql: Sql, userId: string, id: string) {
  const rows = await sql<Row>`select * from integration_accounts where user_id = ${userId} and id = ${id}`;
  return rows[0] || null;
}

export async function findAccountRow(sql: Sql, userId: string, provider: ProviderId, email: string) {
  const rows = email
    ? await sql<Row>`select * from integration_accounts where user_id = ${userId} and provider = ${provider} and lower(email) = ${email.toLowerCase()} order by updated_at desc limit 1`
    : await sql<Row>`select * from integration_accounts where user_id = ${userId} and provider = ${provider} and status = 'ok' order by is_primary desc, updated_at desc limit 1`;
  return rows[0] || null;
}

export async function readTokens(row: Row, secret: string) {
  return {
    accessToken: await decryptText(text(row.access_token_enc), secret),
    refreshToken: row.refresh_token_enc ? await decryptText(text(row.refresh_token_enc), secret) : null,
    expiresAt: row.expires_at ? new Date(row.expires_at as string) : null,
  };
}

export async function updateTokens(sql: Sql, secret: string, id: string, args: { accessToken: string; refreshToken: string | null; expiresAt: Date | null }) {
  const accessEnc = await encryptText(args.accessToken, secret);
  const refreshEnc = args.refreshToken ? await encryptText(args.refreshToken, secret) : null;
  await sql`update integration_accounts set access_token_enc = ${accessEnc}, refresh_token_enc = coalesce(${refreshEnc}, refresh_token_enc),
    expires_at = ${args.expiresAt}, status = 'ok', last_error = '', updated_at = now() where id = ${id}`;
}

export async function markAccount(sql: Sql, id: string, ok: boolean, detail: string) {
  await sql`update integration_accounts set status = ${ok ? "ok" : "needs_reauth"}, last_checked_at = now(), last_error = ${ok ? "" : detail}, updated_at = now() where id = ${id}`;
}

export async function deleteAccount(sql: Sql, userId: string, id: string) {
  const rows = await sql<Row>`delete from integration_accounts where user_id = ${userId} and id = ${id} returning id, provider, is_primary`;
  if (!rows.length) return false;
  if (rows[0].is_primary === true) {
    // Hand the primary role to the healthiest remaining account for that service.
    await sql`update integration_accounts set is_primary = true where id = (
      select id from integration_accounts where user_id = ${userId} and provider = ${text(rows[0].provider)}
      order by (status = 'ok') desc, updated_at desc limit 1)`;
  }
  return true;
}

export async function listExpected(sql: Sql, userId: string): Promise<Partial<Record<ProviderId, string>>> {
  const rows = await sql<Row>`select provider, expected_email from integration_prefs where user_id = ${userId}`;
  const out: Partial<Record<ProviderId, string>> = {};
  for (const row of rows) {
    const provider = text(row.provider);
    if (isProviderId(provider) && text(row.expected_email)) out[provider] = text(row.expected_email);
  }
  return out;
}

export async function saveExpected(sql: Sql, userId: string, provider: ProviderId, email: string) {
  if (!email) {
    await sql`delete from integration_prefs where user_id = ${userId} and provider = ${provider}`;
    return;
  }
  await sql`insert into integration_prefs (user_id, provider, expected_email) values (${userId}, ${provider}, ${email})
    on conflict (user_id, provider) do update set expected_email = excluded.expected_email, updated_at = now()`;
  // If the expected mailbox is already linked, make it the primary one right away.
  const match = await sql<Row>`select id from integration_accounts where user_id = ${userId} and provider = ${provider} and lower(email) = ${email} limit 1`;
  if (match.length) await makePrimary(sql, userId, text(match[0].id));
}

export async function recordCheck(sql: Sql, userId: string, subject: string, state: CheckView["state"], detail: string) {
  await sql`insert into integration_checks (user_id, subject, state, detail, checked_at) values (${userId}, ${subject}, ${state}, ${detail.slice(0, 400)}, now())
    on conflict (user_id, subject) do update set state = excluded.state, detail = excluded.detail, checked_at = now()`;
}

export async function listChecks(sql: Sql, userId: string): Promise<Record<string, CheckView>> {
  const rows = await sql<Row>`select subject, state, detail, checked_at from integration_checks where user_id = ${userId}`;
  const out: Record<string, CheckView> = {};
  for (const row of rows) {
    const state = text(row.state);
    out[text(row.subject)] = { state: state === "ok" || state === "error" ? state : "saved", text: text(row.detail), checkedAt: iso(row.checked_at) as string };
  }
  return out;
}

export async function clearCheck(sql: Sql, userId: string, subject: string) {
  await sql`delete from integration_checks where user_id = ${userId} and subject = ${subject}`;
}

export type AppCred = { provider: ProviderId; clientId: string; clientSecret: string };

export async function listAppCreds(sql: Sql, userId: string, secret: string): Promise<AppCred[]> {
  const rows = await sql<Row>`select provider, client_id, client_secret_enc from integration_apps where user_id = ${userId}`;
  const out: AppCred[] = [];
  for (const row of rows) {
    const provider = text(row.provider);
    if (!isProviderId(provider)) continue;
    const enc = text(row.client_secret_enc);
    let clientSecret = "";
    if (enc && secret) {
      try { clientSecret = await decryptText(enc, secret); } catch { clientSecret = ""; }
    }
    out.push({ provider, clientId: text(row.client_id), clientSecret });
  }
  return out;
}

export async function saveAppCred(sql: Sql, userId: string, provider: ProviderId, clientId: string, clientSecret: string, secret: string) {
  if (!clientId && !clientSecret) {
    await sql`delete from integration_apps where user_id = ${userId} and provider = ${provider}`;
    return;
  }
  const existing = await sql<Row>`select client_secret_enc from integration_apps where user_id = ${userId} and provider = ${provider}`;
  const enc = clientSecret ? await encryptText(clientSecret, secret) : text(existing[0]?.client_secret_enc);
  if (!enc) throw new Error("Type the client secret too. Both are required the first time.");
  await sql`insert into integration_apps (user_id, provider, client_id, client_secret_enc) values (${userId}, ${provider}, ${clientId}, ${enc})
    on conflict (user_id, provider) do update set client_id = excluded.client_id, client_secret_enc = excluded.client_secret_enc, updated_at = now()`;
}
