import { ANON, SUPABASE } from "./supabase-public";
import { pullCloudflareDoc, pushCloudflareDoc } from "./cf-store";

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
// Cloudflare fallback key for the full agent-settings map. Agents live as individual rows in
// Supabase, but the KV fallback (one doc per key) stores them as a single map under this key,
// merged from the local cache at push time so a Supabase outage still gets *something* to the
// next device/browser instead of nothing.
const AGENTS_KEY = "lifeos-agents";
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
  try {
    const response = await fetch(`${SUPABASE}/rest/v1/lifeos_agents?select=name,soul,personality,instructions,rules,voice,skin,avatar,task,active`, { headers });
    if (response.ok) {
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
  } catch { /* Supabase unreachable, fall through to Cloudflare */ }
  try {
    const row = await pullCloudflareDoc(AGENTS_KEY);
    const doc = row?.doc;
    if (doc && typeof doc === "object") return doc as Record<string, AgentSettings>;
  } catch { /* Cloudflare unreachable too; caller falls back to the local cache */ }
  return null;
}

export async function pushAgent(name: string, form: AgentSettings) {
  try {
    const response = await fetch(`${SUPABASE}/rest/v1/lifeos_agents?on_conflict=name`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ name, ...form, updated_at: new Date().toISOString() }),
    });
    if (response.ok) return true;
  } catch { /* Supabase unreachable, fall through to Cloudflare */ }
  try {
    const all = { ...readAgentCache(), [name]: form };
    writeAgentCache(all);
    return await pushCloudflareDoc(AGENTS_KEY, all);
  } catch {
    return false;
  }
}

export async function deleteAgent(name: string) {
  const cache = readAgentCache();
  delete cache[name];
  writeAgentCache(cache);
  try {
    const response = await fetch(`${SUPABASE}/rest/v1/lifeos_agents?name=eq.${encodeURIComponent(name)}`, { method: "DELETE", headers });
    if (response.ok) return;
  } catch { /* Supabase unreachable, fall through to Cloudflare */ }
  try {
    await pushCloudflareDoc(AGENTS_KEY, cache);
  } catch { /* local cache is already updated; nothing more we can do right now */ }
}
