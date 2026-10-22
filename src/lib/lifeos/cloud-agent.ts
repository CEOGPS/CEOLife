import { createServerFn } from "@tanstack/react-start";
import { sessionMiddleware } from "./session-middleware";

async function complete(messages: { role: string; content: string }[]) {
  const nvidia = (process.env.NVIDIA_API_KEY || "").trim();
  const nvidiaBase = (process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1").replace(/\/$/, "");
  const xai = (process.env.XAI_API_KEY || process.env.GROK_API_KEY || "").trim();
  const target = nvidia
    ? { url: `${nvidiaBase}/chat/completions`, key: nvidia, model: "openai/gpt-oss-20b" }
    : xai
      ? { url: "https://api.x.ai/v1/chat/completions", key: xai, model: "grok-4.5" }
      : null;
  if (!target) return { text: "", error: "No NVIDIA or xAI key is on the Cloudflare server." };
  const response = await fetch(target.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${target.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: target.model, messages, max_tokens: 500, temperature: 0.2 }),
    signal: AbortSignal.timeout(20000),
  });
  const body = await response.json().catch(() => ({})) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } };
  const text = body.choices?.[0]?.message?.content?.trim() || "";
  if (!response.ok || !text) return { text: "", error: body.error?.message || `Cloudflare agent got HTTP ${response.status}.` };
  return { text, error: "" };
}

export const cloudAgent = createServerFn({ method: "POST" })
  .middleware([sessionMiddleware])
  .validator((input: { question?: string; facts?: string }) => ({
    question: String(input?.question || "").trim().slice(0, 4000),
    facts: String(input?.facts || "").slice(0, 12000),
  }))
  .handler(async ({ data }) => {
    if (!data.question) return { ok: false as const, text: "Nothing to do.", steps: [] as string[] };
    const system = "You are the LifeOS agent on Cloudflare, working for Erebus. Use only the facts given. To read one public page, reply with exactly FETCH: https://address and nothing else. When you are finished, reply with DONE: and the answer. Never invent names, numbers, or statuses.";
    let facts = data.facts;
    let question = data.question;
    const steps: string[] = [];
    let last = "";
    for (let step = 0; step < 3; step += 1) {
      const result = await complete([
        { role: "system", content: system },
        { role: "user", content: facts ? `Facts:\n${facts}\n\n${question}` : question },
      ]);
      if (!result.text) return { ok: false as const, text: result.error, steps };
      last = result.text;
      const line = result.text.split("\n").map((row) => row.trim()).find((row) => /^FETCH:/i.test(row));
      if (!line) {
        const done = result.text.split("\n").map((row) => row.trim()).find((row) => /^DONE:/i.test(row));
        return { ok: true as const, text: (done ? done.replace(/^DONE:\s*/i, "") : result.text).trim(), steps };
      }
      const url = line.replace(/^FETCH:\s*/i, "").trim();
      if (!/^https:\/\//i.test(url)) {
        facts = `${data.facts}\n\nTool result: only an https address can be fetched.`;
        question = "Continue. Emit DONE: and the answer, or one FETCH line.";
        continue;
      }
      try {
        const response = await fetch(url, { headers: { "User-Agent": "LifeOS/1.0", Accept: "text/html,application/json" }, signal: AbortSignal.timeout(8000) });
        const raw = await response.text();
        const text = raw.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1500);
        steps.push(`${url} HTTP ${response.status}`);
        facts = `${data.facts}\n\nFetched ${url} (HTTP ${response.status}):\n${text || "No text."}`;
      } catch {
        steps.push(`${url} failed`);
        facts = `${data.facts}\n\nFetched ${url}: the page did not answer.`;
      }
      question = "Continue from that page. Emit DONE: and the answer, or one more FETCH line.";
    }
    return { ok: false as const, text: last || "Stopped after three steps.", steps };
  });
