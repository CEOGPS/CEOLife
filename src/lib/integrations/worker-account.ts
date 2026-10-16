import type { AccountView, CheckView, ProviderId } from "./providers.ts";
import { isProviderId } from "./providers.ts";

/** Cards filled from the worker use `worker:google:chris@ceogps.com`. They are not database rows. */
export function workerAccountRef(id: string): { provider: ProviderId; email: string } | null {
  if (!id.startsWith("worker:")) return null;
  const rest = id.slice("worker:".length);
  const colon = rest.indexOf(":");
  if (colon < 1) return null;
  const provider = rest.slice(0, colon);
  const email = rest.slice(colon + 1);
  if (!isProviderId(provider)) return null;
  return { provider, email };
}

/** A stored check replaces the blank worker row. No check means it has not been verified. */
export function paintChecked(account: AccountView, check?: CheckView): AccountView {
  if (!check || (check.state !== "ok" && check.state !== "error")) return account;
  return {
    ...account,
    status: check.state === "ok" ? "ok" : "needs_reauth",
    lastCheckedAt: check.checkedAt,
    lastError: check.text,
  };
}
