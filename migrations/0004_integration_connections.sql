-- Integration connections + the short-lived OAuth attempts that create them.
--
-- Tokens live here and are read ONLY by server routes; they are never sent to
-- the browser. One connection per owner+provider: connecting again replaces it.

create table if not exists integration_connections (
  id text primary key,
  owner_id text not null,
  provider text not null,
  account_label text not null default '',
  status text not null default 'pending',
  scopes text not null default '',
  access_token text not null default '',
  refresh_token text not null default '',
  expires_at timestamptz,
  connected_at timestamptz not null default now(),
  verified_at timestamptz,
  last_error text not null default '',
  unique (owner_id, provider)
);
create index if not exists integration_connections_owner on integration_connections (owner_id);

create table if not exists integration_oauth_states (
  state text primary key,
  owner_id text not null,
  provider text not null,
  verifier text not null default '',
  redirect_uri text not null,
  return_to text not null default '/panel/integrations',
  sid text not null default '',
  created_at timestamptz not null default now()
);
