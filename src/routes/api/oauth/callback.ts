import { createFileRoute } from "@tanstack/react-router";
import { appOrigin, makeCtx } from "@/lib/integrations/http.server";
import { lookupIdentity } from "@/lib/integrations/oauth.server";
import {
  clearOauthAttemptCookie, oauthCallbackUri, oauthCreds, oauthExchange, oauthSpec, rawParam, readOauthAttempt,
} from "@/lib/integrations/oauth-flow.server";
import { listExpected, takeState, upsertAccount } from "@/lib/integrations/store.server";

const GMAIL = "chrisgr33ninc@gmail.com";

function page(input: { provider: string; ok: boolean; message: string; sid: string; origin: string }) {
  const payload = JSON.stringify({ type: "lifeos-oauth", provider: input.provider, ok: input.ok, message: input.message, sid: input.sid }).replaceAll("<", "\\u003c");
  const target = new URL("/panel/integrations", input.origin);
  if (input.ok) target.searchParams.set("connected", input.provider);
  else target.searchParams.set("oauth_error", input.message.slice(0, 300));
  target.searchParams.set("oauth_provider", input.provider);
  const fallback = JSON.stringify(target.toString()).replaceAll("<", "\\u003c");
  const headline = input.ok ? "Authorization complete" : "Authorization failed";
  const safe = input.message.replaceAll("<", "<").slice(0, 300);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${headline}</title></head>
<body style="margin:0;background:#000;color:#f7f7f7;font:16px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;padding:32px">
<p style="margin:0 0 8px;font-size:20px">${headline}</p>
<p style="margin:0;color:rgba(255,255,255,.65)">${safe}</p>
<script>
  var payload = ${payload};
  var fallback = ${fallback};
  try { if (window.opener) window.opener.postMessage(payload, window.location.origin); } catch (error) {}
  if (window.opener) { setTimeout(function () { window.close(); }, 500); }
  else { window.location.replace(fallback); }
</script>
</body></html>`;
}

function html(origin: string, body: string) {
  const headers = new Headers({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
  headers.append("Set-Cookie", clearOauthAttemptCookie(origin.startsWith("https:")));
  return new Response(body, { status: 200, headers });
}

export const Route = createFileRoute("/api/oauth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = appOrigin(request);
        const requestUrl = new URL(request.url);
        const attemptCookie = readOauthAttempt(request.headers.get("cookie"));
        const sid = attemptCookie.sid;
        const finish = (provider: string, ok: boolean, message: string) => html(origin, page({ provider, ok, message, sid, origin }));
        const state = requestUrl.searchParams.get("state") || "";
        const ctx = await makeCtx();
        const attempt = state ? await takeState(ctx.sql, state) : null;
        if (!attempt) return finish("", false, "That sign-in expired. Press Connect again.");
        const spec = oauthSpec(attempt.provider);
        if (!spec) return finish(attempt.provider, false, "That service has no sign-in here.");
        const refused = requestUrl.searchParams.get("error");
        if (refused) return finish(spec.id, false, requestUrl.searchParams.get("error_description") || refused);
        const code = rawParam(requestUrl.search, "code");
        if (!code) return finish(spec.id, false, "The provider returned no code. Press Connect again.");
        const redirectUri = attemptCookie.redirectUri || oauthCallbackUri(origin);
        const exchanged = await oauthExchange(spec, oauthCreds(spec, ctx.read), { code, redirectUri, verifier: attempt.verifier });
        if (!exchanged.ok) return finish(spec.id, false, exchanged.text);
        let who: { id: string; email: string; name: string };
        try {
          who = await lookupIdentity(spec.id, {
            accessToken: exchanged.accessToken,
            refreshToken: exchanged.refreshToken,
            expiresAt: exchanged.expiresAt,
            scope: exchanged.scopes,
            raw: exchanged.raw,
          });
        } catch (error) {
          return finish(spec.id, false, error instanceof Error ? error.message : "The account check failed.");
        }
        if (attempt.hintEmail && who.email && who.email !== attempt.hintEmail) {
          return finish(spec.id, false, `You asked for ${attempt.hintEmail}, but signed in as ${who.email}. Nothing was saved.`);
        }
        if (!ctx.secret) return finish(spec.id, false, "Set INTEGRATIONS_ENCRYPTION_KEY before connecting. The login was not stored.");
        let expected = "";
        try { expected = (await listExpected(ctx.sql, attempt.userId))[spec.id] || ""; } catch { expected = ""; }
        if (spec.id === "google" && !expected) expected = GMAIL;
        await upsertAccount(ctx.sql, ctx.secret, {
          userId: attempt.userId,
          provider: spec.id,
          externalId: who.id,
          email: who.email,
          name: who.name,
          scopes: exchanged.scopes,
          accessToken: exchanged.accessToken,
          refreshToken: exchanged.refreshToken,
          expiresAt: exchanged.expiresAt,
          expectedEmail: expected,
        });
        const label = who.email || who.name || spec.id;
        return finish(spec.id, true, `${label} is connected. This window can close.`);
      },
    },
  },
});
