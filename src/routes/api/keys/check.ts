import { createFileRoute } from "@tanstack/react-router";
import { runProbe } from "@/lib/lifeos/env-keys";
import { resolveOwner } from "@/lib/integrations/owner.server";

function localOllamaInput(key: string) {
  const value = key.trim();
  if (!value || !/^https?:\/\//i.test(value)) return true;
  try {
    const host = new URL(value).hostname;
    return host === "127.0.0.1" || host === "localhost" || host === "::1";
  } catch {
    return false;
  }
}

/**
 * Probes a saved key with a real request to the service.
 *
 * The gate is the app's own owner: a signed-in user when auth is configured,
 * the local owner in the preview. On a real database with auth enabled this
 * fails closed (see `resolveOwner`). The local daemon check still runs
 * unauthenticated because it never leaves this computer.
 */
export const Route = createFileRoute("/api/keys/check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { name?: string; key?: string; email?: string };
        const name = String(body?.name || "").slice(0, 80);
        const key = String(body?.key || "").trim().slice(0, 8000);
        const email = String(body?.email || "").slice(0, 300);
        if (name !== "Ollama (local)" || !localOllamaInput(key)) {
          const owner = await resolveOwner();
          if (!owner) return Response.json({ ok: false, error: "Sign in required" }, { status: 401, headers: { "Cache-Control": "no-store" } });
        }
        const result = await runProbe({ name, key, email });
        return Response.json(result);
      },
    },
  },
});
