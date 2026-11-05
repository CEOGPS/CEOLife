import { env } from "@/lib/env.server";

/**
 * Server-only calls to the lifeos1-api worker as the board owner.
 *
 * The worker treats a request as the owner only when it carries
 * `X-Lifeos-Board-Key` equal to its own BOARD_SECRET. That key lives in
 * Cloudflare settings on the dashboard and both workers. It is never sent to
 * the browser, so the browser reaches the worker only through this file.
 */
const DEFAULT_API = "https://lifeos1-api.ceogps.workers.dev";

export function boardFetch(path: string, init: RequestInit = {}) {
  const key = env("BOARD_SECRET") || "";
  if (key.length < 32) {
    throw new Error("BOARD_SECRET is missing on the dashboard. Set it to the same value as on lifeos1-api and lifeos1-oauth.");
  }
  const base = (env("LIFEOS_API_URL") || DEFAULT_API).replace(/\/+$/, "");
  const headers = new Headers(init.headers);
  headers.set("X-Lifeos-Board-Key", key);
  return fetch(`${base}${path}`, { ...init, headers });
}
