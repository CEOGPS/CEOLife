import { createFileRoute } from "@tanstack/react-router";
import { guarded, json, makeCtx, readBody, requireUser } from "@/lib/integrations/http.server";
import { isProviderId, type ProviderId } from "@/lib/integrations/providers";
import { IntegrationError, saveApp, saveExpectedEmails, setPrimary } from "@/lib/integrations/service.server";

type Body = { expected: Record<string, string>; provider: string; expected_email: string; account_id: string; primary: boolean; client_id: string; client_secret: string };

/**
 * Which account each service should use.
 *  - { expected: { google: "a@b.com", github: "c@d.com" } }   set several at once
 *  - { provider, expected_email }                              set one (empty clears it)
 *  - { account_id, primary: true }                             choose the account other desks use
 */
export const Route = createFileRoute("/api/integrations/settings")({
  server: {
    handlers: {
      POST: ({ request }) => guarded(async () => {
        const userId = await requireUser(request);
        const ctx = await makeCtx();
        const body = await readBody<Body>(request);
        if (body.account_id && body.primary) {
          await setPrimary(ctx, userId, String(body.account_id));
          return json({ ok: true });
        }
        if (isProviderId(body.provider) && (body.client_id !== undefined || body.client_secret !== undefined)) {
          await saveApp(ctx, userId, body.provider, String(body.client_id || ""), String(body.client_secret || ""));
          return json({ ok: true });
        }
        const map: Partial<Record<ProviderId, string>> = {};
        if (body.expected && typeof body.expected === "object") {
          for (const [provider, email] of Object.entries(body.expected)) {
            if (!isProviderId(provider)) throw new IntegrationError(400, `Unknown service: ${provider}.`);
            map[provider] = String(email || "");
          }
        } else if (isProviderId(body.provider)) {
          map[body.provider] = String(body.expected_email || "");
        } else {
          throw new IntegrationError(400, "Say which service to update.");
        }
        await saveExpectedEmails(ctx, userId, map);
        return json({ ok: true });
      }),
    },
  },
});
