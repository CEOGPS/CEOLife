import { ANON, SUPABASE } from "@/lib/lifeos/supabase-public";

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

export async function pullErebusMemory(name = "Erebus") {
  const response = await fetch(`${SUPABASE}/rest/v1/lifeos_agents?name=eq.${encodeURIComponent(name)}&select=memory`, { headers });
  if (!response.ok) return EMPTY;
  const rows = await response.json() as { memory?: unknown }[];
  return normalizeMemory(rows[0]?.memory);
}

export async function pushErebusMemory(name: string, mem: ErebusMemory) {
  const memory = normalizeMemory(mem);
  const response = await fetch(`${SUPABASE}/rest/v1/lifeos_agents?on_conflict=name`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ name, memory, updated_at: new Date().toISOString() }),
  });
  return response.ok;
}
