---
name: claude-advanced-oauth-engineering-and-identity-orchestrator
description: "Security review for LifeOS identity and OAuth. Use when designing a login, token, session, scope, or connector change, or when an auth bug might leak a token or trust the client."
type: orchestrator
lifecycle: active
---

# Identity orchestrator — LifeOS

Decide the flow, then hand the edit to [[connector-oauth:]] for provider routes and [[supabase:]] for rows and the OTP session. Do not invent a second auth stack.

## Pick the flow

| Need | Flow | Where |
|---|---|---|
| Person using the dashboard | Supabase email OTP, allowlist only | `requestSignIn` / `confirmSignIn` |
| Link Google, Discord, Facebook, Spotify, or another OAuth provider | Authorization code on the worker | `POST /api/oauth/start` |
| Link iCloud mail | Nylas hosted auth | `POST /api/nylas/connect` |
| Call a provider API | Worker mints a fresh access token | `POST /api/oauth/token/fresh` |
| Machine-to-machine | Do not add `client_credentials` for a user connector | — |

Implicit flow, client-side code exchange, and tokens in `localStorage` are rejected.

## Review before you ship

1. Every new or touched route calls `sessionUserId` or `requireSession`. Public exceptions: health, test, `/api/config`, OAuth callback, Nylas callback.
2. Queries that read or write tokens include `user_id=eq.{session user}`. A client-supplied id is not a filter.
3. Responses that list connections omit access, refresh, and id tokens. `GET /api/oauth/status` is the shape.
4. `state` is one-time, 10 minutes, bound to an allowlisted origin. PKCE verifier never leaves the worker.
5. Logs and error strings contain no token, code, or refresh secret. Log the provider and the HTTP status only.
6. Scopes stay the smallest set already in `getScopes`. Adding a scope is a product decision, not a drive-by.
7. Google account mismatch and non-board Google mail abort before `status=on`.
8. Service role and client secrets stay in Worker secrets. The anon key may be public. The service role may not.
9. CORS stays the two LifeOS origins. Do not set `Access-Control-Allow-Origin: *` on credentialed routes.
10. Cost stays zero: free Supabase auth, free Worker, no paid IdP.

## Known debt (fix when you touch the file)

Many non-OAuth routers still authorize with `X-User-Id` (`/api/meta`, `/api/x`, `/api/music`, `/api/social`, and others). Replace that check with `sessionUserId` in the same edit. Do not copy the header check into new code.

Facebook Graph calls are unversioned. Pin `https://graph.facebook.com/v26.0` when you edit them.

## Threat table

See `references/threats.md`.
