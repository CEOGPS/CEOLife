import { sessionAuthHeaders } from "./oauth";

const WORKER = "https://lifeos1-api.ceogps.workers.dev";

export type CheckRow = { subject: string; state: "green" | "red" | string; detail: string; provider: string; checked_at?: string };
export type FeedRow = { id: string; source: string; kind: string; title: string; body: string; read: boolean; created_at: string };
export type MailStatus = { email: string; ok: boolean; text: string; count: number };
export type LiveProject = { id: string; name: string; status: string; budget_cents: number | null; description: string | null; client_name: string | null; deadline: string | null };
export type BudgetLine = { id: string; project_id: string; label: string; amount_cents: number; kind: string };
export type BriefRow = { kind: string; body: string; source: string; day: string };

async function call<T>(path: string, init?: { method?: string; body?: unknown }): Promise<{ ok: boolean; status: number; body: T; error: string }> {
  try {
    const headers = await sessionAuthHeaders({ "Content-Type": "application/json" });
    const response = await fetch(`${WORKER}${path}`, {
      method: init?.method || "GET",
      headers,
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const body = await response.json().catch(() => ({})) as T & { error?: string };
    const error = response.ok ? "" : body.error || `The worker answered HTTP ${response.status}.`;
    return { ok: response.ok, status: response.status, body, error };
  } catch (error) {
    return { ok: false, status: 0, body: {} as T, error: error instanceof Error ? error.message : "The worker did not answer." };
  }
}

export async function listChecks() {
  const result = await call<{ checks?: CheckRow[] }>("/api/checks");
  return { rows: result.body.checks || [], error: result.error };
}

export async function probeMail() {
  const result = await call<{ statuses?: MailStatus[] }>("/api/mail/probe", { method: "POST", body: {} });
  return { statuses: result.body.statuses || [], error: result.error };
}

export async function probeGreen() {
  const result = await call<{ checks?: { provider: string; email: string; state: string; detail: string }[] }>("/api/checks/probe", { method: "POST", body: {} });
  return { checks: result.body.checks || [], error: result.error };
}

export async function listFeed() {
  const result = await call<{ events?: FeedRow[] }>("/api/activity/feed?limit=80");
  return { events: result.body.events || [], error: result.error };
}

export async function logFeed(source: string, kind: string, title: string, body = "") {
  return call<{ ok?: boolean }>("/api/activity/log", { method: "POST", body: { source, kind, title, body } });
}

export async function listBriefs() {
  const result = await call<{ briefs?: BriefRow[] }>("/api/briefs");
  return { briefs: result.body.briefs || [], error: result.error };
}

export async function saveBrief(kind: string, body: string, source: string) {
  return call<{ ok?: boolean }>("/api/briefs", { method: "POST", body: { kind, body, source } });
}

export async function listProjects() {
  const result = await call<{ projects?: LiveProject[]; lines?: BudgetLine[]; linesError?: string }>("/api/projects");
  return { projects: result.body.projects || [], lines: result.body.lines || [], error: result.error || result.body.linesError || "" };
}

export async function createProject(name: string, budgetCents: number, description: string) {
  return call<{ project?: LiveProject; error?: string }>("/api/projects", { method: "POST", body: { name, budget_cents: budgetCents, description } });
}

export async function addBudgetLine(projectId: string, label: string, amountCents: number, kind: "expense" | "income") {
  return call<{ line?: BudgetLine; error?: string }>("/api/projects/line", { method: "POST", body: { project_id: projectId, label, amount_cents: amountCents, kind } });
}
