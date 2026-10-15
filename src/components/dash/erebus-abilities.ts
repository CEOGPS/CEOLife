import type { Lead } from "@/lib/lifeos/board";
import type { Memory } from "./memory";

/** Tools from advanced_agent/planner.py. One line, no code fence. */
const TOOL = /^(SEARCH_WEB|BROWSE_URL|SCRAPE_PAGE|READ_LIFEOS|UPDATE_LEAD|CREATE_TASK|REMEMBER_FACT|DRAFT_EMAIL|NOTIFY):\s*(.*)$/i;

export type PlannerAct = {
  text: string;
  task?: string;
  noteTitle?: string;
  noteBody?: string;
  fact?: string;
  lead?: { name: string; status: string; note: string };
  draft?: { to: string; subject: string; body: string };
  notify?: string;
};

export function erebusOrders() {
  return [
    "STANDING ORDERS: Dinner at 6:30pm is not moved. Address Chris by first name. Family time wins when it conflicts with a meeting. Do not invent leads, tasks, or numbers that are not on the board.",
    "When you need live data or a board change, emit exactly one tool line and nothing else. When you are finished, emit DONE: and the answer.",
    "SEARCH_WEB: query",
    "BROWSE_URL: https://url",
    "READ_LIFEOS: crm | tasks | goals | calendar",
    "UPDATE_LEAD: name=X status=hot notes=Y",
    "CREATE_TASK: text=X priority=high",
    "REMEMBER_FACT: key=X value=Y",
    "DRAFT_EMAIL: to=X subject=Y body=Z",
    "NOTIFY: message",
  ].join("\n");
}

export function coldLeadNotice(leads: Lead[]) {
  const cold = leads.filter((row) => /cold|lost|inactive|stale/i.test(row.status));
  if (!cold.length) return "";
  return `${cold.length} cold lead${cold.length === 1 ? "" : "s"}: ${cold.slice(0, 5).map((row) => row.name).join(", ")}.`;
}

function params(spec: string) {
  const out: Record<string, string> = {};
  for (const match of spec.matchAll(/(\w+)=([^=]+?)(?=\s+\w+=|$)/g)) out[match[1].toLowerCase()] = match[2].trim();
  return out;
}

export function toolLine(text: string) {
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (TOOL.test(line)) return line;
  }
  return "";
}

export function doneAnswer(text: string) {
  const line = text.split("\n").map((row) => row.trim()).find((row) => /^DONE:/i.test(row));
  return line ? line.replace(/^DONE:\s*/i, "").trim() : "";
}

function readLife(data: Memory, key: string) {
  const name = key.toLowerCase();
  if (name.startsWith("crm") || name.startsWith("lead")) {
    const rows = data.leads.slice(0, 20).map((row) => `${row.name} | ${row.status || "unknown"} | ${row.note || ""}`);
    return rows.length ? rows.join("\n") : "No leads saved.";
  }
  if (name.startsWith("task")) {
    const rows = data.tasks.slice(0, 20).map((row) => `${row.done ? "done" : "open"} | ${row.title}`);
    return rows.length ? rows.join("\n") : "No tasks saved.";
  }
  if (name.startsWith("goal")) {
    const rows = data.ideas.slice(0, 12).map((row) => `${row.status} | ${row.title}`);
    return rows.length ? rows.join("\n") : "No goals saved.";
  }
  if (name.startsWith("cal")) {
    const rows = data.events.slice(0, 16).map((row) => `${row.date || `day ${row.day}`} ${row.start || ""} ${row.title}`.trim());
    return rows.length ? rows.join("\n") : "No calendar events saved.";
  }
  return "Use crm, tasks, goals, or calendar.";
}

