import { createFileRoute } from "@tanstack/react-router";
import { runAccount, runProbe } from "@/lib/lifeos/env-keys";
import { guarded, json, makeCtx, readBody, requireUser } from "@/lib/integrations/http.server";
import { freshAccessToken, IntegrationError, testAccount, testMailbox } from "@/lib/integrations/service.server";
import { recordCheck } from "@/lib/integrations/store.server";

const ACCOUNT_KINDS = new Set(["search-console", "google-analytics", "godaddy", "brilliant"]);

type Body = {
  account_id: string;
  mailbox_id: string;
  service: string;
  key: string;
  email: string;
  account_kind: string;
  secret: string;
  site: string;
};

/**
 * One endpoint for every "is this working?" button.
 *  - { account_id }                      a connected OAuth account
 *  - { mailbox_id }                      a Nylas mailbox (iCloud and others)
 *  - { service, account_kind, ... }      services that verify through Google or need extra fields
 *  - { service, key, email }             a pasted API key
 * Key and service results are saved, so the card shows the last real result on every device.
 */
export const Route = createFileRoute("/api/integrations/test")({
  server: {
    handlers: {
      POST: ({ request }) => guarded(async () => {
        const userId = await requireUser(request);
        const ctx = await makeCtx();
        const body = await readBody<Body>(request);

        if (body.account_id) {
          return json(await testAccount(ctx, userId, String(body.account_id)));
        }
        if (body.mailbox_id) {
          const { ok, text } = await testMailbox(ctx, String(body.mailbox_id));
          return json({ ok, text });
        }

        const service = String(body.service || "").slice(0, 80);
        if (!service) throw new IntegrationError(400, "Say which service to test.");

        if (body.account_kind) {
          const kind = String(body.account_kind);
          if (!ACCOUNT_KINDS.has(kind)) throw new IntegrationError(400, "Unknown check.");
          let token = "";
          if (kind === "search-console" || kind === "google-analytics") {
            try {
              // The Google token is read on the server and never sent to the browser for this check.
              token = (await freshAccessToken(ctx, userId, "google", String(body.email || "").trim().toLowerCase())).accessToken;
            } catch (error) {
              const text = error instanceof Error && error.message.includes("expired")
                ? error.message
                : "Connect Google first, then test again.";
              await recordCheck(ctx.sql, userId, `key:${service}`, "error", text);
              return json({ ok: false, text, site: "" });
            }
          }
          const result = await runAccount({
            service: kind,
            token,
            key: String(body.key || "").trim().slice(0, 400),
            secret: String(body.secret || "").trim().slice(0, 400),
            site: String(body.site || "").trim().slice(0, 200),
          });
          await recordCheck(ctx.sql, userId, `key:${service}`, result.ok ? "ok" : "error", result.text);
          return json(result);
        }

        const result = await runProbe({
          name: service,
          key: String(body.key || "").trim().slice(0, 8000),
          email: String(body.email || "").slice(0, 300),
        });
        const state = result.checked ? (result.ok ? "ok" : "error") : "saved";
        const text = result.checked
          ? (/^fetch failed$/i.test(result.text) ? `Could not reach ${service} from the server. Try again in a moment.` : result.text)
          : "Saved. This service has no public test, so it cannot be verified from here.";
        await recordCheck(ctx.sql, userId, `key:${service}`, state, text);
        return json({ ok: result.ok, checked: result.checked, text });
      }),
    },
  },
});
