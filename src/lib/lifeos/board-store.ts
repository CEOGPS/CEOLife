import { ANON, SUPABASE } from "./supabase-public";
import { pullCloudflareDoc, pushCloudflareDoc } from "./cf-store";

const headers = { apikey: ANON, Authorization: `Bearer ${ANON}` };

// Storage fallback chain: Supabase (primary) -> Cloudflare KV (fallback) -> local (handled by
// the caller: memory.ts already keeps IndexedDB/localStorage current and treats a failure here
// as "stay on this browser", which is the final tier). The Cloudflare tier itself lives in
// cf-store.ts and is shared with agent-store.ts and lib/agents/memory.ts.

export async function pullCloud(device: string): Promise<{ doc: unknown; at: number } | null> {
  try {
    const response = await fetch(`${SUPABASE}/rest/v1/lifeos_board?device=eq.${encodeURIComponent(device)}&select=doc,updated_at`, { headers });
    if (response.ok) {
      const rows = await response.json() as { doc?: unknown; updated_at?: string }[];
      const row = rows?.[0];
      if (row?.doc) return { doc: row.doc, at: row.updated_at ? new Date(row.updated_at).getTime() : 0 };
      if (rows) return { doc: null, at: 0 };
    }
  } catch { /* Supabase unreachable, fall through to Cloudflare */ }
  try {
    return await pullCloudflareDoc(device);
  } catch {
    return null;
  }
}

// Generic writer for the brand/marks/keys side-docs (each keyed by its own "device" slug).
// Unlike pushCloud below, this never strips fields — the stripping there is specific to the
// main board doc (where keys/vault are deliberately kept out of shared storage).
async function writeDoc(device: string, doc: Record<string, unknown>) {
  try {
    const response = await fetch(`${SUPABASE}/rest/v1/lifeos_board?on_conflict=device`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ device, doc, updated_at: new Date().toISOString() }),
    });
    if (response.ok) return true;
  } catch { /* Supabase unreachable, fall through to Cloudflare */ }
  try {
    return await pushCloudflareDoc(device, doc);
  } catch {
    return false;
  }
}

export async function pushCloud(device: string, doc: Record<string, unknown>) {
  const copy = { ...doc };
  delete copy.keys;
  delete copy.vault;
  let packed = copy;
  if (JSON.stringify(packed).length > 700_000) {
    delete copy.banner;
    delete copy.logo;
    packed = copy;
  }
  return await writeDoc(device, packed);
}

const BRAND = "lifeos-brand";

export async function pullBrand(): Promise<{ banner: string; logo: string } | null> {
  const row = await pullCloud(BRAND);
  const doc = row?.doc;
  if (!doc || typeof doc !== "object") return null;
  const brand = doc as { banner?: unknown; logo?: unknown };
  return { banner: String(brand.banner || ""), logo: String(brand.logo || "") };
}

export async function pushBrand(banner: string, logo: string) {
  return await writeDoc(BRAND, { banner, logo });
}

const MARKS = "lifeos-marks";

export async function pullMarks(): Promise<Record<string, { state: "connected" | "error" | "saved"; text: string }>> {
  const row = await pullCloud(MARKS);
  const doc = row?.doc;
  if (!doc || typeof doc !== "object") return {};
  const marks = (doc as { marks?: unknown }).marks;
  if (!marks || typeof marks !== "object") return {};
  return marks as Record<string, { state: "connected" | "error" | "saved"; text: string }>;
}

export async function pushMarks(marks: Record<string, { state: string; text: string }>) {
  return await writeDoc(MARKS, { marks });
}

const KEYS = "lifeos-keys";

export async function pullKeys(): Promise<{ id: string; name: string; value: string }[]> {
  const row = await pullCloud(KEYS);
  const doc = row?.doc;
  if (!doc || typeof doc !== "object") return [];
  const keys = (doc as { keys?: unknown }).keys;
  if (!Array.isArray(keys)) return [];
  return keys.filter((item) => item && typeof item === "object" && "name" in item && "value" in item).map((item) => {
    const row = item as { id?: unknown; name?: unknown; value?: unknown };
    return { id: String(row.id || row.name || ""), name: String(row.name || ""), value: String(row.value || "") };
  }).filter((item) => item.name && item.value);
}

export async function pushKeys(keys: { id: string; name: string; value: string }[]) {
  return await writeDoc(KEYS, { keys });
}
