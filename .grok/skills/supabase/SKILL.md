---
name: supabase
description: "LifeOS Supabase project: email OTP session, service-role worker writes, and integrations_credentials. Use for auth, SQL, RLS, or any table the dashboard reads."
type: knowledge
lifecycle: active
---

# Supabase — LifeOS

Project URL: `https://mhvcdstgkyplhzjptgfr.supabase.co` (ref `mhvcdstgkyplhzjptgfr`). Constants live in `src/lib/lifeos/oauth.ts`. Do not paste new keys into git.

## Session

Allowlist: `chris@ceogps.com`, `chrisgr33ninc@gmail.com`, `cagednreality@icloud.com` (`allowedEmail`).

1. `POST /auth/v1/otp` with the anon key, `{ email, create_user: true }`.
2. `POST /auth/v1/verify` `{ type: "email", email, token }`.
3. Store `{ access_token, refresh_token, expires_at, user }` at `sb-mhvcdstgkyplhzjptgfr-auth-token`.
4. `getSessionToken` refreshes via `POST /auth/v1/token?grant_type=refresh_token` when expiry is under 60s. A 400 or 401 clears the session.
5. Worker and server checks call `GET /auth/v1/user` with that bearer. That id is `user_id`.

Sign-out removes the session key and `lifeos.oauth`.

## Keys

| Key | Where |
|---|---|
| Anon / publishable | Browser and `/api/config`. Worker reads `SUPABASE_ANON_KEY` or `VITE_SUPABASE_ANON_KEY` (also `SUPABASE_PUBLISHABLE_KEY`). |
| Service role | Worker secret only: `SUPABASE_SERVICE_ROLE_KEY` (fallbacks in `supabaseKey()`). Bypasses RLS. Never import it in `src/` client code. |

`/api/config` may return the URL and the anon key. It must not return the service role.

## Credentials table

`public.integrations_credentials`. If a callback says the token was not stored, run `supabase-integrations-columns.sql` (adds `oauth_*`, `email`, `status`, `label`, `updated_at` if missing). Expected writes:

- pending: `user_id`, `integration_name`, `email`, `label`, `oauth_provider`, `status=pending`, `oauth_state`, `oauth_redirect_uri`
- connected: `status=on`, `oauth_access_token`, `oauth_refresh_token`, `oauth_expires_at`, `oauth_scope`, `oauth_id_token`, `email`, `oauth_state=null`

The browser never `select`s token columns. Worker selects them with the service role after `sessionUserId`.

## Rules

- Scope every user table by the verified `user_id`. Unowned rows are not allowed for mail, tokens, or finance.
- Prefer the free tier: one project, no extra paid auth, no new Realtime channels unless a screen already needs them.
- Do not log JWTs. Do not add a second Supabase client that embeds the service role.
- `user_settings` has shipped with both `key`/`value` and `key_name`/`key_value`. Read the live columns before writing a migration. Do not assume one pair.
- Schema detail: `references/schema.md`.
