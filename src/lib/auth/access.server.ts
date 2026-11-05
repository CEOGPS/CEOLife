import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "@/lib/env.server";
import { UnauthorizedError } from "@/lib/auth/verify.server";

/**
 * Cloudflare Access is the front door for this single-user board.
 *
 * Access signs every request it lets through with a JWT (header
 * `Cf-Access-Jwt-Assertion`, also the `CF_Authorization` cookie). We verify that
 * signature against the team's public keys, so a request that reached the app
 * some other way (for example the raw *.pages.dev URL) is refused.
 *
 * Settings (Cloudflare Pages → lifeos1 → Settings → Variables):
 *   CF_ACCESS_TEAM_DOMAIN  e.g. "ceogps.cloudflareaccess.com"
 *   CF_ACCESS_AUD          the Application Audience (AUD) tag of the Access app
 *   OWNER_EMAIL            optional, defaults to chris@ceogps.com
 *
 * Local `vite dev` has no Access in front of it, so it is allowed when the two
 * settings are missing. A deployed build with them missing refuses everything.
 */
const DEFAULT_OWNER = "chris@ceogps.com";
const DEFAULT_TEAM_DOMAIN = "ceogps.cloudflareaccess.com";

let keys: { issuer: string; set: ReturnType<typeof createRemoteJWKSet> } | null = null;

function cookie(header: string, name: string) {
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

/**
 * Accepts "ceogps", "ceogps.cloudflareaccess.com" or "https://ceogps.cloudflareaccess.com/..."
 * and returns "https://ceogps.cloudflareaccess.com". Empty when the value is unusable.
 */
function teamIssuer(raw: string) {
  let host = raw.trim().replace(/^https?:\/\//i, "").split(/[/\s]/)[0].trim().toLowerCase();
  if (!host) return "";
  if (!host.includes(".")) host = `${host}.cloudflareaccess.com`;
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) ? `https://${host}` : "";
}

/** Returns the owner's email when the request carries a valid Access login, otherwise throws UnauthorizedError. */
export async function verifyAccess(request: Request): Promise<string> {
  const owner = (env("OWNER_EMAIL") || DEFAULT_OWNER).toLowerCase();
  // A real Access audience tag is 64 hex characters. Anything shorter is a bad paste, so it is ignored rather than trusted.
  const audience = (env("CF_ACCESS_AUD") || "").trim();
  const enforceAudience = audience.length >= 32;
  // The team domain is public, so it has a built-in default. The setting only overrides it when it is valid.
  const issuer = teamIssuer(env("CF_ACCESS_TEAM_DOMAIN") || "") || teamIssuer(DEFAULT_TEAM_DOMAIN);
  const token =
    request.headers.get("cf-access-jwt-assertion") || cookie(request.headers.get("cookie") || "", "CF_Authorization");
  if (!token) {
    if (import.meta.env.DEV) return owner;
    throw new UnauthorizedError();
  }
  if (!keys || keys.issuer !== issuer) {
    keys = { issuer, set: createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`)) };
  }
  try {
    const { payload } = await jwtVerify(token, keys.set, enforceAudience ? { issuer, audience } : { issuer });
    const email = String(payload.email || "").toLowerCase();
    if (email !== owner) throw new Error("not the owner");
    return email;
  } catch {
    throw new UnauthorizedError();
  }
}
