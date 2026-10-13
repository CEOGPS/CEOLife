/** OpenAI, OpenRouter, Hugging Face, and NVIDIA. The card probe and Erebus/Kranos use the same calls. */

export type ProviderId = "openai" | "openrouter" | "huggingface" | "nvidia";

const CHAT: Record<ProviderId, string> = {
  openai: "https://api.openai.com/v1/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
  huggingface: "https://router.huggingface.co/v1/chat/completions",
  nvidia: "https://integrate.api.nvidia.com/v1/chat/completions",
};

const MODELS: Record<ProviderId, string> = {
  openai: "https://api.openai.com/v1/models",
  openrouter: "https://openrouter.ai/api/v1/key",
  huggingface: "https://huggingface.co/api/whoami-v2",
  nvidia: "https://integrate.api.nvidia.com/v1/models",
};

const FALLBACK: Record<ProviderId, string> = {
  openai: "gpt-4o-mini",
  openrouter: "meta-llama/llama-3.3-70b-instruct",
  huggingface: "meta-llama/Llama-3.1-8B-Instruct",
  nvidia: "openai/gpt-oss-20b",
};

const NAMES: Record<ProviderId, string[]> = {
  openai: ["OpenAI"],
  openrouter: ["OpenRouter"],
  huggingface: ["Hugging Face"],
  nvidia: ["NVIDIA", "NVIDIA NIM"],
};

const ENV: Record<ProviderId, string[]> = {
  openai: ["OPENAI_API_KEY", "VITE_OPENAI_API_KEY", "VOICE_TOOLS_OPENAI_KEY"],
  openrouter: ["OPENROUTER_API_KEY"],
  huggingface: ["HUGGINGFACE_API_KEY", "HF_TOKEN"],
  nvidia: ["NVIDIA_API_KEY", "NVAPI_KEY", "VITE_NVIDIA_API_KEY"],
};

function clean(value: string) {
  return value.trim().replace(/^['"]|['"]$/g, "").replace(/^(bearer|token)\s+/i, "").trim();
}

export function providerFromKey(key: string, model: string): ProviderId | "" {
  const secret = clean(key);
  const id = model.trim().toLowerCase();
  if (!secret || !id) return "";
  if (secret.startsWith("hf_")) return "huggingface";
  if (secret.startsWith("sk-or-")) return "openrouter";
  if (secret.startsWith("nvapi-")) return "nvidia";
  if (id.startsWith("claude") || id.startsWith("gemini") || id.includes("grok") || id.startsWith("deepseek") || id.startsWith("mistral")) return "";
  if (id.startsWith("llama") && !id.includes("/")) return "";
  if (id.startsWith("gpt") || /^o[134]([-.]|$)/.test(id) || id.startsWith("chatgpt")) return "openai";
  if (id.includes("nemotron") || id.startsWith("nvidia/") || id.startsWith("openai/")) return "nvidia";
  if (id.includes("/")) return secret.startsWith("sk-") ? "openrouter" : "huggingface";
  return "";
}

export function providerId(name: string): ProviderId | "" {
  if (name === "OpenAI") return "openai";
  if (name === "OpenRouter") return "openrouter";
  if (name === "Hugging Face") return "huggingface";
  if (name === "NVIDIA" || name === "NVIDIA NIM") return "nvidia";
  return "";
}

async function savedKey(id: ProviderId) {
  for (const name of ENV[id]) {
    const value = clean(process.env[name] || "");
    if (value) return value;
  }
  try {
    const { pullKeys } = await import("./board-store");
    const rows = await pullKeys();
    for (const want of NAMES[id]) {
      const hit = rows.find((row) => row.name === want && row.value.trim());
      if (hit) return clean(hit.value);
    }
  } catch {
    return "";
  }
  return "";
}

function messageOf(body: unknown, status: number) {
  if (body && typeof body === "object") {
    const row = body as { error?: { message?: string } | string; message?: string; detail?: string };
    const nested = typeof row.error === "string" ? row.error : row.error?.message;
    const text = nested || row.message || (typeof row.detail === "string" ? row.detail : "");
    if (text) return String(text).replace(/\s+/g, " ").slice(0, 220);
  }
  return `Refused (HTTP ${status}).`;
}

async function getJson(url: string, key: string, ms: number) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    signal: AbortSignal.timeout(ms),
  });
  const raw = await response.text();
  let body: unknown = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }
  return { ok: response.ok, status: response.status, body };
}

