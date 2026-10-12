import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";

// Public on purpose. This is the Better Auth login/session endpoint. A session does not exist yet.

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => auth.handler(request),
    },
  },
});
