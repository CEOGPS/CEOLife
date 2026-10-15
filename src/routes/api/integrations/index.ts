import { createFileRoute } from "@tanstack/react-router";
import { guarded, json, makeCtx, requireUser } from "@/lib/integrations/http.server";
import { loadPayload } from "@/lib/integrations/service.server";

export const Route = createFileRoute("/api/integrations/")({
  server: {
    handlers: {
      GET: ({ request }) => guarded(async () => {
        const userId = await requireUser(request);
        return json(await loadPayload(await makeCtx(), userId));
      }),
    },
  },
});
