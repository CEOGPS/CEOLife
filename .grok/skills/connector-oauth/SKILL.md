---
name: connector-oauth
description: "LifeOS connector OAuth on the Cloudflare worker. Use when connecting, refreshing, disconnecting, or debugging Google, Discord, Facebook, Spotify, Twitter, or iCloud via Nylas."
type: workflow
lifecycle: active
---

# Connector OAuth — LifeOS provider links

Provider tokens live only on the worker, in `integrations_credentials`. The browser stores a connection card (`via: "worker"`, empty `token`). Read `references/routes.md` before changing a route and `references/providers.md` before adding a provider.

## Do not regress

1. Identity is the Supabase user from `Authorization: Bearer`, verified at `{SUPABASE}/auth/v1/user` (`sessionUserId` in `worker/lifeos1-api.js`, `verifyBearer` in `src/lib/lifeos/session-guard.server.ts`). Never accept `X-User-Id` or a body `user_id` on a route you add or touch.
2. Never write `oauth_access_token`, `oauth_refresh_token`, or `oauth_id_token` to `localStorage`. `saveOauth` strips them. `POST /api/oauth/token/save` stays 405.
3. Client secrets stay in Wrangler secrets (`{PROVIDER}_CLIENT_ID` / `{PROVIDER}_CLIENT_SECRET`). Never ship them in Vite or `oauth.ts`.
4. iCloud (`*@icloud.com`) uses Nylas (`POST /api/nylas/connect`), not `/api/oauth/start`.
5. Google may only store `chris@ceogps.com` or `chrisgr33ninc@gmail.com`. If the clicked mailbox and the Google account differ, save nothing.
6. Keep the `worker/index.ts` rewrite: inner callback uses `oauth_success`; the edge turns it into `?connected=<provider>` on `/panel/integrations`. `catchReturn` reads `connected`. Discord's registered URI `/oauth/callback` is rewritten to `/api/oauth/callback`. Register both.
7. State is `{uuid}|{encodeURIComponent(origin)}`, TTL 600s in `LIFEOS_KV` (`oauth:state:`) plus a `status=pending` row. Origins: `https://lifeos.ceogps.com`, `https://lifeos1.ceogps.com`.
8. Twitter uses PKCE (S256); verifier stays in KV (`oauth:pkce:`), not the browser. Other providers use the worker client secret.
9. Stay on the free Worker + free Supabase. No Auth0, Clerk, or WorkOS.

## Connect

1. User is signed in (`getSessionToken()`). If missing, stop: "Sign in at Integrations first."
2. `POST https://lifeos1-api.ceogps.workers.dev/api/oauth/start` with Bearer and `{ provider, origin, account_email }`.
3. Assign `window.location` to the returned `url`. Do not exchange the code in the browser.
4. Callback claims state, exchanges the code, writes tokens with the service role, deletes duplicate rows for the same user/provider/email, redirects home.
5. UI calls `pullWorkerLinks()` (`GET /api/oauth/status`). Worker is source of truth; local cache mirrors it.

## Use a token

`POST /api/oauth/token/fresh` with `{ provider, email }`. Worker returns the stored access token, or refreshes when `oauth_expires_at` is under 60s. On 401, tell the user to reconnect. Do not refresh from the client.

## Disconnect

`POST /api/oauth/disconnect` with Bearer and `{ provider, account_email }`. Delete only that user's row. Clear the local card with `disconnectOauth`.

## If the card says the token was not stored

Run `supabase-integrations-columns.sql` in the SQL editor. Do not create a second credentials table. Confirm `SUPABASE_SERVICE_ROLE_KEY` is a Worker secret and `LIFEOS_KV` is bound (state cannot be stored without it).
