-- Run in the Supabase SQL editor ONLY if the callback reports "token was not stored".
-- Idempotent: adds any column the worker writes to integrations_credentials that is missing.
alter table public.integrations_credentials
  add column if not exists label text,
  add column if not exists oauth_provider text,
  add column if not exists oauth_access_token text,
  add column if not exists oauth_refresh_token text,
  add column if not exists oauth_expires_at timestamptz,
  add column if not exists oauth_scope text,
  add column if not exists oauth_id_token text,
  add column if not exists oauth_state text,
  add column if not exists oauth_redirect_uri text,
  add column if not exists status text,
  add column if not exists email text,
  add column if not exists updated_at timestamptz default now();
