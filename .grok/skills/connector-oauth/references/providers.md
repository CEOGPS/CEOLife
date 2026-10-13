---
description: "Provider authorize and token URLs, scopes, and LifeOS quirks. Read when adding or changing a connector."
connections: [routes]
---

# Providers

`OAUTH_PROVIDERS`: google, microsoft, github, slack, facebook, instagram, twitter, linkedin, spotify, discord, notion. Instagram start returns 400 (Basic Display is shut down; use Facebook).

| Provider | Authorize | Token | Notes |
|---|---|---|---|
| google | accounts.google.com/o/oauth2/v2/auth | oauth2.googleapis.com/token | `access_type=offline`, `prompt=select_account consent`, `login_hint`. Scopes: openid email profile, calendar, gmail.readonly. |
| discord | discord.com/oauth2/authorize | discord.com/api/oauth2/token | Redirect `https://lifeos1-api.ceogps.workers.dev/oauth/callback`. Scopes: identify email guilds connections. |
| facebook | facebook.com/dialog/oauth | graph.facebook.com/oauth/access_token | Pin new Graph calls to `v26.0`. Current code is unversioned; do not copy that. Scopes: email public_profile pages_manage_posts. |
| spotify | accounts.spotify.com/authorize | accounts.spotify.com/api/token | user-read-private user-read-email playlist-read-private. |
| twitter | twitter.com/i/oauth2/authorize | api.twitter.com/2/oauth2/token | PKCE S256. Basic auth on token. offline.access. |
| microsoft | login.microsoftonline.com/common/oauth2/v2.0/authorize | .../token | offline_access User.Read Mail.ReadWrite Calendars.Read. |
| github | github.com/login/oauth/authorize | github.com/login/oauth/access_token | Accept JSON. repo user:email. |
| slack | slack.com/oauth/v2/authorize | slack.com/api/oauth.v2.access | Treat `ok:false` as failure. |
| linkedin | linkedin.com/oauth/v2/authorization | linkedin.com/oauth/v2/accessToken | openid profile email w_member_social. |
| notion | api.notion.com/v1/oauth/authorize | api.notion.com/v1/oauth/token | JSON body, Basic auth, `owner=user`, no scope param. |

Redirect to register (except Discord and Nylas): `https://lifeos1-api.ceogps.workers.dev/api/oauth/callback`.

Nylas: `https://lifeos1-api.ceogps.workers.dev/api/nylas/callback`. Needs `NYLAS_API_KEY`. `NYLAS_CLIENT_ID` or the application id from `GET https://api.us.nylas.com/v3/grants?limit=1`.

Secrets (wrangler secret put): `SUPABASE_SERVICE_ROLE_KEY`, each `{PROVIDER}_CLIENT_ID` and `_CLIENT_SECRET`. `OAUTH_REDIRECT_URI` is ignored unless it equals the canonical callback.

Userinfo for the stored email: Google oauth2/v3/userinfo, Discord users/@me, Spotify /v1/me, Facebook /me?fields=email, Microsoft Graph /me, LinkedIn /v2/userinfo.
