import type { MailboxView } from "./providers.ts";
import type { EnvReader, Fetch, Health } from "./oauth.server.ts";

/**
 * Mailboxes held by Nylas. The Email desk's server code already reads and sends through the
 * app-wide NYLAS_API_KEY, so the panel reads the same list. That keeps the screen true to what the
 * Email desk will really use.
 */
export function nylasBase(read: EnvReader) {
  return (read("NYLAS_API_URI") || "https://api.us.nylas.com").replace(/\/$/, "");
}

function authHeaders(key: string) {
  return { Authorization: `Bearer ${key}`, Accept: "application/json", "User-Agent": "CEOLife-Integrations" };
}

function problem(body: Record<string, unknown>, status: number) {
  const err = body.error;
  const nested = err && typeof err === "object" ? String((err as Record<string, unknown>).message || "") : "";
  return nested || (typeof err === "string" ? err : "") || String(body.message || "") || `HTTP ${status}`;
}

function netNote(error: unknown) {
  const text = error instanceof Error ? error.message : "";
  if (/timeout|aborted/i.test(text)) return "Nylas did not answer in time.";
  return `Could not reach Nylas${text ? ` (${text})` : ""}.`;
}

function toMailbox(row: Record<string, unknown>): MailboxView {
  const created = Number(row.created_at);
  return {
    id: String(row.id || ""),
    email: String(row.email || "").toLowerCase(),
    provider: String(row.provider || ""),
    status: String(row.grant_status || "valid"),
    createdAt: created > 0 ? new Date(created * 1000).toISOString() : null,
  };
}

export async function listMailboxes(read: EnvReader, f: Fetch = fetch): Promise<{ mailboxes: MailboxView[]; note: string }> {
  const key = read("NYLAS_API_KEY");
  if (!key) return { mailboxes: [], note: "NYLAS_API_KEY is not set on the server, so mailboxes cannot be listed." };
  try {
    const response = await f(`${nylasBase(read)}/v3/grants?limit=50`, { headers: authHeaders(key), signal: AbortSignal.timeout(8000) });
    const body = (await response.json().catch(() => ({}))) as { data?: Record<string, unknown>[] } & Record<string, unknown>;
    if (!response.ok) return { mailboxes: [], note: `Nylas refused the request: ${problem(body, response.status)}` };
    const mailboxes = (Array.isArray(body.data) ? body.data : []).map(toMailbox).filter((row) => row.id && row.email);
    return { mailboxes, note: "" };
  } catch (error) {
    return { mailboxes: [], note: netNote(error) };
  }
}

export async function checkMailbox(read: EnvReader, id: string, f: Fetch = fetch): Promise<Health & { mailbox?: MailboxView }> {
  const key = read("NYLAS_API_KEY");
  if (!key) return { ok: false, text: "NYLAS_API_KEY is not set on the server." };
  try {
    const response = await f(`${nylasBase(read)}/v3/grants/${encodeURIComponent(id)}`, { headers: authHeaders(key), signal: AbortSignal.timeout(10000) });
    const body = (await response.json().catch(() => ({}))) as { data?: Record<string, unknown> } & Record<string, unknown>;
    if (!response.ok || !body.data) return { ok: false, text: `Nylas could not find this mailbox: ${problem(body, response.status)}` };
    const mailbox = toMailbox(body.data);
    return mailbox.status === "valid"
      ? { ok: true, text: `${mailbox.email} is connected and valid`, mailbox }
      : { ok: false, text: `${mailbox.email} needs to be reconnected (Nylas says: ${mailbox.status})`, mailbox };
  } catch (error) {
    return { ok: false, text: netNote(error) };
  }
}

export async function revokeMailbox(read: EnvReader, id: string, f: Fetch = fetch): Promise<{ ok: boolean; text: string }> {
  const key = read("NYLAS_API_KEY");
  if (!key) return { ok: false, text: "NYLAS_API_KEY is not set on the server." };
  try {
    const response = await f(`${nylasBase(read)}/v3/grants/${encodeURIComponent(id)}`, { method: "DELETE", headers: authHeaders(key), signal: AbortSignal.timeout(10000) });
    if (response.ok) return { ok: true, text: "Mailbox disconnected." };
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: false, text: `Nylas could not disconnect it: ${problem(body, response.status)}` };
  } catch (error) {
    return { ok: false, text: netNote(error) };
  }
}

/** Which Nylas provider to preselect for an address, so the person lands on the right sign-in page. */
export function nylasProviderFor(email: string) {
  const domain = email.split("@")[1]?.toLowerCase() || "";
  if (["icloud.com", "me.com", "mac.com"].includes(domain)) return "icloud";
  if (["gmail.com", "googlemail.com"].includes(domain)) return "google";
  if (["outlook.com", "hotmail.com", "live.com", "msn.com"].includes(domain)) return "microsoft";
  return "";
}
