import { getBearerToken } from "@/lib/auth/client";
import type { IntegrationsPayload, ProviderId } from "./providers";

/** Browser-side calls to /api/integrations. Every call carries the session cookie (and the preview bearer token when there is one). */
export class IntegrationsApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "IntegrationsApiError";
    this.status = status;
  }
}

async function call<T>(path: string, body?: unknown, timeoutMs = 20000): Promise<T> {
  const bearer = getBearerToken();
  const response = await fetch(`/api/integrations${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new IntegrationsApiError(response.status, data.error || `The server answered ${response.status}.`);
  }
  return data;
}

export type TestResult = { ok: boolean; text: string; checked?: boolean };

export const integrationsApi = {
  list: () => call<IntegrationsPayload>(""),
  /** `choose: true` lets the person pick the account on the provider's own page (nothing is refused). */
  start: (provider: ProviderId, hintEmail?: string, choose = false) => call<{ url: string }>("/start", { provider, hint_email: hintEmail || "", choose }),
  testAccount: (accountId: string) => call<TestResult>("/test", { account_id: accountId }, 30000),
  testKey: (service: string, key: string, email = "") => call<TestResult>("/test", { service, key, email }, 30000),
  testAccountService: (service: string, kind: string, fields: { key?: string; secret?: string; site?: string; email?: string }) =>
    call<TestResult & { site?: string }>("/test", { service, account_kind: kind, ...fields }, 30000),
  testMailbox: (mailboxId: string) => call<TestResult>("/test", { mailbox_id: mailboxId }, 30000),
  disconnectAccount: (accountId: string) => call<{ ok: true }>("/disconnect", { account_id: accountId }),
  disconnectMailbox: (mailboxId: string) => call<{ ok: true }>("/disconnect", { mailbox_id: mailboxId }),
  setExpected: (provider: ProviderId, email: string) => call<{ ok: true }>("/settings", { provider, expected_email: email }),
  setExpectedMany: (expected: Partial<Record<ProviderId, string>>) => call<{ ok: true }>("/settings", { expected }),
  makePrimary: (accountId: string) => call<{ ok: true }>("/settings", { account_id: accountId, primary: true }),
  forgetKey: (service: string) => call<{ ok: true }>("/disconnect", { service }),
  token: (provider: ProviderId, email = "") => call<{ access_token: string; expires_at: string | null; email: string }>("/token", { provider, email }),
};
