Copy each file over the same path in C:/Users/chris/CEOLife (folder structure is preserved), then:
  1) npx wrangler deploy        (deploys worker/lifeos1-api.js)
  2) deploy the site as usual
Secrets required on the worker (wrangler secret put NAME):
  SUPABASE_SERVICE_ROLE_KEY, GOOGLE_CLIENT_ID/SECRET, DISCORD_CLIENT_ID/SECRET,
  FACEBOOK_CLIENT_ID/SECRET, SPOTIFY_CLIENT_ID/SECRET  (+ others you use, e.g. TWITTER_, NOTION_)
Redirect URIs to register at each provider:
  https://lifeos1-api.ceogps.workers.dev/api/oauth/callback   (all providers)
  https://lifeos1-api.ceogps.workers.dev/oauth/callback       (Discord - keep both)
Optional: supabase-integrations-columns.sql (only if the callback says "token was not stored").
oauth-fixes.diff is the same change as a unified diff for review.
