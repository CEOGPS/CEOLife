import { createFileRoute } from "@tanstack/react-router";
import { authorizeUrl, credentials, missingCredentials, oauthProvider, redirectUriFor } from "@/lib/integrations/oauth-providers.server";
import { resolveOwner } from "@/lib/integrations/owner.server";
import { publicOrigin } from "@/lib/integrations/public-origin.server";
import { saveState } from "@/lib/integrations/store.server";

/**
 * Begins an authorization: creates a single-use attempt and hands the browser to
 * the provider's own consent screen.
 *
 * `sid` is a random value the panel keeps; it comes back on the connection so
 * the panel only claims the attempt it started. Nothing here trusts a
 * client-supplied user id — the owner is resolved server-side.
 */

function base64url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64url");
}

function randomBytes(size: number) {
  return crypto.getRandomValues(new Uint8Array(size));
}

async function codeChallenge(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

function safeReturn(value: string | null) {
  const path = (value || "/panel/integrations").trim();
  return path.startsWith("/") && !path.startsWith("//") ? path.slice(0, 200) : "/panel/integrations";
}

function problem(origin: string, returnTo: string, provider: string, message: string, asJson: boolean) {
  if (asJson) {
    return Response.json({ ok: false, error: message, provider }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const url = new URL(returnTo, origin);
  url.searchParams.set("oauth_error", message);
  if (provider) url.searchParams.set("oauth_provider", provider);
  return Response.redirect(url.toString(), 302);
}

export const Route = createFileRoute("/api/integrations/start")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const requestUrl = new URL(request.url);
        // The public origin, not the inbound one — the callback must match the
        // URL registered with the provider (see public-origin.server.ts).
        const origin = publicOrigin(request);
        const asJson = (request.headers.get("accept") || "").includes("application/json");
        const returnTo = safeReturn(requestUrl.searchParams.get("return"));
        const providerId = (requestUrl.searchParams.get("provider") || "").trim().toLowerCase();
        const sid = (requestUrl.searchParams.get("sid") || "").slice(0, 80);
        const spec = oauthProvider(providerId);
        if (!spec) return problem(origin, returnTo, providerId, "That service has no authorization flow here.", asJson);
        const owner = await resolveOwner();
        if (!owner) return problem(origin, returnTo, providerId, "Sign in before connecting an integration.", asJson);
        const creds = await credentials(spec);
        const missing = missingCredentials(spec, creds);
        if (missing.length) {
          return problem(origin, returnTo, providerId, `${spec.name} needs ${missing.join(" and ")} on the server. Add them in Secrets, then reconnect.`, asJson);
        }
        const state = base64url(randomBytes(24));
        const verifier = spec.pkce ? base64url(randomBytes(32)) : "";
        const redirectUri = redirectUriFor(origin);
        await saveState({ state, ownerId: owner, provider: spec.id, verifier, redirectUri, returnTo, sid, createdAt: new Date().toISOString() });
        const challenge = verifier ? await codeChallenge(verifier) : undefined;
        const hint = (requestUrl.searchParams.get("hint") || "").trim().toLowerCase().slice(0, 200);
        let url = authorizeUrl(spec, { redirectUri, state, codeChallenge: challenge, clientId: creds.clientId });
        if (hint && (spec.id === "google" || spec.id === "microsoft") && hint.includes("@")) {
          const next = new URL(url);
          next.searchParams.set("login_hint", hint);
          url = next.toString();
        }
        if (asJson) return Response.json({ ok: true, url }, { headers: { "Cache-Control": "no-store" } });
        return Response.redirect(url, 302);
      },
    },
  },
});
