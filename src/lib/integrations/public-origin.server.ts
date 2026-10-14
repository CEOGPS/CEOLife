/**
 * The origin the browser is really on (server-only).
 *
 * Behind the Base44 preview proxy the dev server sees only the internal sandbox
 * address: `Host: 3000-<sandbox id>.e2b.app`, scheme `http`, and no
 * `x-forwarded-*` headers — while the browser sits on
 * `https://3000-<BASE44_PUBLIC_HOST_SUFFIX>`. OAuth providers compare the
 * callback against the registered value exactly, so a redirect_uri built from
 * the inbound request would be wrong in the preview and the provider would
 * refuse the login.
 *
 * When the deployment is behind a proxy that DOES forward the client host, those
 * headers win. Otherwise the sandbox rebuilds the public origin from
 * `BASE44_PUBLIC_HOST_SUFFIX` (`BASE44_PREVIEW_MODE=1`, see AGENTS.md). Everywhere
 * else — a deployed host, plain `npm run dev` — the request origin already is
 * the public origin and nothing changes.
 */

/** Host port the preview is served on (see `ports:` in docker-compose.base44.yml). */
const PREVIEW_PORT = 3000;

/** Standard proxy headers, present only when the deployment forwards them. */
function forwardedOrigin(request: Request): string | null {
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (!host) return null;
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return `${proto || "https"}://${host}`;
}

/** Sandbox-only override; inactive unless BASE44_PREVIEW_MODE is exactly "1". */
function sandboxOrigin(): string | null {
  if (process.env.BASE44_PREVIEW_MODE !== "1") return null;
  const suffix = process.env.BASE44_PUBLIC_HOST_SUFFIX?.trim().replace(/^\.+/, "");
  return suffix ? `https://${PREVIEW_PORT}-${suffix}` : null;
}

export function publicOrigin(request: Request): string {
  const origin = forwardedOrigin(request) || sandboxOrigin() || new URL(request.url).origin;
  return origin.replace(/\/+$/, "");
}
