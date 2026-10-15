-- Integrations: server-side OAuth accounts (tokens encrypted at rest), short-lived
-- OAuth handshakes, and the last live check for every card (OAuth or API key).

create table if not exists integration_accounts (
  id text primary key,
  user_id text not null,
  provider text not null,
  external_id text not null,
  email text not null default '',
  display_name text not null default '',
  scopes text not null default '',
  access_token_enc text not null,
  refresh_token_enc text,
  expires_at timestamptz,
  status text not null default 'ok',
  last_checked_at timestamptz,
  last_error text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, external_id)
);
create index if not exists integration_accounts_user_idx on integration_accounts (user_id);

drop table if exists integration_oauth_states;
create table integration_oauth_states (
  state text primary key,
  user_id text not null,
  provider text not null,
  verifier text,
  hint_email text not null default '',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists integration_checks (
  user_id text not null,
  subject text not null,
  state text not null,
  detail text not null default '',
  checked_at timestamptz not null default now(),
  primary key (user_id, subject)
);
