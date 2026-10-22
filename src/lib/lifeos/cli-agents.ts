import { spawn } from "node:child_process";
import { createServerFn } from "@tanstack/react-start";
import { sessionMiddleware } from "./session-middleware";

function run(command: string, args: string[]) {
  return new Promise<{ ok: boolean; text: string; url: string }>((resolve) => {
    const child = spawn(command, args, { windowsHide: true, env: { ...process.env, CI: "1" } });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill();
      resolve({ ok: false, text: `${command} took too long and was stopped.`, url: "" });
    }, 120_000);
    child.stdout.on("data", (chunk) => {
      out += String(chunk);
      if (out.length > 12_000) out = out.slice(-12_000);
    });
    child.stderr.on("data", (chunk) => {
      err += String(chunk);
      if (err.length > 4_000) err = err.slice(-4_000);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      const missing = (error as NodeJS.ErrnoException).code === "ENOENT";
      resolve({ ok: false, text: missing ? `${command} is not installed on the computer running this app.` : error.message, url: "" });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const text = (out || err).trim().slice(0, 8000);
      const url = text.match(/https?:\/\/\S+/)?.[0] || "";
      resolve({ ok: code === 0 && Boolean(text), text: text || `${command} exited with no output.`, url });
    });
  });
}

async function dashscope(data: { prompt: string; key: string; check: boolean }) {
  const key = data.key || process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY || "";
  const base = (process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1").replace(/\/$/, "");
  if (!key) return { ok: false, text: "No DashScope key is on the server, and none is saved on the Qwen card.", url: "" };
  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  if (data.check) {
    const response = await fetch(`${base}/models`, { headers, signal: AbortSignal.timeout(8000) });
    const body = await response.json().catch(() => ({})) as { data?: unknown[]; error?: { message?: string } };
    if (!response.ok) return { ok: false, text: body.error?.message || `Qwen refused the key (HTTP ${response.status}).`, url: "" };
    const count = Array.isArray(body.data) ? body.data.length : 0;
    return { ok: true, text: count ? `Qwen answered. ${count} models.` : "Qwen accepted the key.", url: "" };
  }
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ model: "qwen-plus", messages: [{ role: "user", content: data.prompt }], max_tokens: 600 }),
    signal: AbortSignal.timeout(20000),
  });
  const body = await response.json().catch(() => ({})) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } };
  const text = body.choices?.[0]?.message?.content?.trim() || "";
  if (!response.ok || !text) return { ok: false, text: body.error?.message || `Qwen did not answer (HTTP ${response.status}).`, url: "" };
  return { ok: true, text, url: "" };
}

export const runHostedAgent = createServerFn({ method: "POST" })
  .middleware([sessionMiddleware])
  .validator((input: { who?: string; prompt?: string; key?: string; check?: boolean; url?: string }) => ({
    who: input?.who === "qwen" ? "qwen" as const : "hermes" as const,
    prompt: String(input?.prompt || "").slice(0, 4000),
    key: String(input?.key || "").trim().slice(0, 400),
    check: Boolean(input?.check),
    url: String(input?.url || "").trim().slice(0, 300),
  }))
  .handler(async ({ data }) => {
    if (data.who === "qwen") return dashscope(data);
    if (data.check) {
      const result = await run("hermes", ["--version"]);
      if (result.ok) return { ...result, text: `hermes ${result.text.split("\n")[0]}` };
      return { ok: false, text: "The hermes command is not on this server. A gateway on this computer can still answer from the browser.", url: "" };
    }
    if (!data.prompt) return { ok: false, text: "Nothing to send.", url: "" };
    const cli = await run("hermes", ["chat", "-q", data.prompt]);
    if (cli.ok) return cli;
    const root = data.url.replace(/\/$/, "");
    if (!root.startsWith("https://")) return { ok: false, text: cli.text, url: "" };
    try {
      const response = await fetch(`${root}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(data.key ? { Authorization: `Bearer ${data.key}` } : {}) },
        body: JSON.stringify({ model: "hermes-agent", messages: [{ role: "user", content: data.prompt }] }),
        signal: AbortSignal.timeout(20000),
      });
      const body = await response.json().catch(() => ({})) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } };
      const text = body.choices?.[0]?.message?.content?.trim() || "";
      if (!response.ok || !text) return { ok: false, text: body.error?.message || `Hermes gateway answered HTTP ${response.status}.`, url: "" };
      return { ok: true, text, url: "" };
    } catch {
      return { ok: false, text: cli.text, url: "" };
    }
  });

export const runCliAgent = createServerFn({ method: "POST" })
  .middleware([sessionMiddleware])
  .validator((input: { who?: string; prompt?: string; check?: boolean }) => ({
    who: input?.who === "qwen" ? "qwen" as const : "hermes" as const,
    prompt: String(input?.prompt || "").slice(0, 4000),
    check: Boolean(input?.check),
  }))
  .handler(async ({ data }) => {
    if (data.check) {
      const result = await run(data.who, ["--version"]);
      return result.ok ? { ...result, text: `${data.who} ${result.text.split("\n")[0]}` } : result;
    }
    if (!data.prompt) return { ok: false, text: "Nothing to send.", url: "" };
    if (data.who === "qwen") return run("qwen", ["-p", data.prompt, "--output-format", "text"]);
    return run("hermes", ["chat", "-q", data.prompt]);
  });
