# Integrations

One-click logins and API keys, managed from **Panel → Integrations**. Connections are stored on the
server, tied to the signed-in user, and every status on screen comes from a real test.

## How it works

| Piece | Where |
| --- | --- |
| Panel UI | `src/components/dash/integrations-desk.tsx`, `src/components/dash/integrations/*` |
| Provider registry (browser-safe) | `src/lib/integrations/providers.ts` |
| OAuth engine (URLs, scopes, token exchange, refresh, live tests) | `src/lib/integrations/oauth.server.ts` |
| Token encryption (AES-256-GCM) | `src/lib/integrations/crypto.server.ts` |
| Database access | `src/lib/integrations/store.server.ts`, `migrations/0004_integrations.sql` |
| Business rules | `src/lib/integrations/service.server.ts` |
| HTTP routes | `src/routes/api/integrations/*` |
| Compatibility for other desks | `src/lib/lifeos/oauth.ts` (`freshToken`, `readOauth`, …) |

* **OAuth logins** (Google, Microsoft, GitHub, Slack, Notion, Spotify, Discord, Facebook, LinkedIn, X):
  Connect → provider consent → `/api/integrations/callback/<provider>` → tokens encrypted into
  `integration_accounts`. Expiring tokens are renewed automatically with the stored refresh token.
  If renewal fails the card turns red and shows **Reconnect**.
* **Per-service emails**: each service has an expected account, and a primary account when several are linked
  (see "Different emails for different services" below).
* **API keys** stay in the board memory (`data.keys`) exactly as before, so every desk that reads
  them keeps working. **Save & test** runs a live check and stores the result in `integration_checks`.
* Search Console and Google Analytics verify through your connected Google login. The Google token
  is read on the server and never sent to the browser for those checks.

## Different emails for different services

Nothing is tied to one address. Every connection keeps the email it signed in with, so a typical setup is:

| Service | Email | How |
| --- | --- | --- |
| Google (Gmail, Calendar, Search Console, Analytics, YouTube) | `chrisgr33ninc@gmail.com` | Google card |
| Email desk (iCloud) | `cagednreality@icloud.com` | **Mailboxes** section (Nylas) |
| Everything else (GitHub, Slack, Notion, Spotify, Microsoft, …) | `chris@ceogps.com` | Each service's card |

* **Account to use** on every card records which address that service should use. Press **Connect** and
  the provider is told to use it (Google and Microsoft preselect it). If a different account signs in,
  nothing is saved and the screen says which address signed in instead.
* **Apply my usual setup** (in *Accounts in use*) fills in the table above in one click. It only sets
  expectations; it never disconnects anything.
* A service can have several linked accounts (for example two Google accounts). The **Primary** one is
  what other desks use unless they ask for a specific address. Use **Make primary** to switch. Setting a
  service's expected email also promotes a linked account with that address.
* **Accounts in use** groups everything by email so you can see at a glance what is linked under each
  address, and warns when a service is connected with a different address than expected.

### Mailboxes (iCloud and others)

The Email desk reads and sends through Nylas, so mailboxes are managed separately from the login cards.
The panel lists the mailboxes Nylas really holds (using `NYLAS_API_KEY`), so what you see is exactly what the
Email desk will use. **Connect mailbox** starts Nylas hosted sign-in for the address you type; for iCloud,
Nylas asks for an app-specific password from appleid.apple.com. Mailboxes live in Nylas, so nothing is
stored locally for them, and a mailbox that signs in as the wrong address is removed again straight away.

## Server settings

| Variable | Needed for |
| --- | --- |
| `INTEGRATIONS_ENCRYPTION_KEY` | **Required.** Any long random string (32+ chars). Falls back to `BETTER_AUTH_SECRET`. Changing it makes stored tokens unreadable, so users reconnect. |
| `PUBLIC_APP_URL` | Optional. Your public origin, e.g. `https://app.example.com`. Set it if the redirect URI the provider sees differs from the one below. |
| `INTEGRATIONS_GOOGLE_ALLOWED` | Optional. Comma-separated Google emails allowed to connect (e.g. the board mailboxes). Unset or `*` allows any. |
| `NYLAS_API_KEY` | Already used by the Email desk. The Mailboxes section lists, tests and disconnects mailboxes with it. |
| `NYLAS_CLIENT_ID` | Your Nylas **application id**. Needed only for *Connect mailbox*. Set `NYLAS_API_URI` too if your Nylas app is in the EU (`https://api.eu.nylas.com`). |
| `<PROVIDER>_CLIENT_ID`, `<PROVIDER>_CLIENT_SECRET` | One pair per provider you want enabled: `GOOGLE_`, `MICROSOFT_`, `GITHUB_`, `SLACK_`, `NOTION_`, `SPOTIFY_`, `DISCORD_`, `FACEBOOK_`, `LINKEDIN_`, `TWITTER_`. A card without its pair shows "Not set up on the server yet". |

