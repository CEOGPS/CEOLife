import { createFileRoute } from "@tanstack/react-router";
import { runAccount } from "@/lib/lifeos/env-keys";
import { credentials, oauthProvider, refreshAccessToken } from "@/lib/integrations/oauth-providers.server";
import { resolveOwner } from "@/lib/integrations/owner.server";
import { getConnection, touchConnection } from "@/lib/integrations/store.server";

/**
 * Account-level checks that need a Google login (Search Console, Analytics).
 *
 * The token comes from the stored Google connection on the server and is
 * refreshed when it has expired — it is never handed to the browser. GoDaddy and
 * Brilliant Directories check with their own key/secret.
 */
async function googleToken(owner: string) {
  const spec = oauthProvider("google");
  const connection = spec ? await getConnection(owner, "google") : null;
  if (!spec || !connection || connection.status !== "connected") return "";
  const expired = connection.expiresAt ? new Date(connection.expiresAt).getTime() - Date.now() < 60_000 : false;
  if (!expired && connection.accessToken) return connection.accessToken;
  if (!connection.refreshToken) return "";
  const creds = await credentials(spec);
  const refreshed = await refreshAccessToken(spec, creds, connection.refreshToken);
  if (!refreshed) return "";
  await touchConnection(owner, "google", { accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken, expiresAt: refreshed.expiresAt });
  return refreshed.accessToken;
}

export const Route = createFileRoute("/api/keys/account")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { service?: string; key?: string; secret?: string; site?: string };
        const service = String(body?.service || "").slice(0, 40);
        const owner = await resolveOwner();
        if (!owner) return Response.json({ ok: false, error: "Sign in required" }, { status: 401, headers: { "Cache-Control": "no-store" } });
        let token = "";
        if (service === "search-console" || service === "google-analytics") {
          token = await googleToken(owner);
          if (!token) {
            return Response.json({ ok: false, site: "", text: "Connect Google first — this check runs as that login. Reconnect it if the login expired." });
          }
        }
        const result = await runAccount({
          service,
          token,
          key: String(body?.key || "").trim().slice(0, 400),
          secret: String(body?.secret || "").trim().slice(0, 400),
          site: String(body?.site || "").trim().slice(0, 200),
        });
        return Response.json(result);
      },
    },
  },
});
