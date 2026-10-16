import { createFileRoute } from "@tanstack/react-router";
import { appOrigin, makeCtx } from "@/lib/integrations/http.server";
import { rawParam } from "@/lib/integrations/oauth-flow.server";
import { isProviderId } from "@/lib/integrations/providers";
import { completeCallback } from "@/lib/integrations/service.server";

function back(params: Record<string, string>) {
  return new Response(null, {
    status: 302,
    headers: { Location: `/panel/integrations?${new URLSearchParams(params).toString()}`, "Cache-Control": "no-store" },
  });
}

export const Route = createFileRoute("/api/integrations/callback/$provider")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        if (!isProviderId(params.provider)) return back({ integration_error: "Unknown service." });
        const denied = url.searchParams.get("error");
        if (denied) return back({ integration_error: url.searchParams.get("error_description") || `${params.provider} said: ${denied}` });
        const code = rawParam(url.search, "code");
        const state = url.searchParams.get("state") || "";
        if (!code || !state) return back({ integration_error: "The sign-in came back without a code. Press Connect again." });
        try {
          // The state row is the person who pressed Connect. Do not compare it to a
          // dashboard login — each card picks its own account on the provider's page.
          const result = await completeCallback(await makeCtx(), { state, code, origin: appOrigin(request), sessionUserId: null });
          return result.ok
            ? back({ connected: result.provider, ...(result.account?.email ? { account: result.account.email } : {}) })
            : back({ integration_error: result.error });
        } catch (error) {
          console.error("[integrations/callback]", error instanceof Error ? error.message : error);
          return back({ integration_error: error instanceof Error ? error.message : "The connection failed." });
        }
      },
    },
  },
});
