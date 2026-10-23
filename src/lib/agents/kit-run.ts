import type { ToolHit } from "@/components/dash/agent-tools";
import { runAgentTool } from "@/components/dash/agent-tools";
import type { Memory } from "@/components/dash/memory";
import { planKitLine, type KitHand } from "./kit";

export async function executeKit(data: Memory, text: string, fromUser: boolean): Promise<ToolHit | null> {
  const plan = planKitLine(text, fromUser);
  if (!plan) return null;
  let textOut = plan.text;
  try {
    if (plan.search) {
      const { lookup } = await import("@/lib/lifeos/sync");
      const result = await lookup({ data: { query: plan.search, kind: "web", key: data.keys.find((row) => row.name === "Dogpile")?.value || "" } });
      const hits = result.hits.slice(0, 6).map((hit) => `${hit.title} — ${hit.url}`).join("\n");
      textOut = `${plan.text}\n${hits || result.note || "No results."}`;
    }
    if (plan.page) {
      const { inspectSite } = await import("@/lib/lifeos/sync");
      const result = await inspectSite({ data: plan.page });
      textOut = `${textOut}\nPage ${result.status}: ${result.title || "No title"}. ${result.description || "No description."}`;
    }
    if (plan.telegram) {
      const token = data.keys.find((row) => row.name === "Telegram")?.value || "";
      const { telegramBot } = await import("@/lib/lifeos/sync");
      const result = await telegramBot({ data: { token, chat: plan.telegram.chat, text: plan.telegram.text } });
      textOut = result.ok ? `Telegram sent to ${plan.telegram.chat}.` : `Telegram did not send. ${result.error}`;
    }
  } catch (error) {
    textOut = error instanceof Error ? error.message : "The plugin call failed.";
  }
  return { text: textOut, noteTitle: plan.noteTitle, noteBody: plan.noteBody, hand: plan.hand, handPrompt: plan.handPrompt };
}

export async function runHand(data: Memory, hit: { hand?: KitHand; handPrompt?: string }): Promise<string> {
  if (!hit.hand || !hit.handPrompt) return "";
  const { askHermes, askQwen, askQwenChat } = await import("@/components/dash/local-agents");
  if (hit.hand === "hermes") {
    const job = await askHermes(data, hit.handPrompt);
    return job.text || "Hermes returned an empty reply.";
  }
  if (hit.hand === "qwen-image" || hit.hand === "qwen-video") {
    const job = await askQwen(data, hit.handPrompt, hit.hand === "qwen-image" ? "image" : "video");
    return job.url ? `${job.text}\n${job.url}` : job.text || "Qwen returned an empty reply.";
  }
  const job = await askQwenChat(data, hit.handPrompt);
  return job.text || "Qwen returned an empty reply.";
}

export async function hostFromActs(data: Memory, acts: { hand?: KitHand; handPrompt?: string }[]) {
  const parts: string[] = [];
  for (const act of acts) {
    if (!act.hand || !act.handPrompt) continue;
    parts.push(await runHand(data, act));
  }
  return parts.filter(Boolean).join("\n\n");
}

const SLASH = /^\/(plugins|plugin|telegram)\b/i;

export async function runShared(data: Memory, text: string): Promise<ToolHit | null> {
  const line = text.trim();
  if (SLASH.test(line) || /^(PLUGIN|TELEGRAM):/i.test(line)) {
    return executeKit(data, line, line.startsWith("/"));
  }
  return runAgentTool(data, text);
}
