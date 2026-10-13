import { createFileRoute } from "@tanstack/react-router";
import { credentials, missingCredentials, oauthProviders, redirectUriFor } from "@/lib/integrations/oauth-providers.server";
import { resolveOwner, sessionOwner } from "@/lib/integrations/owner.server";
import { publicOrigin } from "@/lib/integrations/public-origin.server";
import { listConnections } from "@/lib/integrations/store.server";

/**
 * What the panel needs to render truthfully: the stored connections (no tokens)
 * and, per provider, whether this server actually has the credentials to run the
 * flow — plus the exact callback URL to register with the provider.
 */

export const Route = createFileRoute("/api/integrations/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const redirectUri = redirectUriFor(publicOrigin(request));
        const signedIn = Boolean(await sessionOwner());
        const owner = await resolveOwner();
        if (!owner) {
          return Response.json({ ok: false, error: "Sign in required" }, { status: 401, headers: { "Cache-Control": "no-store" } });
        }
        const connections = await listConnections(owner);
        const providers: Record<string, { name: string; docs: string; scopes: string; configured: boolean; missing: string[]; redirectUri: string }> = {};
        for (const spec of oauthProviders()) {
          const creds = await credentials(spec);
          const missing = missingCredentials(spec, creds);
          providers[spec.id] = {
            name: spec.name,
            docs: spec.docs,
            scopes: spec.scopes,
            configured: missing.length === 0,
            missing,
            redirectUri,
          };
        }
        return Response.json(
          { ok: true, signedIn, owner, redirectUri, connections, providers },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
