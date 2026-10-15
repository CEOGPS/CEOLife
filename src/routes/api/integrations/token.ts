import { createFileRoute } from "@tanstack/react-router";
import { credentials, oauthProvider, refreshAccessToken } from "@/lib/integrations/oauth-providers.server";
import { resolveOwner } from "@/lib/integrations/owner.server";
import { getConnection, touchConnection } from "@/lib/integrations/store.server";

/**
 * A live access token for a desk (mail, calendar, Spotify, Facebook).
 * The browser asks; the token is refreshed on the server when it is about to expire.
 * Nothing here accepts a client-supplied user id.
 */

export const Route = createFileRoute("/api/integrations/token")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { provider?: string; email?: string };
        const providerId = String(body.provider || "").trim().toLowerCase();
        const spec = oauthProvider(providerId);
        if (!spec) return Response.json({ ok: false, error: "That service has no authorization flow here." }, { status: 400 });
        const owner = await resolveOwner();
        if (!owner) return Response.json({ ok: false, error: "Sign in required" }, { status: 401, headers: { "Cache-Control": "no-store" } });
        const connection = await getConnection(owner, spec.id);
        if (!connection || connection.status !== "connected" || !connection.accessToken) {
          return Response.json({ ok: false, error: `${spec.name} is not connected.` }, { status: 404, headers: { "Cache-Control": "no-store" } });
        }
        const want = String(body.email || "").trim().toLowerCase();
        const label = connection.label.toLowerCase();
        if (want && label.includes("@") && !label.includes(want)) {
          return Response.json({ ok: false, error: `${spec.name} is connected as ${connection.label}, not ${want}.` }, { status: 409, headers: { "Cache-Control": "no-store" } });
        }
        let accessToken = connection.accessToken;
        let expiresAt = connection.expiresAt;
        const expired = expiresAt ? new Date(expiresAt).getTime() - Date.now() < 60_000 : false;
        if (expired && connection.refreshToken) {
          const creds = await credentials(spec);
          const refreshed = await refreshAccessToken(spec, creds, connection.refreshToken);
          if (!refreshed) {
            await touchConnection(owner, spec.id, { status: "error", lastError: "The login expired. Reconnect it." });
            return Response.json({ ok: false, error: `${spec.name} login expired. Reconnect it.` }, { status: 401, headers: { "Cache-Control": "no-store" } });
          }
          accessToken = refreshed.accessToken;
          expiresAt = refreshed.expiresAt;
          await touchConnection(owner, spec.id, { accessToken, refreshToken: refreshed.refreshToken, expiresAt, status: "connected", lastError: "" });
        }
        return Response.json(
          { ok: true, access_token: accessToken, expires_at: expiresAt, email: connection.label },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
