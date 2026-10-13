import { createFileRoute } from "@tanstack/react-router";
import { runProbe } from "@/lib/lifeos/env-keys";
import { requireSession } from "@/lib/lifeos/session-guard.server";

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

export const Route = createFileRoute("/api/keys/check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => ({})) as { name?: string; key?: string; email?: string };
        const name = String(body?.name || "").slice(0, 80);
        const key = String(body?.key || "").trim().slice(0, 8000);
        const email = String(body?.email || "").slice(0, 300);
        // The local daemon check does not leave this computer. A custom public URL still needs a session.
        if (name !== "Ollama (local)" || !localOllamaInput(key)) {
          const user = await requireSession(request);
          if (user instanceof Response) return user;
        }
        const result = await runProbe({ name, key, email });
        return Response.json(result);
      },
    },
  },
});
