# Integrations

One-click logins and API keys, from **Panel → Integrations**. A connection is stored on the
server for the signed-in owner, and a card is green only after that provider answers a live check.

## How it works

| Piece | Where |
| --- | --- |
| Panel | `src/components/dash/integrations-desk.tsx`, `src/components/dash/integrations/*` |
| Provider registry | `src/lib/integrations/oauth-providers.server.ts` (catalog of cards: `src/lib/integrations/catalog.ts`) |
| Token encryption | `src/lib/integrations/crypto.server.ts` |
| Database | `src/lib/integrations/store.server.ts`, `migrations/0004_integration_connections.sql` |
| Routes | `src/routes/api/integrations/*` |
| Desks that need a live token | `src/lib/lifeos/oauth.ts` (`freshToken`) |

Connect opens the provider, the browser returns to `/api/integrations/callback/<provider>`, the code is
exchanged on the server, and the token is encrypted before it is saved. Mail, calendar, Spotify and
Facebook ask `/api/integrations/token` for a fresh access token. They do not keep it in the browser.

API keys stay on the board. **Test** calls `/api/keys/check`, which talks to the real API
(OpenAI, OpenRouter, Hugging Face, NVIDIA, Ollama, and the rest of the probe list).

## Server settings

| Variable | Needed for |
| --- | --- |
| `INTEGRATIONS_ENCRYPTION_KEY` | **Required** before Connect will start. Any long random string. `BETTER_AUTH_SECRET` is the fallback. Changing it makes stored tokens unreadable. |
| `PUBLIC_APP_URL` | Optional. Public origin, e.g. `https://lifeos.ceogps.com`. Set it when the host the provider sees is not the request host. |
| `INTEGRATIONS_GOOGLE_ALLOWED` | Optional. Comma-separated Google emails. Unset means the three board mailboxes. `*` allows any. |
| `<PROVIDER>_CLIENT_ID` / `<PROVIDER>_CLIENT_SECRET` | One pair per provider. A card without its pair says which secret is missing. |

## Register this redirect URI

```
https://lifeos.ceogps.com/api/integrations/callback/<provider>
```

Examples: `.../callback/google`, `.../callback/microsoft`, `.../callback/github`.
The bare `/api/integrations/callback` still finishes a login that was started with that older URI.

Google also needs the Gmail read scope enabled. While the consent screen is in Testing, Google
expires refresh tokens after 7 days.

## Endpoints

| Route | Purpose |
| --- | --- |
| `GET /api/integrations/status` | Connections (no tokens), which providers are configured, the callback to register |
| `GET /api/integrations/start?provider=` | Begin a login. Returns the provider URL when the panel asks for JSON |
| `GET /api/integrations/callback/<provider>` | Provider returns here |
| `POST /api/integrations/verify` | Re-check a stored login |
| `POST /api/integrations/disconnect` | Revoke and drop it |
| `POST /api/integrations/token` | `{ provider, email? }` → a live access token for another desk |
| `POST /api/keys/check` | Live API-key probe |
