import { ANON, SUPABASE } from "@/lib/lifeos/supabase-public";
import { pullCloudflareDoc, pushCloudflareDoc } from "@/lib/lifeos/cf-store";

export type ErebusMemory = {
  identity: string[];
  orders: string[];
  failures: string[];
  preferences: string[];
};

const EMPTY: ErebusMemory = { identity: [], orders: [], failures: [], preferences: [] };
const headers = { apikey: ANON, Authorization: `Bearer ${ANON}`, Accept: "application/json", "Content-Type": "application/json" };

function lines(value: unknown, max = 20) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim().slice(0, 240)).filter(Boolean).slice(-max);
}

export function normalizeMemory(value: unknown): ErebusMemory {
  const row = value && typeof value === "object" ? value as Partial<ErebusMemory> : {};
  return {
    identity: lines(row.identity),
    orders: lines(row.orders),
    failures: lines(row.failures),
    preferences: lines(row.preferences),
  };
}

export function loadErebusMemory(data: { erebusMemory?: ErebusMemory }): ErebusMemory {
  return normalizeMemory(data.erebusMemory);
}

export function memoryBlock(mem: ErebusMemory) {
  const linesOut: string[] = [];
  if (mem.identity.length) linesOut.push("## Who the user is", ...mem.identity.map((item) => `- ${item}`));
  if (mem.orders.length) linesOut.push("\n## Standing orders", ...mem.orders.map((item) => `- ${item}`));
  if (mem.preferences.length) linesOut.push("\n## Preferences", ...mem.preferences.map((item) => `- ${item}`));
  if (mem.failures.length) linesOut.push("\n## What failed before (avoid repeating)", ...mem.failures.map((item) => `- ${item}`));
  return linesOut.join("\n");
}

export function rememberFailure(mem: ErebusMemory, failure: string) {
  const next = failure.trim().slice(0, 240);
  if (!next || mem.failures.includes(next)) return mem;
  return { ...mem, failures: [...mem.failures, next].slice(-20) };
}

export function rememberOrder(mem: ErebusMemory, order: string) {
  const next = order.trim().slice(0, 240);
  if (!next || mem.orders.includes(next)) return mem;
  return { ...mem, orders: [...mem.orders, next].slice(-20) };
}

// Cloudflare fallback key, used only when Supabase is unreachable (see cf-store.ts for the
// shared KV helper this calls into).
const memoryKey = (name: string) => `agent-memory:${name}`;

export async function pullErebusMemory(name = "Erebus") {
  try {
    const response = await fetch(`${SUPABASE}/rest/v1/lifeos_agents?name=eq.${encodeURIComponent(name)}&select=memory`, { headers });
    if (response.ok) {
      const rows = await response.json() as { memory?: unknown }[];
      if (rows.length) return normalizeMemory(rows[0]?.memory);
    }
  } catch { /* Supabase unreachable, fall through to Cloudflare */ }
  try {
    const row = await pullCloudflareDoc(memoryKey(name));
    if (row?.doc) return normalizeMemory(row.doc);
  } catch { /* Cloudflare unreachable too; caller falls back to the local cache */ }
  return EMPTY;
}

export async function pushErebusMemory(name: string, mem: ErebusMemory) {
  const memory = normalizeMemory(mem);
  try {
    const response = await fetch(`${SUPABASE}/rest/v1/lifeos_agents?on_conflict=name`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ name, memory, updated_at: new Date().toISOString() }),
    });
    if (response.ok) return true;
  } catch { /* Supabase unreachable, fall through to Cloudflare */ }
  try {
    return await pushCloudflareDoc(memoryKey(name), memory);
  } catch {
    return false;
  }
}

/* ---------- Every agent: persistent memory (Supabase row + local copy) ---------- */

export type AgentMemory = ErebusMemory;
export const MEMORY_KINDS = ["identity", "orders", "preferences", "failures"] as const;
export type MemoryKind = typeof MEMORY_KINDS[number];
export const MEMORY_LABELS: Record<MemoryKind, string> = {
  identity: "Who you are",
  orders: "Standing orders",
  preferences: "Preferences",
  failures: "What failed before",
};

const MEMORY_CACHE = "lifeos.agentMemory.v1";

function readAllMemory(): Record<string, AgentMemory> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = JSON.parse(localStorage.getItem(MEMORY_CACHE) || "{}") as Record<string, unknown>;
    return raw && typeof raw === "object" ? Object.fromEntries(Object.entries(raw).map(([name, mem]) => [name, normalizeMemory(mem)])) : {};
  } catch {
    return {};
  }
}

export function readMemoryCache(name: string): AgentMemory {
  return readAllMemory()[name] || normalizeMemory(EMPTY);
}

