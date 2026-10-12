import { createFileRoute } from "@tanstack/react-router";
import { runProbe } from "@/lib/lifeos/env-keys";
import { requireSession } from "@/lib/lifeos/session-guard.server";

export const Route = createFileRoute("/api/keys/check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const user = await requireSession(request);
        if (user instanceof Response) return user;
        const body = await request.json().catch(() => ({})) as { name?: string; key?: string; email?: string };
        const result = await runProbe({
          name: String(body?.name || "").slice(0, 80),
          key: String(body?.key || "").trim().slice(0, 8000),
          email: String(body?.email || "").slice(0, 300),
        });
        return Response.json(result);
      },
    },
  },
});
