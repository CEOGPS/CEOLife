import { createFileRoute } from "@tanstack/react-router";
import { env } from "@/lib/env.server";
import { appOrigin, makeCtx } from "@/lib/integrations/http.server";
import {
  oauthAttemptCookie, oauthAuthorizeUrl, oauthCallbackUri, oauthCreds, oauthMissing, oauthSpec, oauthState, oauthVerifier,
} from "@/lib/integrations/oauth-flow.server";
import { saveState } from "@/lib/integrations/store.server";

const GMAIL = "chrisgr33ninc@gmail.com";
const OWNER = "lifeos-owner";

function back(origin: string, message: string) {
  const url = new URL("/panel/integrations", origin);
  url.searchParams.set("oauth_error", message.slice(0, 300));
  return Response.redirect(url.toString(), 302);
}

export const Route = createFileRoute("/api/oauth/start")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = appOrigin(request);
        const requestUrl = new URL(request.url);
        const provider = (requestUrl.searchParams.get("provider") || "").trim().toLowerCase();
        const spec = oauthSpec(provider);
        if (!spec) return back(origin, "That service has no sign-in here.");
        const account = (requestUrl.searchParams.get("account") || (spec.id === "google" ? GMAIL : "")).trim().toLowerCase();
        const ctx = await makeCtx();
        const creds = oauthCreds(spec, ctx.read);
        const missing = oauthMissing(spec, creds);
        if (missing.length) {
          const callback = oauthCallbackUri(origin);
          return back(origin, `${spec.id} needs ${missing.join(" and ")} on this server. Register ${callback} as the redirect URI, then press Connect again.`);
        }
        const state = oauthState();
        const pkce = spec.pkce ? await oauthVerifier() : null;
        const redirectUri = oauthCallbackUri(origin);
        await saveState(ctx.sql, { state, userId: env("AI_OWNER_ID") || OWNER, provider: spec.id, verifier: pkce?.verifier ?? null, hintEmail: account });
        const headers = new Headers({
          Location: oauthAuthorizeUrl(spec, { clientId: creds.clientId, redirectUri, state, account, challenge: pkce?.challenge }),
          "Cache-Control": "no-store",
          "Set-Cookie": oauthAttemptCookie(redirectUri, (requestUrl.searchParams.get("sid") || "").slice(0, 80), origin.startsWith("https:")),
        });
        return new Response(null, { status: 302, headers });
      },
    },
  },
});
