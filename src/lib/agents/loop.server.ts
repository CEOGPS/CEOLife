import { doneAnswer, runPlannerLine, toolLine, type PlannerAct } from "@/components/dash/erebus-abilities";
import type { Memory } from "@/components/dash/memory";
import { chatOllama } from "@/lib/lifeos/ollama";
import { chatProvider, type ProviderId } from "@/lib/lifeos/providers";
import { agentToolCatalog, runAgentAct } from "./agent-acts";
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

function erebusPrompt(prompt: string) {
  const custom = prompt.replace(/use only the facts given\.?/gi, "").replace(/if a fact is missing, say it is not on the board\.?/gi, "").trim();
  return [
    "You are Erebus. You run this dashboard. Reason from the question and the tool results. Board facts are context. If a fact is missing, say it is unknown and answer the rest. Do not invent connection statuses, mail counts, balances, or people.",
    "Kranos manages workers, agents, and Telegram. Hermes and Qwen stay separate tools.",
    custom,
  ].filter(Boolean).join("\n");
}

function nextTool(text: string) {
  const known = toolLine(text);
  if (known) return known;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (/^(BROWSER|SITE|SOCIAL|EMAIL|CODE|BLOG|IMAGE|VIDEO|MUSIC):/i.test(line)) return line;
  }
  return "";
}

export async function runErebus(data: ErebusInput) {
  let mem = await pullErebusMemory("Erebus");
  const board = boardOf(data.memory);
  const acts: PlannerAct[] = [];
  const system = [erebusPrompt(data.prompt || ""), memoryBlock(mem), skillBlock(data.skills || []), toolList(), agentToolCatalog()].filter(Boolean).join("\n\n");
  let question = data.question;
  let facts = data.facts;
  let last = { ok: false, text: "", mind: data.mind };
  const finish = async (result: { ok: boolean; text: string; mind: string }) => {
    if (!result.ok) mem = rememberFailure(mem, result.text || "The model did not answer.");
    await pushErebusMemory("Erebus", mem);
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
    const act = (await runAgentAct(line)) || await runPlannerLine(board, line);
    acts.push(act);
    if (act.fact) mem = learn(mem, act.fact);
    facts = `${data.facts}\n\nTool result:\n${act.text}`;
    question = "Continue from that tool result. Emit DONE: and the answer, or one more tool line.";
  }
  return finish({ ok: last.ok, text: acts.at(-1)?.text || last.text || "No reply.", mind: last.mind });
}
