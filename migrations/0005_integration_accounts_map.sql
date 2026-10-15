-- Which account each service should use, and which linked account is the primary one.

alter table integration_accounts add column if not exists is_primary boolean not null default false;

-- At most one primary account per user and service.
create unique index if not exists integration_accounts_one_primary
  on integration_accounts (user_id, provider) where is_primary;

create table if not exists integration_prefs (
  user_id text not null,
  provider text not null,
  expected_email text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);
