import { createFileRoute } from "@tanstack/react-router";
import { verifyAccess } from "@/lib/auth/access.server";
import { boardFetch } from "@/lib/lifeos/board.server";

const CALLBACK = "https://lifeos1-api.ceogps.workers.dev/oauth/callback";
const GMAIL = "chrisgr33ninc@gmail.com";

function back(message: string) {
  const url = new URL("https://lifeos.ceogps.com/panel/integrations");
  url.searchParams.set("oauth_error", message);
  return Response.redirect(url.toString(), 302);
}

/**
 * The app starts the login. The browser then goes to the provider, not the worker.
 * The provider sends the code to the callback already registered on every app.
 */
export const Route = createFileRoute("/api/oauth/start")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await verifyAccess(request);
        } catch {
          return back("Sign in through Cloudflare Access first.");
        }
        const requestUrl = new URL(request.url);
        const provider = (requestUrl.searchParams.get("provider") || "").trim().toLowerCase();
        const account = (requestUrl.searchParams.get("account") || (provider === "google" ? GMAIL : "")).trim().toLowerCase();
        if (!provider) return back("That service has no sign-in here.");
        if (provider === "nylas" || (account.endsWith("@icloud.com") && provider !== "facebook")) return back("iCloud mail connects through Nylas, not this sign-in.");
        let response: Response;
        try {
          response = await boardFetch("/api/oauth/start", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ provider, account_email: account, origin: "https://lifeos.ceogps.com" }),
            redirect: "manual",
            signal: AbortSignal.timeout(15000),
          });
        } catch (error) {
          return back(error instanceof Error ? error.message : "The login service did not answer.");
        }
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get("Location") || "";
          try {
            const reason = new URL(location).searchParams.get("oauth_error");
            if (reason) return back(reason);
          } catch { /* the login service did not name the problem */ }
          return back("The login service did not start. Put the client id and secret on lifeos1-api, then deploy it.");
        }
        const body = await response.json().catch(() => ({})) as { url?: string; error?: string };
        if (!response.ok || !body.url) return back(body.error || `The login service answered ${response.status}.`);
        let next: URL;
        try { next = new URL(body.url); } catch { return back("The login service returned a bad address."); }
        if (next.hostname.endsWith("workers.dev")) return back("Connect opens the provider, not the worker.");
        const redirect = next.searchParams.get("redirect_uri") || "";
        if (redirect !== CALLBACK) {
          return back(`The login service is still sending ${redirect || "no callback"}. Deploy lifeos1-api so every provider uses ${CALLBACK}.`);
        }
        return Response.redirect(next.toString(), 302);
      },
    },
  },
});
