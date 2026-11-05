/**
 * Ollama Cloud: open models (gemma4:31b by default) hosted at https://ollama.com.
 * Server only. The key comes from OLLAMA_API_KEY and is never sent to the browser or printed.
 * Docs: https://docs.ollama.com/api/introduction.md and https://docs.ollama.com/api/authentication.md
 */
export const OLLAMA_CLOUD_URL = "https://ollama.com";
export const OLLAMA_CLOUD_DEFAULT_MODEL = "gemma4:31b";

export type CloudMessage = { role: string; content: string };
export type CloudReply = { text: string; model: string; status: number; error: string };

function cleanKey(value: string) {
  return String(value || "").trim().replace(/^['"]|['"]$/g, "").replace(/^bearer\s+/i, "").trim();
}

export function ollamaCloudKey(override = "") {
  return cleanKey(override) || cleanKey(process.env.OLLAMA_API_KEY || "");
}

export function ollamaCloudModel(override = "") {
  return String(override || process.env.OLLAMA_CLOUD_MODEL || OLLAMA_CLOUD_DEFAULT_MODEL).trim();
}

/** What each failure status means, in the words the card shows. */
function explain(status: number, raw: string) {
  if (status === 401) return "Ollama Cloud refused the key. Make a new one at ollama.com/settings/keys.";
  if (status === 402) return "Ollama Cloud needs usage credits on this account.";
  if (status === 404) return "Ollama Cloud does not have that model name.";
  if (status === 429) return "Ollama Cloud usage limit reached. Try again later.";
  let message = "";
  try { message = String((JSON.parse(raw) as { error?: string }).error || ""); } catch { message = raw.slice(0, 160); }
  return message || `Ollama Cloud answered HTTP ${status}.`;
}

export async function chatOllamaCloud(messages: CloudMessage[], opts: { key?: string; model?: string; maxTokens?: number; timeoutMs?: number } = {}): Promise<CloudReply> {
  const key = ollamaCloudKey(opts.key);
  const model = ollamaCloudModel(opts.model);
  if (!key) return { text: "", model, status: 0, error: "No Ollama Cloud key is saved (OLLAMA_API_KEY)." };
  try {
    const response = await fetch(`${OLLAMA_CLOUD_URL}/api/chat`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        ...(opts.maxTokens ? { options: { num_predict: opts.maxTokens } } : {}),
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 120_000),
    });
    const raw = await response.text();
    if (!response.ok) return { text: "", model, status: response.status, error: explain(response.status, raw) };
    let body: { message?: { content?: string } } = {};
    try { body = JSON.parse(raw) as typeof body; } catch { body = {}; }
    const text = String(body.message?.content || "").trim();
    return text ? { text, model, status: response.status, error: "" } : { text: "", model, status: response.status, error: "Ollama Cloud returned an empty reply." };
  } catch (error) {
    return { text: "", model, status: 0, error: error instanceof Error ? error.message : "Ollama Cloud did not answer." };
  }
}
