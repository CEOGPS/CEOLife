/** Real local Ollama. The card and Erebus/Kranos share this. A green status means /api/tags returned models. */

export type OllamaProbe = {
  ok: boolean;
  checked: true;
  text: string;
  base: string;
  model: string;
  models: string[];
};

const DEFAULT_BASE = "http://127.0.0.1:11434";

function clean(value: string) {
  return value.trim().replace(/^['"]|['"]$/g, "").replace(/^(bearer|token)\s+/i, "").trim();
}

function hostBase(value: string) {
  const raw = clean(value).replace(/\/+$/, "");
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (url.protocol !== "http:" && url.protocol !== "https:") return "";
      if (url.hostname === "169.254.169.254" || url.hostname === "metadata.google.internal") return "";
      return `${url.protocol}//${url.host}`;
    } catch {
      return "";
    }
  }
  const match = raw.match(/^(localhost|\d{1,3}(?:\.\d{1,3}){3}|\[[0-9a-f:]+\]|[a-z0-9.-]+\.local):(\d{2,5})$/i);
  if (!match) return "";
  return `http://${match[1]}:${match[2]}`;
}

function looksLikeModel(value: string) {
  if (value.length < 2 || value.length > 80 || /\s/.test(value)) return false;
  if (/^(sk-|gsk_|hf_|r8_|ollama_|Bearer)/i.test(value)) return false;
  if (value.length > 40 && !value.includes(":")) return false;
  return /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value);
}

export function ollamaTarget(saved = "") {
  const value = clean(saved);
  const fromValue = hostBase(value);
  const fromEnv = hostBase(process.env.OLLAMA_URL || process.env.OLLAMA_HOST || process.env.OLLAMA_BASE_URL || "");
  // The dashboard runs in the cloud, so a saved localhost address cannot work there. The tunnel address wins.
  const localOnly = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|$)/i.test(fromValue);
  const base = (fromValue && !(localOnly && fromEnv) ? fromValue : "") || fromEnv || DEFAULT_BASE;
  const prefer = !fromValue && looksLikeModel(value) ? value : clean(process.env.OLLAMA_MODEL || "");
  // The server's gate key always wins: a key typed on the card (for example an old Ollama cloud key) must not
  // replace it, or the tunnel refuses every call. The card's own text is used only when the server has none.
  const cardKey = fromValue || looksLikeModel(value) ? "" : value;
  // The gate key only ever goes to the server's own Ollama address, never to an address typed on the card.
  // OLLAMA_GATE_KEY unlocks the tunnel to this PC. OLLAMA_API_KEY is the Ollama Cloud key (ollama-cloud.ts).
  const key = (base === fromEnv ? clean(process.env.OLLAMA_GATE_KEY || "") : "") || cardKey;
  return { base, key, prefer };
}

function pickModel(models: string[], prefer: string) {
  if (!models.length) return "";
  const want = prefer.trim().toLowerCase();
  if (!want) return models[0];
  return models.find((name) => name.toLowerCase() === want)
    || models.find((name) => name.toLowerCase().split(":")[0] === want)
    || models.find((name) => name.toLowerCase().startsWith(`${want}:`))
    || "";
}

/**
 * The PC's Ollama is reached through a Cloudflare Tunnel (ollama.ceogps.com) that Cloudflare Access locks.
 * Only this server holds the Access service token, so the browser and the internet cannot use the tunnel.
 */
function accessHeaders(): Record<string, string> {
  const id = clean(process.env.OLLAMA_ACCESS_CLIENT_ID || "");
  const token = clean(process.env.OLLAMA_ACCESS_CLIENT_SECRET || "");
  return id && token ? { "CF-Access-Client-Id": id, "CF-Access-Client-Secret": token } : {};
}

async function readTags(base: string, key: string) {
  const headers: Record<string, string> = { Accept: "application/json", ...accessHeaders() };
  if (key) headers.Authorization = `Bearer ${key}`;
  const response = await fetch(`${base}/api/tags`, { headers, redirect: "manual", signal: AbortSignal.timeout(4000) });
  const raw = await response.text();
  let body: { models?: { name?: string; model?: string }[] } = {};
  try { body = raw ? JSON.parse(raw) as typeof body : {}; } catch { body = {}; }
  const models = Array.isArray(body.models)
    ? body.models.map((row) => String(row.name || row.model || "").trim()).filter(Boolean)
    : [];
  return { status: response.status, models, json: Array.isArray(body.models) };
}

function connectedText(base: string, models: string[], note = "") {
  const shown = models.slice(0, 3).join(", ");
  const more = models.length > 3 ? ` +${models.length - 3}` : "";
  return `Connected · ${base} · ${shown}${more}${note}`;
}

export async function probeOllama(saved = ""): Promise<OllamaProbe> {
  const target = ollamaTarget(saved);
  const empty = { checked: true as const, base: target.base, model: "", models: [] as string[] };
  try {
    let result = await readTags(target.base, target.key);
    let note = "";
    if ((result.status === 401 || result.status === 403) && target.key) {
      const open = await readTags(target.base, "");
      if (open.json) {
        result = open;
        note = " · key not required";
      }
    }
    if (result.status === 401 || result.status === 403) {
      return { ...empty, ok: false, text: target.key ? "Ollama refused the saved key." : `Ollama at ${target.base} requires an API key. Paste it on this card.` };
    }
    if (!result.json && result.status >= 300 && result.status < 400) {
      return { ...empty, ok: false, text: `Cloudflare Access blocked ${target.base}. The dashboard needs the tunnel's service token (OLLAMA_ACCESS_CLIENT_ID and its pair).` };
    }
    if (!result.json) {
      return { ...empty, ok: false, text: `Ollama at ${target.base} did not answer /api/tags (HTTP ${result.status}).` };
    }
    if (!result.models.length) {
      return { ...empty, ok: false, text: `Ollama is running at ${target.base} but no model is installed. Pull one, then Erebus and Kranos can use it.` };
    }
    const picked = pickModel(result.models, target.prefer);
    // A missing default should not stop the agents: use what is installed and say so on the card.
    const model = picked || result.models[0];
    const fallback = picked ? "" : ` · default ${target.prefer} is not installed, using ${model}`;
    return { ok: true, checked: true, text: connectedText(target.base, result.models, `${note}${fallback}`), base: target.base, model, models: result.models };
  } catch {
    return { ...empty, ok: false, text: `Ollama is not running at ${target.base}. Start it on this computer, then check again.` };
  }
}

export async function chatOllama(messages: { role: string; content: string }[], saved = "") {
  const status = await probeOllama(saved);
  if (!status.ok || !status.model) return "";
  const target = ollamaTarget(saved);
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json", ...accessHeaders() };
  if (target.key) headers.Authorization = `Bearer ${target.key}`;
  try {
    const response = await fetch(`${status.base}/api/chat`, {
      method: "POST",
      headers,
      redirect: "manual",
      body: JSON.stringify({ model: status.model, messages, stream: false }),
      signal: AbortSignal.timeout(120000),
    });
    if (!response.ok) return "";
    const body = await response.json() as { message?: { content?: string } };
    return (body.message?.content || "").trim();
  } catch {
    return "";
  }
}

export async function savedOllama() {
  try {
    const { pullKeys } = await import("./board-store");
    const rows = await pullKeys();
    return rows.find((row) => row.name === "Ollama (local)")?.value?.trim() || "";
  } catch {
    return "";
  }
}
