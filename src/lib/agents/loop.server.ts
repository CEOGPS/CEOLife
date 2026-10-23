import { doneAnswer, runPlannerLine, toolLine, type PlannerAct } from "@/components/dash/erebus-abilities";
import type { Memory } from "@/components/dash/memory";
import { chatOllama } from "@/lib/lifeos/ollama";
import { chatProvider, type ProviderId } from "@/lib/lifeos/providers";
import { agentActLine, agentToolCatalog, runAgentAct } from "./agent-acts";
import { briefFor, kitLine, planKitLine, type AgentId } from "./kit";
import { memoryBlock, pullErebusMemory, pushErebusMemory, rememberFailure, rememberOrder, type ErebusMemory } from "./memory";
import { skillBlock, type Skill } from "./skills";
import { toolList } from "./tools";

const HOSTED = new Set<string>(["openai", "openrouter", "huggingface", "nvidia"]);

export type ErebusInput = {
  question: string;
  facts: string;
  mind: string;
  model: string;
  endpoint: string;
  prompt: string;
  key: string;
  memory: Partial<Memory>;
  skills: Skill[];
  agent?: string;
};

function boardOf(memory: Partial<Memory>): Memory {
  return {
    leads: memory.leads || [],
    tasks: memory.tasks || [],
    ideas: memory.ideas || [],
    events: memory.events || [],
    facts: memory.facts || [],
  } as Memory;
}

async function reply(input: ErebusInput, messages: { role: string; content: string }[]) {
  if (HOSTED.has(input.mind)) {
    const direct = await chatProvider(input.mind as ProviderId, messages, input.key, input.model);
    return { ok: Boolean(direct.text), text: direct.text || direct.error || "", mind: input.mind };
  }
  const text = await chatOllama(messages, input.endpoint);
  if (text) return { ok: true, text, mind: "ollama" };
  return { ok: false, text: "", mind: input.mind || "ollama" };
}

function learn(mem: ErebusMemory, fact: string) {
  const [key, ...rest] = fact.split(":");
  const value = rest.join(":").trim();
  const name = key.trim().toLowerCase();
  if (!value) return mem;
  if (name === "order") return rememberOrder(mem, value);
  if (name === "failure") return rememberFailure(mem, value);
  if (name === "preference") return { ...mem, preferences: [...mem.preferences, value.slice(0, 240)].slice(-20) };
  if (name === "identity") return { ...mem, identity: [...mem.identity, value.slice(0, 240)].slice(-20) };
  return mem;
}

function namedAgent(name: string): AgentId {
  if (name === "Kranos" || name === "Hermes" || name === "Qwen") return name;
  return "Erebus";
}

function agentPrompt(agent: AgentId, prompt: string) {
  const custom = prompt.replace(/use only the facts given\.?/gi, "").replace(/if a fact is missing, say it is not on the board\.?/gi, "").trim();
  return [briefFor(agent), custom].filter(Boolean).join("\n");
}

function nextTool(text: string) {
  return toolLine(text) || kitLine(text) || agentActLine(text);
}

async function applyServerKit(line: string): Promise<PlannerAct | null> {
  const plan = planKitLine(line, false);
  if (!plan) return null;
  if (plan.search) return { text: `${plan.text} Emit SEARCH_WEB: ${plan.search}` };
  if (plan.page) {
    try {
      const response = await fetch(plan.page, { headers: { "User-Agent": "LifeOS/1", Accept: "text/html" }, signal: AbortSignal.timeout(8000), redirect: "follow" });
      const raw = await response.text();
      const title = raw.match(/<title[^>]*>([^<]*)/i)?.[1]?.trim() || "";
      return { text: `${plan.text} HTTP ${response.status}. ${title}`.slice(0, 500), hand: plan.hand, handPrompt: plan.handPrompt };
    } catch (error) {
      return { text: error instanceof Error ? error.message : "The page did not open." };
    }
  }
  if (plan.telegram) {
    const token = process.env.TELEGRAM_BOT_TOKEN || "";
    if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) return { text: "No Telegram bot token is on the server. Nothing was sent." };
    try {
      const sent = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: plan.telegram.chat, text: plan.telegram.text }),
        signal: AbortSignal.timeout(8000),
      });
      const body = await sent.json() as { ok?: boolean; description?: string };
      return { text: body.ok ? `Telegram sent to ${plan.telegram.chat}.` : `Telegram did not send. ${body.description || `HTTP ${sent.status}`}` };
    } catch (error) {
      return { text: error instanceof Error ? error.message : "Telegram did not answer." };
    }
  }
  return { text: plan.text, hand: plan.hand, handPrompt: plan.handPrompt, noteTitle: plan.noteTitle, noteBody: plan.noteBody };
}

export async function runErebus(data: ErebusInput) {
  const agent = namedAgent(data.agent || "Erebus");
  let mem = await pullErebusMemory(agent);
  const board = boardOf(data.memory);
  const acts: PlannerAct[] = [];
  const system = [agentPrompt(agent, data.prompt || ""), memoryBlock(mem), skillBlock(data.skills || []), toolList(), agentToolCatalog()].filter(Boolean).join("\n\n");
  let question = data.question;
  let facts = data.facts;
  let last = { ok: false, text: "", mind: data.mind };
  const finish = async (result: { ok: boolean; text: string; mind: string }) => {
    if (!result.ok) mem = rememberFailure(mem, result.text || "The model did not answer.");
    await pushErebusMemory(agent, mem);
    return { ...result, acts, memory: mem };
  };
  for (let step = 0; step < 3; step += 1) {
    const messages = [
      { role: "system", content: system },
      { role: "user", content: facts ? `Facts:\n${facts}\n\nQuestion: ${question}` : question },
    ];
    last = await reply(data, messages);
    if (!last.text) break;
    const finished = doneAnswer(last.text);
    if (finished) return finish({ ok: true, text: finished, mind: last.mind });
    const line = nextTool(last.text);
    if (!line) return finish({ ok: last.ok, text: last.text.trim(), mind: last.mind });
    const act = (await applyServerKit(line)) || (await runAgentAct(line)) || await runPlannerLine(board, line);
    acts.push(act);
    if (act.hand) return finish({ ok: last.ok, text: act.text, mind: last.mind });
    if (act.fact) mem = learn(mem, act.fact);
    facts = `${data.facts}\n\nTool result:\n${act.text}`;
    question = "Continue from that tool result. Emit DONE: and the answer, or one more tool line.";
  }
  return finish({ ok: last.ok, text: acts.at(-1)?.text || last.text || "No reply.", mind: last.mind });
}
