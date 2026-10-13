/**
 * Server-side storage for integration connections and the short-lived OAuth
 * attempts that create them.
 *
 * Access tokens are read here and handed straight to a provider call — they are
 * never returned to the browser. `listConnections` deliberately selects the
 * shape the panel needs, not the secrets.
 */

import { getSql } from "@/lib/db";

export type ConnectionSummary = {
  provider: string;
  label: string;
  status: string;
  scopes: string;
  connectedAt: string;
  verifiedAt: string | null;
  expiresAt: string | null;
  lastError: string;
};

export type ConnectionRecord = ConnectionSummary & {
  accessToken: string;
  refreshToken: string;
};

export type NewConnection = {
  provider: string;
  label: string;
  status: "connected" | "error";
  scopes: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string | null;
  lastError: string;
  verifiedAt: string | null;
};

export type OAuthState = {
  state: string;
  ownerId: string;
  provider: string;
  verifier: string;
  redirectUri: string;
  returnTo: string;
  sid: string;
  createdAt: string;
};

function iso(value: unknown): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function maybeIso(value: unknown): string | null {
  const stamp = iso(value);
  return stamp || null;
}

type Row = {
  provider: string;
  account_label: string;
  status: string;
  scopes: string;
  connected_at: unknown;
  verified_at: unknown;
  expires_at: unknown;
  last_error: string;
  access_token?: string;
  refresh_token?: string;
};

function summary(row: Row): ConnectionSummary {
  return {
    provider: row.provider,
    label: row.account_label || "",
    status: row.status,
    scopes: row.scopes || "",
    connectedAt: iso(row.connected_at),
    verifiedAt: maybeIso(row.verified_at),
    expiresAt: maybeIso(row.expires_at),
    lastError: row.last_error || "",
  };
}

export async function listConnections(ownerId: string): Promise<ConnectionSummary[]> {
  const sql = await getSql();
  const rows = await sql<Row>`
    select provider, account_label, status, scopes, connected_at, verified_at, expires_at, last_error
    from integration_connections
    where owner_id = ${ownerId}
    order by provider
  `;
  return rows.map(summary);
}

export async function getConnection(ownerId: string, provider: string): Promise<ConnectionRecord | null> {
  const sql = await getSql();
  const rows = await sql<Row>`
    select provider, account_label, status, scopes, connected_at, verified_at, expires_at, last_error, access_token, refresh_token
    from integration_connections
    where owner_id = ${ownerId} and provider = ${provider}
    limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  return { ...summary(row), accessToken: row.access_token || "", refreshToken: row.refresh_token || "" };
}

/** Insert or replace this owner's connection for the provider. */
export async function saveConnection(ownerId: string, row: NewConnection): Promise<void> {
  const sql = await getSql();
  await sql`
    insert into integration_connections
      (id, owner_id, provider, account_label, status, scopes, access_token, refresh_token, expires_at, connected_at, verified_at, last_error)
    values
      (${`${ownerId}:${row.provider}`}, ${ownerId}, ${row.provider}, ${row.label}, ${row.status}, ${row.scopes},
       ${row.accessToken}, ${row.refreshToken}, ${row.expiresAt}, now(), ${row.verifiedAt}, ${row.lastError})
    on conflict (owner_id, provider) do update set
      account_label = excluded.account_label,
      status = excluded.status,
      scopes = excluded.scopes,
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      expires_at = excluded.expires_at,
      verified_at = excluded.verified_at,
      last_error = excluded.last_error
  `;
}

/** Refresh the stored tokens/label after a successful re-check. */
export async function touchConnection(
  ownerId: string,
  provider: string,
  patch: { accessToken?: string; refreshToken?: string; expiresAt?: string | null; label?: string; status?: string; lastError?: string; verifiedAt?: string | null },
): Promise<void> {
  const sql = await getSql();
  const current = await getConnection(ownerId, provider);
  if (!current) return;
  await sql`
    update integration_connections set
      access_token = ${patch.accessToken ?? current.accessToken},
      refresh_token = ${patch.refreshToken ?? current.refreshToken},
      expires_at = ${patch.expiresAt !== undefined ? patch.expiresAt : current.expiresAt},
      account_label = ${patch.label ?? current.label},
      status = ${patch.status ?? current.status},
      last_error = ${patch.lastError ?? current.lastError},
      verified_at = ${patch.verifiedAt !== undefined ? patch.verifiedAt : current.verifiedAt}
    where owner_id = ${ownerId} and provider = ${provider}
  `;
}

export async function deleteConnection(ownerId: string, provider: string): Promise<void> {
  const sql = await getSql();
  await sql`delete from integration_connections where owner_id = ${ownerId} and provider = ${provider}`;
}

export async function saveState(state: OAuthState): Promise<void> {
  const sql = await getSql();
  await sql`delete from integration_oauth_states where created_at < now() - interval '30 minutes'`;
  await sql`
    insert into integration_oauth_states (state, owner_id, provider, verifier, redirect_uri, return_to, sid)
    values (${state.state}, ${state.ownerId}, ${state.provider}, ${state.verifier}, ${state.redirectUri}, ${state.returnTo}, ${state.sid})
  `;
}

/** Consume an attempt: it exists exactly once, and only for ten minutes. */
export async function takeState(state: string): Promise<OAuthState | null> {
  const value = state.trim();
  if (!value) return null;
  const sql = await getSql();
  const rows = await sql<{ state: string; owner_id: string; provider: string; verifier: string; redirect_uri: string; return_to: string; sid: string; created_at: unknown; fresh: boolean }>`
    delete from integration_oauth_states
    where state = ${value}
    returning state, owner_id, provider, verifier, redirect_uri, return_to, sid, created_at,
      (created_at > now() - interval '10 minutes') as fresh
  `;
  const row = rows[0];
  if (!row || !row.fresh) return null;
  return {
    state: row.state,
    ownerId: row.owner_id,
    provider: row.provider,
    verifier: row.verifier || "",
    redirectUri: row.redirect_uri,
    returnTo: row.return_to || "/panel/integrations",
    sid: row.sid || "",
    createdAt: iso(row.created_at),
  };
}
