import { createFileRoute } from "@tanstack/react-router";
import { credentials, oauthProvider, revoke } from "@/lib/integrations/oauth-providers.server";
import { resolveOwner } from "@/lib/integrations/owner.server";
import { deleteConnection, getConnection } from "@/lib/integrations/store.server";

/**
 * Disconnect: ask the provider to revoke the token where it supports that, then
 * drop the stored connection so nothing here can call the service any more.
 */

export const Route = createFileRoute("/api/integrations/disconnect")({
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
        if (connection) {
          const creds = await credentials(spec);
          await revoke(spec, creds, connection.accessToken);
          await deleteConnection(owner, spec.id);
        }
        return Response.json({ ok: true, provider: spec.id, text: `${spec.name} disconnected.` });
      },
    },
  },
});
