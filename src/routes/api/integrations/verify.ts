import { createFileRoute } from "@tanstack/react-router";
import { credentials, identify, oauthProvider, refreshAccessToken } from "@/lib/integrations/oauth-providers.server";
import { resolveOwner } from "@/lib/integrations/owner.server";
import { getConnection, touchConnection } from "@/lib/integrations/store.server";

/**
 * Re-proves one stored connection with a live provider call — refreshing the
 * access token first when it has expired. This is what "Test" runs; a connection
 * only stays "connected" while this passes.
 */

export const Route = createFileRoute("/api/integrations/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { provider?: string };
        const providerId = String(body.provider || "").trim().toLowerCase();
        const spec = oauthProvider(providerId);
        if (!spec) return Response.json({ ok: false, text: "That service has no authorization flow here." }, { status: 400 });
        const owner = await resolveOwner();
        if (!owner) return Response.json({ ok: false, error: "Sign in required" }, { status: 401, headers: { "Cache-Control": "no-store" } });
        const connection = await getConnection(owner, spec.id);
        if (!connection) return Response.json({ ok: false, text: `${spec.name} is not connected yet.` }, { status: 404 });

        let accessToken = connection.accessToken;
        const expired = connection.expiresAt ? new Date(connection.expiresAt).getTime() - Date.now() < 60_000 : false;
        if ((expired || !accessToken) && connection.refreshToken) {
          const creds = await credentials(spec);
          const refreshed = await refreshAccessToken(spec, creds, connection.refreshToken);
          if (refreshed) {
            accessToken = refreshed.accessToken;
            await touchConnection(owner, spec.id, {
              accessToken: refreshed.accessToken,
              refreshToken: refreshed.refreshToken,
              expiresAt: refreshed.expiresAt,
            });
          }
        }

        const proof = await identify(spec, accessToken);
        await touchConnection(owner, spec.id, {
          label: proof.ok ? proof.label : connection.label,
          status: proof.ok ? "connected" : "error",
          lastError: proof.ok ? "" : proof.text,
          verifiedAt: proof.ok ? new Date().toISOString() : null,
        });
        return Response.json({ ok: proof.ok, provider: spec.id, label: proof.ok ? proof.label : connection.label, text: proof.text });
      },
    },
  },
});
