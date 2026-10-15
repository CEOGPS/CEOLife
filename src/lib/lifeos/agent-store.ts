import { ANON, SUPABASE } from "./supabase-public";

export type AgentSettings = {
  soul: string;
  personality: string;
  instructions: string;
  rules: string;
  voice: string;
  skin: string;
  avatar: string;
  task: string;
  active: boolean;
};

const CACHE = "lifeos.agents.v1";
const headers = { apikey: ANON, Authorization: `Bearer ${ANON}`, Accept: "application/json", "Content-Type": "application/json" };

export function readAgentCache(): Record<string, AgentSettings> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE) || "{}") as Record<string, AgentSettings>;
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

export function writeAgentCache(all: Record<string, AgentSettings>) {
  try { localStorage.setItem(CACHE, JSON.stringify(all)); } catch { /* the row in Supabase is the copy that lasts */ }
}

export async function pullAgents(): Promise<Record<string, AgentSettings> | null> {
  const response = await fetch(`${SUPABASE}/rest/v1/lifeos_agents?select=name,soul,personality,instructions,rules,voice,skin,avatar,task,active`, { headers });
  if (!response.ok) return null;
  const rows = await response.json() as { name?: string; soul?: string; personality?: string; instructions?: string; rules?: string; voice?: string; skin?: string; avatar?: string; task?: string; active?: boolean }[];
  const out: Record<string, AgentSettings> = {};
  for (const row of rows) {
    const name = String(row.name || "").trim();
    if (!name) continue;
    out[name] = {
      soul: String(row.soul || ""),
      personality: String(row.personality || ""),
      instructions: String(row.instructions || ""),
      rules: String(row.rules || ""),
      voice: String(row.voice || ""),
      skin: String(row.skin || ""),
      avatar: String(row.avatar || ""),
      task: String(row.task || ""),
      active: Boolean(row.active),
    };
  }
  return out;
}

export async function pushAgent(name: string, form: AgentSettings) {
  const response = await fetch(`${SUPABASE}/rest/v1/lifeos_agents?on_conflict=name`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ name, ...form, updated_at: new Date().toISOString() }),
  });
  return response.ok;
}

export async function deleteAgent(name: string) {
  const cache = readAgentCache();
  delete cache[name];
  writeAgentCache(cache);
  await fetch(`${SUPABASE}/rest/v1/lifeos_agents?name=eq.${encodeURIComponent(name)}`, { method: "DELETE", headers });
}
