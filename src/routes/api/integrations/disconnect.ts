import { createFileRoute } from "@tanstack/react-router";
import { guarded, json, makeCtx, readBody, requireUser, throttle } from "@/lib/integrations/http.server";
import { IntegrationError, removeAccount, removeMailbox } from "@/lib/integrations/service.server";
import { clearCheck } from "@/lib/integrations/store.server";
import { workerAccountRef } from "@/lib/integrations/worker-account";

const WORKER = "https://lifeos1-api.ceogps.workers.dev";

export const Route = createFileRoute("/api/integrations/disconnect")({
  server: {
    handlers: {
      POST: ({ request }) => guarded(async () => {
        const userId = await requireUser(request);
        throttle(userId, "write");
        const ctx = await makeCtx();
        const body = await readBody<{ account_id: string; mailbox_id: string; service: string }>(request);
        if (body.account_id) {
          const id = String(body.account_id);
          const workerRef = workerAccountRef(id);
          if (workerRef) {
            const response = await fetch(`${WORKER}/api/oauth/disconnect?board=1`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-Lifeos-Board": "1" },
              body: JSON.stringify({ provider: workerRef.provider, account_email: workerRef.email }),
              signal: AbortSignal.timeout(12000),
            });
            if (!response.ok) {
              const detail = await response.json().catch(() => ({})) as { error?: string };
              throw new IntegrationError(502, detail.error || "The login service did not disconnect that account.");
            }
            await clearCheck(ctx.sql, userId, `account:${id}`).catch(() => undefined);
            return json({ ok: true });
          }
          await removeAccount(ctx, userId, id);
          await clearCheck(ctx.sql, userId, `account:${id}`).catch(() => undefined);
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
