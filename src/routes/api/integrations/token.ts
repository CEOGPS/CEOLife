import { createFileRoute } from "@tanstack/react-router";
import { guarded, json, makeCtx, readBody, requireUser } from "@/lib/integrations/http.server";
import { isProviderId } from "@/lib/integrations/providers";
import { freshAccessToken, IntegrationError } from "@/lib/integrations/service.server";

export const Route = createFileRoute("/api/integrations/token")({
  server: {
    handlers: {
      POST: ({ request }) => guarded(async () => {
        const userId = await requireUser(request);
        const body = await readBody<{ provider: string; email: string }>(request);
        if (!isProviderId(body.provider)) throw new IntegrationError(400, "Unknown service.");
        const live = await freshAccessToken(await makeCtx(), userId, body.provider, String(body.email || "").trim().toLowerCase());
        return json({ access_token: live.accessToken, expires_at: live.expiresAt, email: live.email });
      }),
    },
  },
});
