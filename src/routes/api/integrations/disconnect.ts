import { createFileRoute } from "@tanstack/react-router";
import { guarded, json, makeCtx, readBody, requireUser, throttle } from "@/lib/integrations/http.server";
import { IntegrationError, removeAccount, removeMailbox } from "@/lib/integrations/service.server";
import { clearCheck } from "@/lib/integrations/store.server";

export const Route = createFileRoute("/api/integrations/disconnect")({
  server: {
    handlers: {
      POST: ({ request }) => guarded(async () => {
        const userId = await requireUser(request);
        throttle(userId, "write");
        const ctx = await makeCtx();
        const body = await readBody<{ account_id: string; mailbox_id: string; service: string }>(request);
        if (body.account_id) {
          await removeAccount(ctx, userId, String(body.account_id));
          return json({ ok: true });
        }
        if (body.mailbox_id) {
          await removeMailbox(ctx, String(body.mailbox_id));
          return json({ ok: true });
        }
        if (body.service) {
          await clearCheck(ctx.sql, userId, `key:${String(body.service).slice(0, 80)}`);
          return json({ ok: true });
        }
        throw new IntegrationError(400, "Say which account or service to disconnect.");
      }),
    },
  },
});
