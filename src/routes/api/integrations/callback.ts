import { createFileRoute } from "@tanstack/react-router";
import { credentials, exchangeCode, identify, oauthProvider, redirectUriFor, upgradeFacebookToken } from "@/lib/integrations/oauth-providers.server";
import { publicOrigin } from "@/lib/integrations/public-origin.server";
import { saveConnection, takeState } from "@/lib/integrations/store.server";

/**
 * The provider sends the browser back here.
 *
 * The attempt is consumed (single use, ten minutes), the code is exchanged
 * server-side, and the token is proven with a real provider call before the
 * connection is ever marked connected. A failure is stored as an error with its
 * reason — never as a connection.
 */

function page(input: { provider: string; ok: boolean; message: string; sid: string; returnTo: string; origin: string }) {
  const payload = JSON.stringify({ type: "lifeos-oauth", provider: input.provider, ok: input.ok, message: input.message, sid: input.sid })
    .replaceAll("<", "\\u003c");
  const target = new URL(input.returnTo, input.origin);
  if (input.ok) target.searchParams.set("connected", input.provider);
  else target.searchParams.set("oauth_error", input.message);
  if (input.sid) target.searchParams.set("sid", input.sid);
  target.searchParams.set("oauth_provider", input.provider);
  const fallback = JSON.stringify(target.toString()).replaceAll("<", "\\u003c");
  const headline = input.ok ? "Authorization complete" : "Authorization failed";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${headline}</title></head>
<body style="margin:0;background:#000;color:#f7f7f7;font:16px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;padding:32px">
<p style="margin:0 0 8px;font-size:20px">${headline}</p>
<p style="margin:0;color:rgba(255,255,255,.65)">${input.message.replaceAll("<", "&lt;")}</p>
<script>
  var payload = ${payload};
  var fallback = ${fallback};
  try { if (window.opener) window.opener.postMessage(payload, window.location.origin); } catch (error) {}
  if (window.opener) { setTimeout(function () { window.close(); }, 500); }
  else { window.location.replace(fallback); }
</script>
</body></html>`;
}

function googleAllowed(email: string) {
  const raw = (process.env.INTEGRATIONS_GOOGLE_ALLOWED || "").trim();
  if (raw === "*") return true;
  const list = (raw || "chris@ceogps.com,chrisgr33ninc@gmail.com,cagednreality@icloud.com")
    .split(",")
    .map((row) => row.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

function html(body: string) {
  return new Response(body, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

export const Route = createFileRoute("/api/integrations/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const requestUrl = new URL(request.url);
        // Where the browser really is, so the window it is redirected back to is
        // the public one (see public-origin.server.ts).
        const origin = publicOrigin(request);
        const state = requestUrl.searchParams.get("state") || "";
        const attempt = await takeState(state);
        if (!attempt) {
          return html(page({ provider: requestUrl.searchParams.get("provider") || "", ok: false, message: "That connection attempt expired. Start again from Integrations.", sid: "", returnTo: "/panel/integrations", origin }));
        }
        const spec = oauthProvider(attempt.provider);
        const returnTo = attempt.returnTo;
        if (!spec) {
          return html(page({ provider: attempt.provider, ok: false, message: "That service has no authorization flow here.", sid: attempt.sid, returnTo, origin }));
        }
        const refused = requestUrl.searchParams.get("error");
        if (refused) {
          const detail = requestUrl.searchParams.get("error_description") || refused;
          return html(page({ provider: spec.id, ok: false, message: `${spec.name} refused the login: ${detail}`, sid: attempt.sid, returnTo, origin }));
        }
        const code = requestUrl.searchParams.get("code") || "";
        if (!code) {
          return html(page({ provider: spec.id, ok: false, message: `${spec.name} returned no authorization code.`, sid: attempt.sid, returnTo, origin }));
        }
        const creds = await credentials(spec);
        const exchanged = await exchangeCode(spec, creds, { code, redirectUri: attempt.redirectUri || redirectUriFor(origin), verifier: attempt.verifier });
        if (!exchanged.ok) {
          await saveConnection(attempt.ownerId, {
            provider: spec.id,
            label: "",
            status: "error",
            scopes: "",
            accessToken: "",
            refreshToken: "",
            expiresAt: null,
            lastError: exchanged.text,
            verifiedAt: null,
          });
          return html(page({ provider: spec.id, ok: false, message: exchanged.text, sid: attempt.sid, returnTo, origin }));
        }
        let tokens = exchanged.tokens;
        if (spec.id === "facebook") {
          const longer = await upgradeFacebookToken(creds, tokens.accessToken);
          if (longer) tokens = { ...tokens, accessToken: longer.accessToken, expiresAt: longer.expiresAt || tokens.expiresAt };
        }
        const proof = await identify(spec, tokens.accessToken);
        if (proof.ok && spec.id === "google" && proof.label.includes("@") && !googleAllowed(proof.label)) {
          const message = `${proof.label} is not one of the board mailboxes. Nothing was saved.`;
          await saveConnection(attempt.ownerId, {
            provider: spec.id,
            label: "",
            status: "error",
            scopes: tokens.scopes,
            accessToken: "",
            refreshToken: "",
            expiresAt: null,
            lastError: message,
            verifiedAt: null,
          });
          return html(page({ provider: spec.id, ok: false, message, sid: attempt.sid, returnTo, origin }));
        }
        await saveConnection(attempt.ownerId, {
          provider: spec.id,
          label: proof.ok ? proof.label : "",
          status: proof.ok ? "connected" : "error",
          scopes: tokens.scopes,
          accessToken: proof.ok ? tokens.accessToken : "",
          refreshToken: proof.ok ? tokens.refreshToken : "",
          expiresAt: tokens.expiresAt,
          lastError: proof.ok ? "" : proof.text,
          verifiedAt: proof.ok ? new Date().toISOString() : null,
        });
        return html(
          page({
            provider: spec.id,
            ok: proof.ok,
            message: proof.ok ? `${proof.label} is connected. This window can close.` : proof.text,
            sid: attempt.sid,
            returnTo,
            origin,
          }),
        );
      },
    },
  },
});
