import { createFileRoute } from "@tanstack/react-router";
import { guarded, json, makeCtx, requireUser, throttle } from "@/lib/integrations/http.server";
import { loadMailboxes, loadPayload } from "@/lib/integrations/service.server";

export const Route = createFileRoute("/api/integrations/")({
  server: {
    handlers: {
      GET: ({ request }) => guarded(async () => {
        const userId = await requireUser(request);
        throttle(userId, "read");
        const url = new URL(request.url);
        if (url.searchParams.get("mailboxes") === "1") {
          try {
            const listing = await loadMailboxes(await makeCtx());
            return json({ mailboxes: listing.mailboxes, mailboxNote: listing.note });
          } catch (error) {
            console.error("[integrations] mailboxes failed", error instanceof Error ? error.message : error);
            return json({ mailboxes: [], mailboxNote: "Mailboxes could not be loaded." });
          }
        }
        try {
          return json(await loadPayload(await makeCtx(), userId, { mailboxes: false }));
        } catch (error) {
          console.error("[integrations] list failed", error instanceof Error ? error.message : error);
          const configured = { google: false, microsoft: false, github: false, slack: false, notion: false, spotify: false, discord: false, facebook: false, linkedin: false, twitter: false, nylas: false };
          return json({
            accounts: [],
            checks: {},
            configured,
            mailboxes: [],
            mailboxNote: "",
            mailboxesLoaded: false,
            expected: {},
            apps: {},
            encryptionReady: true,
          });
        }
      }),
    },
  },
});