Apply the migration with `npm run db:migrate` (it also runs as part of `npm run build`).

## Register this redirect URI with every provider

```
https://YOUR-APP-ORIGIN/api/integrations/callback/<provider>
```

For example `.../callback/google`, `.../callback/spotify`, `.../callback/twitter`. For mailboxes, add
`.../callback/nylas` to the **Callback URIs** of your application in the Nylas dashboard. For local work use
`http://127.0.0.1:8080/...` where the provider allows it.

## Provider notes

* **Google**: create an OAuth client (type *Web application*) in Google Cloud Console and enable the Gmail,
  Calendar, Search Console and Analytics APIs. While the consent screen is in *Testing*, Google expires
  refresh tokens after **7 days**, which will keep turning the card red. Move the app to *In production*
  (an unverified app is limited to 100 users and shows a warning screen). `gmail.readonly` is a restricted
  scope, so a public app needs Google's verification.
* **Microsoft**: Azure app registration, *Accounts in any organizational directory and personal accounts*.
  Add the Web redirect URI and a client secret.
* **GitHub**: *OAuth App* (not GitHub App). Tokens do not expire, so no refresh is needed.
* **Slack**: the app must be installed through the OAuth flow; the card shows the workspace name.
* **Notion**: *Public integration*. You choose which pages to share during consent.
* **Facebook**: requested scopes are `public_profile`, `email`, `pages_show_list`. Add more (for example
  `pages_manage_posts`) in `oauth.server.ts` once they pass Meta app review. Tokens are exchanged for the
  ~60-day long-lived kind automatically.
* **LinkedIn**: enable *Sign In with LinkedIn using OpenID Connect* and *Share on LinkedIn*.
* **X (Twitter)**: OAuth 2.0 with PKCE; set the app type to *Web App* (confidential client).
* **Instagram** Basic Display no longer exists. Use Facebook with Instagram Business instead.
* **iCloud** is not an OAuth service. It connects through Nylas in the **Mailboxes** section.

## Endpoints

All require a signed-in user and a same-site browser request.

| Route | Purpose |
| --- | --- |
| `GET /api/integrations` | Accounts, last check results, which providers are configured |
| `POST /api/integrations/start` | `{ provider, hint_email? }` → `{ url }` to open |
| `GET /api/integrations/callback/<provider>` | Provider returns here, then redirects to the panel |
| `POST /api/integrations/test` | Test an account (`account_id`), a mailbox (`mailbox_id`), a key (`service`, `key`), or a Google-verified / multi-field service (`account_kind`) |
| `POST /api/integrations/disconnect` | `{ account_id }`, `{ mailbox_id }`, or `{ service }` (clears a key's saved result) |
| `POST /api/integrations/settings` | `{ provider, expected_email }`, `{ expected: { provider: email, … } }`, or `{ account_id, primary: true }` |
| `POST /api/integrations/token` | `{ provider, email? }` → a short-lived access token for other desks |

`/api/keys/check` and `/api/keys/account` now also require a signed-in session.

## Adding another OAuth provider

1. Add it to `PROVIDERS` in `providers.ts` (and the `ProviderId` union).
2. Add its entry to `PROVIDER_CONFIG` in `oauth.server.ts`: URLs, scopes, how to read the account, and one live check.
3. Add tests next to the others in `integrations.test.ts`, then set its `<PROVIDER>_CLIENT_ID/SECRET`.

## Checking it works

```
npm run typecheck
npm test            # includes src/lib/integrations/integrations.test.ts
```

Then open Integrations, press **Connect** on a configured provider, finish consent, and press **Test now**.
