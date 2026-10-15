import { createFileRoute } from "@tanstack/react-router";
import { appOrigin, guarded, json, makeCtx, readBody, requireUser } from "@/lib/integrations/http.server";
import { isProviderId } from "@/lib/integrations/providers";
import { IntegrationError, startFlow } from "@/lib/integrations/service.server";

export const Route = createFileRoute("/api/integrations/start")({
  server: {
    handlers: {
      POST: ({ request }) => guarded(async () => {
        const userId = await requireUser(request);
        const body = await readBody<{ provider: string; hint_email: string; choose: boolean }>(request);
        if (!isProviderId(body.provider)) throw new IntegrationError(400, "Unknown service.");
        const result = await startFlow(await makeCtx(), {
          userId,
          provider: body.provider,
          origin: appOrigin(request),
          hintEmail: String(body.hint_email || ""),
          choose: body.choose === true,
        });
        return json(result);
      }),
    },
  },
});