function replyText(body: unknown) {
  const message = (body as { choices?: { message?: { content?: unknown; reasoning?: unknown } }[] })?.choices?.[0]?.message;
  if (!message) return "";
  if (typeof message.content === "string" && message.content.trim()) return message.content;
  if (Array.isArray(message.content)) {
    const joined = message.content.map((part) => (part && typeof part === "object" && "text" in part ? String((part as { text?: string }).text || "") : "")).join("");
    if (joined.trim()) return joined;
  }
  if (typeof message.reasoning === "string" && message.reasoning.trim()) return message.reasoning;
  return "";
}

function modelIds(body: unknown) {
  const data = body && typeof body === "object" ? (body as { data?: { id?: string }[] }).data : undefined;
  return Array.isArray(data) ? data.map((row) => String(row?.id || "").trim()).filter(Boolean) : [];
}

function shown(ids: string[]) {
  const preferred = ids.filter((id) => /gpt-4o-mini|gpt-oss-20b|llama-3\.1-8b|llama-3\.3-70b/i.test(id));
  const pick = (preferred.length ? preferred : ids).slice(0, 3);
  const more = ids.length > pick.length ? ` +${ids.length - pick.length}` : "";
  return `${pick.join(", ")}${more}`;
}

export async function probeProvider(id: ProviderId, key: string) {
  const secret = clean(key);
  if (!secret) return { ok: false as const, checked: false as const, text: "No key is saved for this service." };
  try {
    const hit = await getJson(MODELS[id], secret, 8000);
    if (!hit.ok) return { ok: false as const, checked: true as const, text: messageOf(hit.body, hit.status) };
    if (id === "openrouter") {
      const data = (hit.body as { data?: { label?: string; limit_remaining?: number | null; is_free_tier?: boolean } }).data || {};
      const label = data.label || "key accepted";
      const left = typeof data.limit_remaining === "number" ? ` · ${data.limit_remaining} left` : "";
      const tier = data.is_free_tier ? " · free tier" : "";
      return { ok: true as const, checked: true as const, text: `Connected · ${label}${left}${tier}` };
    }
    if (id === "huggingface") {
      const who = hit.body as { name?: string; fullname?: string };
      const user = who.name || who.fullname || "token accepted";
      return { ok: true as const, checked: true as const, text: `Connected · ${user}` };
    }
    if (id === "openai") {
      const ids = modelIds(hit.body);
      const model = ids.includes("gpt-4o-mini") ? "gpt-4o-mini" : (ids.find((name) => name.startsWith("gpt-")) || FALLBACK.openai);
      const spoken = await fetch(CHAT.openai, {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ model, messages: [{ role: "user", content: "Reply with the single word PONG" }], max_tokens: 16, temperature: 0 }),
        signal: AbortSignal.timeout(20000),
      });
      const raw = await spoken.text();
      let body: unknown = {};
      try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }
      if (!spoken.ok) return { ok: false as const, checked: true as const, text: messageOf(body, spoken.status) };
      if (!replyText(body).trim()) return { ok: false as const, checked: true as const, text: "OpenAI accepted the key but returned an empty reply." };
      return { ok: true as const, checked: true as const, text: `Connected · ${ids.length || "live"} models · ${shown(ids)}` };
    }
    const ids = modelIds(hit.body);
    if (!ids.length) return { ok: false as const, checked: true as const, text: "The key was accepted, but no models were returned." };
    const wanted = FALLBACK[id];
    const has = ids.some((name) => name.toLowerCase() === wanted.toLowerCase());
    return { ok: true as const, checked: true as const, text: `Connected · ${ids.length} models · ${shown(ids)}${has ? "" : ` · ${wanted} is not listed`}` };
  } catch (error) {
    return { ok: false as const, checked: true as const, text: error instanceof Error ? error.message : "The service did not answer." };
  }
}

export async function chatProvider(id: ProviderId, messages: { role: string; content: string }[], key = "", model = "") {
  const secret = clean(key) || await savedKey(id);
  if (!secret) return { text: "", error: `No ${NAMES[id][0]} key is saved.` };
  const picked = model.trim() || FALLBACK[id];
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (id === "openrouter") {
    headers["HTTP-Referer"] = "https://lifeos.ceogps.com";
    headers["X-Title"] = "LifeOS";
  }
  try {
    const response = await fetch(CHAT[id], {
      method: "POST",
      headers,
      body: JSON.stringify({ model: picked, messages, max_tokens: id === "nvidia" ? 1200 : 600, temperature: 0.3 }),
      signal: AbortSignal.timeout(45000),
    });
    const raw = await response.text();
    let body: unknown = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }
    if (!response.ok) return { text: "", error: messageOf(body, response.status) };
    const text = replyText(body);
    if (!text.trim()) return { text: "", error: `${NAMES[id][0]} returned an empty reply.` };
    return { text, error: "" };
  } catch (error) {
    return { text: "", error: error instanceof Error ? error.message : `${NAMES[id][0]} did not answer.` };
  }
}
