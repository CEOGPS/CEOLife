-- OAuth app credentials typed on the card (client id is public, secret is encrypted).

create table if not exists integration_apps (
  user_id text not null,
  provider text not null,
  client_id text not null default '',
  client_secret_enc text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);
