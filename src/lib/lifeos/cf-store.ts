/**
 * Shared Cloudflare KV fallback, used as the middle tier of the storage chain
 * (Supabase primary -> Cloudflare KV fallback -> local, handled by each caller)
 * for every store that keeps a doc keyed by an arbitrary string ("device",
 * an agent name, etc). Backed by the /api/board route on the lifeos1-api worker.
 */
const CF_API = "https://lifeos1-api.ceogps.workers.dev";

export async function pullCloudflareDoc(key: string): Promise<{ doc: unknown; at: number } | null> {
  const response = await fetch(`${CF_API}/api/board?device=${encodeURIComponent(key)}`);
  if (!response.ok) return null;
  return await response.json() as { doc: unknown; at: number };
}

export async function pushCloudflareDoc(key: string, doc: unknown) {
  const response = await fetch(`${CF_API}/api/board?device=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ doc }),
  });
  return response.ok;
}
