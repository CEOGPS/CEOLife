---
description: "LifeOS OAuth and Nylas HTTP contract. Read before editing worker routes or src/lib/lifeos/oauth.ts."
connections: [providers]
---

# Routes

Base: `https://lifeos1-api.ceogps.workers.dev`

| Method | Path | Auth | Behavior |
|---|---|---|---|
| POST | `/api/oauth/start` | Bearer | Body `{provider, origin, account_email}`. Returns `{url}`. |
| GET | `/api/oauth/start` | Bearer | Same, query params. Prefer POST from the app. |
| GET | `/api/oauth/callback` | state | Public. Exchanges code. Redirects to `/panel/integrations`. |
| GET | `/oauth/callback` | state | Discord URI. `worker/index.ts` rewrites to `/api/oauth/callback`. |
| GET | `/api/oauth/status` | Bearer | `{accounts:[{provider,email}]}`. No tokens. |
| GET | `/api/oauth/linked` | Bearer | Linked rows for the session user. |
| POST | `/api/oauth/token/fresh` | Bearer | `{provider,email}` → `{access_token,email,expires_at}` or 401/404. |
| POST | `/api/oauth/disconnect` | Bearer | `{provider,account_email}` deletes that user's row. |
| POST | `/api/oauth/token` | Bearer | Legacy code exchange. Callback is the real path. |
| POST | `/api/oauth/token/save` | Bearer | 405. Do not revive client-supplied tokens. |
| POST | `/api/nylas/connect` | Bearer | iCloud only. Returns `{url}`. |
| GET | `/api/nylas/callback` | state | Stores grant as `oauth_refresh_token = grant:<id>`. Redirects `?connected=nylas`. |

Callback edge (`worker/index.ts`): if `oauth_success` or `connected` is set, redirect to `{origin}/panel/integrations?connected=<provider>`. If `oauth_error`, pass that through. Origin comes from the state suffix and must be in `CORS_ORIGINS` (default the two lifeos hosts).

Client (`src/lib/lifeos/oauth.ts`):

- `startOAuth` / `startNylas` / `pullWorkerLinks` / `freshToken` / `catchReturn` / `getSessionToken`
- Local card key `lifeos.oauth`. Session key `sb-mhvcdstgkyplhzjptgfr-auth-token`.
- `finishOAuth` returns null. Do not restore a browser code exchange.

Public worker paths that stay unauthenticated: `/health`, `/test`, `/api/config` (url + anon key only), the OAuth and Nylas callbacks. Everything else you touch must call `sessionUserId`.
