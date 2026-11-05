import { createMiddleware } from "@tanstack/react-start";

/**
 * Same Supabase bearer the worker already verifies via sessionUserId.
 * The browser forwards the stored access token. The server checks it with
 * Supabase Auth and puts the user id on context. No new provider.
 */
export const sessionMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const { getSessionToken } = await import("./oauth");
    const bearerToken = (await getSessionToken()) || "";
    return next({ sendContext: { bearerToken } });
  })
  .server(async ({ next, context }) => {
    // Cloudflare Access first: nothing runs for a request that did not pass the front door.
    const { getRequest } = await import("@tanstack/react-start/server");
    const { verifyAccess } = await import("@/lib/auth/access.server");
    const request = getRequest();
    if (!request) throw Object.assign(new Error("Unauthorized"), { name: "UnauthorizedError" });
    await verifyAccess(request);
    const { verifyBearer } = await import("./session-guard.server");
    const user = await verifyBearer(String(context.bearerToken || ""));
    if (!user) {
      const error = new Error("Unauthorized");
      error.name = "UnauthorizedError";
      throw error;
    }
    return next({ context: { userId: user.id, email: user.email } });
  });
