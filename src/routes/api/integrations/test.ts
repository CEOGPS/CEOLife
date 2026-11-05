import { createFileRoute } from "@tanstack/react-router";
import { runAccount, runProbe } from "@/lib/lifeos/env-keys";
import { guarded, json, makeCtx, readBody, requireUser, throttle } from "@/lib/integrations/http.server";
import { checkToken } from "@/lib/integrations/oauth.server";
import { freshAccessToken, IntegrationError, testAccount, testMailbox } from "@/lib/integrations/service.server";
import { recordCheck } from "@/lib/integrations/store.server";
import { workerAccountRef } from "@/lib/integrations/worker-account";
import { boardFetch } from "@/lib/lifeos/board.server";
import { GOOGLE_DATA_ACCOUNTS } from "@/components/dash/integrations/catalog";

/** Error text from a provider can echo back keys or a pasted settings block. Never show or store that. */
function scrub(text: string) {
  return String(text || "")
    .replace(/\b[A-Z][A-Z0-9_]{2,}=\S+/g, "[hidden]")
    .replace(/\b(sk|rk|pk|hf|nvapi|xai|gsk|ghp|gho|github_pat|sk-ant|sk-proj|sk-or)[-_][A-Za-z0-9_*\-]{6,}/g, "[key]")
    .replace(/[A-Za-z0-9_\-]{40,}/g, "[hidden]")
    .replace(/(\[hidden\]\s*){2,}/g, "[hidden] ")
    .slice(0, 220);
}

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

async function workerToken(provider: string, email: string) {
  const response = await boardFetch("/api/oauth/token/fresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, email }),
    signal: AbortSignal.timeout(12000),
  });
  const live = await response.json().catch(() => ({})) as { access_token?: string; error?: string };
  if (!response.ok || !live.access_token) return { token: "", error: live.error || "Not connected on the login service." };
  return { token: live.access_token, error: "" };
}

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
        throttle(userId, "test");
        let ctx: Awaited<ReturnType<typeof makeCtx>> | null = null;
        try {
          ctx = await makeCtx();
        } catch (error) {
          console.error("[integrations/test] database", error instanceof Error ? error.message : error);
        }
        const body = await readBody<Body>(request);

        if (body.account_id) {
          const id = String(body.account_id);
          const workerRef = workerAccountRef(id);
          if (workerRef) {
            const live = await workerToken(workerRef.provider, workerRef.email).catch(() => ({ token: "", error: "The login service did not answer." }));
            const health = live.token
              ? await checkToken(workerRef.provider, live.token)
              : { ok: false, text: live.error || `${workerRef.email || workerRef.provider} is not connected. Press Connect once.` };
            if (ctx) await recordCheck(ctx.sql, userId, `account:${id}`, health.ok ? "ok" : "error", health.text).catch(() => undefined);
            return json(health);
          }
          if (!ctx) return json({ ok: false, text: "The connection list is unavailable right now." });
          const health = await testAccount(ctx, userId, id);
          await recordCheck(ctx.sql, userId, `account:${id}`, health.ok ? "ok" : "error", health.text).catch(() => undefined);
          return json(health);
        }
        if (body.mailbox_id) {
          if (!ctx) return json({ ok: false, text: "Mailboxes are unavailable right now." });
          const { ok, text } = await testMailbox(ctx, String(body.mailbox_id));
          await recordCheck(ctx.sql, userId, `mailbox:${body.mailbox_id}`, ok ? "ok" : "error", text).catch(() => undefined);
          return json({ ok, text });
        }

        const service = String(body.service || "").slice(0, 80);
        if (!service) throw new IntegrationError(400, "Say which service to test.");

        if (body.account_kind) {
          const kind = String(body.account_kind);
          if (!ACCOUNT_KINDS.has(kind)) throw new IntegrationError(400, "Unknown check.");
          const fields = {
            key: String(body.key || "").trim().slice(0, 400),
            secret: String(body.secret || "").trim().slice(0, 400),
            site: String(body.site || "").trim().slice(0, 200),
          };
          let result: Awaited<ReturnType<typeof runAccount>>;
          if (kind === "search-console" || kind === "google-analytics") {
            // Try each connected Google account until one can see the data. chris@ceogps.com is last because Google limits it.
            const wanted = String(body.email || "").trim().toLowerCase();
            const emails = [...new Set([wanted, ...GOOGLE_DATA_ACCOUNTS].filter(Boolean))];
            result = { ok: false, text: "", site: "" };
            const tried: string[] = [];
            for (const email of emails) {
              let token = "";
              if (ctx) {
                try { token = (await freshAccessToken(ctx, userId, "google", email)).accessToken; } catch { /* stored on the worker */ }
              }
              if (!token) {
                try { token = (await workerToken("google", email)).token; } catch { /* not connected */ }
              }
              if (!token) continue;
              tried.push(email);
              const attempt = await runAccount({ service: kind, token, ...fields });
              if (attempt.ok) { result = { ...attempt, text: `${attempt.text} (as ${email})` }; break; }
              result = { ...attempt, text: `${email}: ${attempt.text}` };
            }
            if (!tried.length) result = { ok: false, text: "Connect a Google account on the Google card (ceogps.marketinggod@gmail.com has access to Analytics and Search Console), then test again.", site: "" };
            else if (!result.ok && /insufficient|scope/i.test(result.text)) result = { ...result, text: `${result.text} Reconnect that Google account so it grants Analytics and Search Console.` };
          } else {
            result = await runAccount({ service: kind, token: "", ...fields });
          }
          const clean = { ...result, text: scrub(result.text) };
          if (ctx) await recordCheck(ctx.sql, userId, `key:${service}`, clean.ok ? "ok" : "error", clean.text).catch(() => undefined);
          return json(clean);
        }

        const result = await runProbe({
          name: service,
          key: String(body.key || "").trim().slice(0, 8000),
          email: String(body.email || "").slice(0, 300),
        });
        const state = result.checked ? (result.ok ? "ok" : "error") : "saved";
        const text = scrub(result.checked
          ? (/^fetch failed$/i.test(result.text) ? `Could not reach ${service} from the server. Try again in a moment.` : result.text)
          : (result.text || "Stored only. This service cannot be verified from here."));
        if (ctx) await recordCheck(ctx.sql, userId, `key:${service}`, state, text).catch(() => undefined);
        return json({ ok: result.ok, checked: result.checked, text });
      }),
    },
  },
});
