import { createFileRoute } from "@tanstack/react-router";
import { completeOAuthCallback } from "@/routes/api/integrations/callback";

/** Same exchange as `/api/integrations/callback`. The provider id in the path is what gets registered. */
export const Route = createFileRoute("/api/integrations/callback/$provider")({
  server: {
    handlers: {
      GET: async ({ request }) => completeOAuthCallback(request),
    },
  },
});