function writeMemoryCache(name: string, mem: AgentMemory) {
  try {
    const all = readAllMemory();
    all[name] = normalizeMemory(mem);
    localStorage.setItem(MEMORY_CACHE, JSON.stringify(all));
  } catch { /* the Supabase row is the copy that lasts */ }
}

function unionLines(a: string[], b: string[]) {
  return [...new Set([...a, ...b])].slice(-20);
}

export function mergeMemory(a: AgentMemory, b: AgentMemory): AgentMemory {
  return {
    identity: unionLines(a.identity, b.identity),
    orders: unionLines(a.orders, b.orders),
    preferences: unionLines(a.preferences, b.preferences),
    failures: unionLines(a.failures, b.failures),
  };
}

export function isEmptyMemory(mem: AgentMemory) {
  return MEMORY_KINDS.every((kind) => !mem[kind].length);
}

/**
 * Loads an agent's memory. Remote (Supabase, falling back to Cloudflare KV via
 * pullErebusMemory) is merged with the local copy, so anything saved while offline or while
 * both remote tiers were down still survives.
 */
export async function pullAgentMemory(name: string): Promise<AgentMemory> {
  const local = readMemoryCache(name);
  const remote = await pullErebusMemory(name);
  const merged = mergeMemory(remote, local);
  writeMemoryCache(name, merged);
  return merged;
}

/** Saves an agent's memory locally first, then to its Supabase row. Returns false if only the local copy saved. */
export async function pushAgentMemory(name: string, mem: AgentMemory) {
  const memory = normalizeMemory(mem);
  writeMemoryCache(name, memory);
  try {
    return await pushErebusMemory(name, memory);
  } catch {
    return false;
  }
}

function addLine(mem: AgentMemory, kind: MemoryKind, value: string): AgentMemory {
  const next = value.trim().replace(/\s+/g, " ").replace(/[.!]+$/, "").slice(0, 240);
  if (next.length < 3 || mem[kind].some((line) => line.toLowerCase() === next.toLowerCase())) return mem;
  return { ...mem, [kind]: [...mem[kind], next].slice(-20) };
}

/**
 * Picks durable facts out of what the user just said: "remember …", "my name is …", "I prefer …",
 * "always / never / from now on …", and "forget …". Returns the new memory and what changed.
 */
export function learnFromMessage(mem: AgentMemory, text: string): { mem: AgentMemory; learned: string[]; forgot: string[] } {
  let next = normalizeMemory(mem);
  const learned: string[] = [];
  const forgot: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).map((line) => line.trim()).filter(Boolean);
  for (const sentence of sentences) {
    if (sentence.length > 300 || sentence.endsWith("?")) continue;
    const forget = sentence.match(/^(?:please\s+)?forget(?:\s+that)?\s+(.{3,})/i);
    if (forget) {
      const needle = forget[1].toLowerCase().replace(/[.!]+$/, "").trim();
      for (const kind of MEMORY_KINDS) {
        const kept = next[kind].filter((line) => !line.toLowerCase().includes(needle));
        if (kept.length !== next[kind].length) { forgot.push(...next[kind].filter((line) => !kept.includes(line))); next = { ...next, [kind]: kept }; }
      }
      continue;
    }
    const remember = sentence.match(/^(?:please\s+)?(?:remember|note|keep in mind)(?:\s+that)?[:,]?\s+(.{3,})/i);
    const body = remember ? remember[1] : sentence;
    let kind: MemoryKind | "" = "";
    if (/^(?:always|never|from now on|going forward|don'?t|do not|stop|make sure)\b/i.test(body)) kind = "orders";
    else if (/^(?:i|we)\s+(?:prefer|like|love|hate|dislike|want|need|enjoy)\b/i.test(body)) kind = "preferences";
    else if (/^(?:my|our)\s+\w+(?:\s+\w+)?\s+(?:is|are|was)\b|^(?:i am|i'm|i live|i work|i run|i own|i have|we are|we're)\b/i.test(body)) kind = "identity";
    else if (remember) kind = /^(?:i|my|we|our)\b/i.test(body) ? "identity" : "orders";
    if (!kind) continue;
    const before = next[kind].length;
    next = addLine(next, kind, body);
    if (next[kind].length !== before) learned.push(body.replace(/[.!]+$/, ""));
  }
  return { mem: next, learned, forgot };
}

export function memoryText(lines: string[]) {
  return lines.join("\n");
}

export function memoryLines(text: string) {
  return text.split("\n").map((line) => line.replace(/^[-•*]\s*/, "").trim()).filter(Boolean).slice(-20);
}