export async function runPlannerLine(data: Memory, line: string): Promise<PlannerAct> {
  const match = line.trim().match(TOOL);
  if (!match) return { text: "No tool on that line." };
  const kind = match[1].toUpperCase();
  const spec = match[2].trim();
  if (kind === "SEARCH_WEB") {
    const { lookup } = await import("@/lib/lifeos/sync");
    const result = await lookup({ data: { query: spec.slice(0, 180), kind: "web", key: "" } });
    const hits = result.hits.slice(0, 5).map((hit) => `${hit.title} — ${hit.url}`).join("\n");
    return { text: hits || result.note || "No search results." };
  }
  if (kind === "BROWSE_URL" || kind === "SCRAPE_PAGE") {
    const url = spec.split("|")[0].trim();
    if (!/^https?:\/\//i.test(url)) return { text: "That is not an http address." };
    const { inspectSite } = await import("@/lib/lifeos/sync");
    const result = await inspectSite({ data: url });
    return { text: `${result.title || "No title"}. ${result.description || "No description."} (${result.status})` };
  }
  if (kind === "READ_LIFEOS") return { text: readLife(data, spec) };
  if (kind === "CREATE_TASK") {
    const fields = params(spec);
    const title = (fields.text || spec).slice(0, 160);
    return { text: `Task saved: ${title}`, task: title };
  }
  if (kind === "UPDATE_LEAD") {
    const fields = params(spec);
    const name = fields.name || "";
    if (!name) return { text: "UPDATE_LEAD needs name=." };
    return { text: `Lead ${name} set to ${fields.status || "updated"}.`, lead: { name: name.slice(0, 80), status: (fields.status || "warm").slice(0, 40), note: (fields.notes || fields.note || "").slice(0, 400) } };
  }
  if (kind === "REMEMBER_FACT") {
    const fields = params(spec);
    const text = fields.key && fields.value ? `${fields.key}: ${fields.value}` : spec;
    return { text: `Remembered ${text.slice(0, 180)}`, fact: text.slice(0, 400) };
  }
  if (kind === "DRAFT_EMAIL") {
    const fields = params(spec);
    const subject = (fields.subject || "Draft").slice(0, 120);
    const body = (fields.body || spec).slice(0, 4000);
    return { text: `Draft saved for ${fields.to || "unaddressed"}: ${subject}`, noteTitle: `Draft · ${subject}`, noteBody: body, draft: { to: (fields.to || "").slice(0, 160), subject, body } };
  }
  if (kind === "NOTIFY") return { text: spec.slice(0, 240), notify: spec.slice(0, 240) };
  return { text: "That tool is not connected." };
}

export function applyActs(update: (recipe: (prev: Memory) => Memory) => void, acts: PlannerAct[]) {
  const real = acts.filter((act) => act.task || act.noteTitle || act.fact || act.lead || act.draft || act.notify);
  if (!real.length) return;
  update((prev) => {
    let next = prev;
    for (const act of real) {
      const id = crypto.randomUUID();
      if (act.task) next = { ...next, tasks: [{ id, title: act.task, done: false }, ...next.tasks] };
      if (act.noteTitle) next = { ...next, notes: [{ id: crypto.randomUUID(), title: act.noteTitle, body: act.noteBody || "" }, ...next.notes] };
      if (act.fact) next = { ...next, facts: [{ id: crypto.randomUUID(), text: act.fact, source: "Erebus", at: new Date().toISOString() }, ...next.facts] };
      if (act.lead) {
        const name = act.lead.name.toLowerCase();
        const hit = next.leads.find((row) => row.name.toLowerCase() === name);
        next = hit
          ? { ...next, leads: next.leads.map((row) => row.id === hit.id ? { ...row, status: act.lead?.status || row.status, note: act.lead?.note || row.note } : row) }
          : { ...next, leads: [{ id: crypto.randomUUID(), name: act.lead.name, source: "Erebus", status: act.lead.status, note: act.lead.note }, ...next.leads] };
      }
      if (act.draft) {
        next = {
          ...next,
          mail: [{ id: crypto.randomUUID(), title: act.draft.subject, body: act.draft.body, at: new Date().toISOString(), folder: "drafts", to: act.draft.to, from: "", starred: false }, ...next.mail],
        };
      }
      if (act.notify) next = { ...next, notifs: [{ id: crypto.randomUUID(), text: act.notify, source: "Erebus", seen: false }, ...next.notifs] };
    }
    return next;
  });
}

type ModelReply = { ok: boolean; text: string; mind?: string };

/** One planner loop: the model may call a tool, then it answers. Stops at two tools. */
export async function askWithAbilities(data: Memory, question: string, preface: string, call: (question: string, facts: string) => Promise<ModelReply>) {
  const acts: PlannerAct[] = [];
  let board = data;
  let prompt = question;
  let facts = `${preface}\n\n${erebusOrders()}`;
  let last: ModelReply = { ok: false, text: "" };
  for (let step = 0; step < 3; step += 1) {
    last = await call(prompt, facts);
    const finished = doneAnswer(last.text || "");
    if (finished) return { text: finished, ok: last.ok, mind: last.mind || "", acts };
    const line = toolLine(last.text || "");
    if (!line) return { text: (last.text || "").trim(), ok: last.ok, mind: last.mind || "", acts };
    const act = await runPlannerLine(board, line);
    acts.push(act);
    board = applyLocal(board, act);
    facts = `${preface}\n\nTool result:\n${act.text}`;
    prompt = "Continue from that tool result. Emit DONE: and the answer, or one more tool line.";
  }
  return { text: acts.at(-1)?.text || last.text || "Stopped after two tools.", ok: last.ok, mind: last.mind || "", acts };
}

function applyLocal(data: Memory, act: PlannerAct): Memory {
  let next = data;
  if (act.task) next = { ...next, tasks: [{ id: "local", title: act.task, done: false }, ...next.tasks] };
  if (act.fact) next = { ...next, facts: [{ id: "local", text: act.fact, source: "Erebus", at: "" }, ...next.facts] };
  if (act.lead) {
    const name = act.lead.name.toLowerCase();
    const hit = next.leads.find((row) => row.name.toLowerCase() === name);
    next = hit
      ? { ...next, leads: next.leads.map((row) => row.name.toLowerCase() === name ? { ...row, status: act.lead?.status || row.status, note: act.lead?.note || row.note } : row) }
      : { ...next, leads: [{ id: "local", name: act.lead.name, source: "Erebus", status: act.lead.status, note: act.lead.note }, ...next.leads] };
  }
  return next;
}
