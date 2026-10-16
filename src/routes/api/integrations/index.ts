import { createFileRoute } from "@tanstack/react-router";
import { guarded, json, makeCtx, requireUser } from "@/lib/integrations/http.server";
import { loadPayload } from "@/lib/integrations/service.server";

export const Route = createFileRoute("/api/integrations/")({
  server: {
    handlers: {
      GET: ({ request }) => guarded(async () => {
        const userId = await requireUser(request);
        try {
          return json(await loadPayload(await makeCtx(), userId));
        } catch (error) {
          console.error("[integrations] list failed", error instanceof Error ? error.message : error);
          const configured = { google: false, microsoft: false, github: false, slack: false, notion: false, spotify: false, discord: false, facebook: false, linkedin: false, twitter: false, nylas: false };
          return json({
            accounts: [],
            checks: {},
            configured,
            mailboxes: [],
            mailboxNote: "",
            expected: {},
            apps: {},
            encryptionReady: true,
          });
        }
      }),
    },
  },
});
