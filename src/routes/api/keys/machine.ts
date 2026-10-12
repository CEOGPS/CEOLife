import { createFileRoute } from "@tanstack/react-router";
import { requireSession } from "@/lib/lifeos/session-guard.server";

export const Route = createFileRoute("/api/keys/machine")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await requireSession(request);
        if (user instanceof Response) return user;
        return Response.json({ error: "Keys stay on the worker." }, { status: 410, headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});
