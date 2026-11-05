import { useEffect, useRef, useState } from "react";
import { EngineBar } from "./engine-bar";
import { hubNoteId, newId, type Memory } from "./memory";
import { deleteAgent, pullAgents, pushAgent, readAgentCache, writeAgentCache, type AgentSettings } from "@/lib/lifeos/agent-store";
import { defaultVoice, readClones, voiceId, VOICES } from "./voices";
import { VoiceClone } from "./dock";
import { briefFor, hostPrompt, PLUGINS, type AgentId } from "@/lib/agents/kit";
import { hostFromActs, runHand, runShared } from "@/lib/agents/kit-run";
import { AGENT_SKILLS, matchedSkill, skillBrief } from "./agent-tools";
import { applyActs, askWithAbilities } from "./erebus-abilities";
import { askHermes, askQwen, askQwenChat, pingGateway } from "./local-agents";
import { boardFacts } from "./facts";
import { isEmptyMemory, learnFromMessage, MEMORY_KINDS, MEMORY_LABELS, memoryBlock, memoryLines, memoryText, normalizeMemory, pullAgentMemory, pushAgentMemory, readMemoryCache, type AgentMemory } from "@/lib/agents/memory";

type Update = (recipe: (prev: Memory) => Memory) => void;
type Section = "erebus" | "kranos" | "agents" | "hierarchy" | "models" | "hermes" | "qwen" | "messaging" | "workers" | "assignments" | "skills";

const GROUPS: { label: string; items: { id: Section; label: string }[] }[] = [
  { label: "Primary", items: [
    { id: "erebus", label: "Erebus" },
    { id: "kranos", label: "Kranos" },
    { id: "agents", label: "Agents" },
    { id: "hierarchy", label: "Hierarchy" },
  ] },
  { label: "Models", items: [
    { id: "models", label: "Models" },
    { id: "hermes", label: "Hermes" },
    { id: "qwen", label: "Qwen" },
  ] },
  { label: "Ops", items: [
    { id: "skills", label: "Skills" },
    { id: "messaging", label: "Telegram" },
    { id: "workers", label: "Workers" },
    { id: "assignments", label: "Assignments" },
  ] },
];

const field = "mt-1 min-h-16 w-full rounded-2xl border border-line bg-black/40 px-3 py-2 text-sm";
const BUILT_SKINS = [
  { name: "Nova", note: "Clean circular window" },
  { name: "Nyx", note: "Darker window" },
  { name: "Ember", note: "Warm edge" },
];
const AVATARS = ["nova", "nyx", "ember"];

const ROSTER = [
  { name: "Zero", role: "Command Intelligence", tagline: "Tactical · Dark · Omniscient", avatar: "nyx", prompt: "You are Zero. Cold, tactical, no fluff. Serve Chris Green at LifeOS. Stay in character." },
  { name: "Inferno", role: "Sales Dominator", tagline: "Aggressive · Relentless · Fire", avatar: "ember", prompt: "You are Inferno. High energy closer. Destroy objections and drive action for Chris Green." },
  { name: "Nova", role: "Strategic Visionary", tagline: "Intuitive · Strategic · Wise", avatar: "nova", prompt: "You are Nova. Wise and precise. Connect patterns and guide long-term decisions for Chris Green." },
  { name: "Viper", role: "Data and Analytics", tagline: "Precise · Lethal · Calculated", avatar: "nova", prompt: "You are Viper. Surgical and data-driven. Facts, numbers, and a clear next step only." },
  { name: "Rage", role: "Execution Engine", tagline: "Unstoppable · Bold · Fearless", avatar: "ember", prompt: "You are Rage. Bold and relentless. Turn the problem into the next action for Chris Green." },
  { name: "Aurora", role: "Creative Director", tagline: "Elegant · Luminous · Creative", avatar: "nyx", prompt: "You are Aurora. Elegant creative director. Write polished copy and brand ideas for Chris Green." },
  { name: "Breeze", role: "Comms and Social", tagline: "Connected · Fluid · Always On", avatar: "nova", prompt: "You are Breeze. Fast social and comms operator. Keep replies short and ready to post." },
];

const STAFF = [
  { name: "Wire", role: "API calls", task: "Report which keys are saved and which calls failed." },
  { name: "Clerk", role: "Email and calendar", task: "Report the inbox and the next events." },
  { name: "Closer", role: "Sales", task: "Report open CRM deals and who needs a follow-up." },
  { name: "Signal", role: "Marketing", task: "Report campaigns, keywords, and what is not running." },
  { name: "Pulse", role: "Social", task: "Report posts, accounts, and what has not gone out." },
  { name: "Line", role: "Calls", task: "Report calls and messages that still need a reply." },
  { name: "Studio", role: "Images, video, sound, music, docs", task: "Report files made and drafts still unfinished." },
  { name: "Host", role: "Website and DNS", task: "Report GoDaddy, Cloudflare, and Brilliant Directories." },
  { name: "Scout", role: "Web scraping", task: "Report the last search and pages that were read." },
  { name: "Gauge", role: "Analytics", task: "Report the saved site and social numbers only." },
  { name: "Hack", role: "Life hacks", task: "Report one practical next step from the board." },
  { name: "Lens", role: "AI insights", task: "Report what the saved numbers actually show." },
  { name: "Sim", role: "Simulators", task: "Report which simulators were used." },
  { name: "Lead", role: "Leads", task: "Report new leads and which ones have no next step." },
  { name: "Book", role: "CRM and storage", task: "Report how many contacts are stored and what is missing." },
];

function laneDigest(data: Memory) {
  const keys = data.keys.filter((row) => row.value).map((row) => row.name);
  const crm = data.contacts.filter((row) => row.kind === "crm").length;
  const open = data.tasks.filter((row) => !row.done).map((row) => row.title);
  return [
    `Erebus · Code: ${open.length} open tasks. ${open.slice(0, 8).join("; ") || "none"}.`,
    `Wire · API: ${keys.length ? keys.join(", ") : "no keys saved"}.`,
    `Clerk · Mail and calendar: ${data.events.length} events on the board.`,
    `Closer · Sales: ${crm} CRM contacts.`,
    `Signal · Marketing: ${data.marketing.map((row) => row.label).slice(0, 8).join(", ") || "no campaigns saved"}.`,
    `Pulse · Social: ${data.socialAccounts.length} accounts, ${data.socialPosts.length} posts.`,
    `Line · Calls: ${data.thread.filter((row) => /call|sms|message/i.test(row.platform || "")).length} message rows.`,
    `Studio · Creation: ${data.media.length} media files, ${data.tracks.length} tracks, ${data.notes.length} notes.`,
    `Host · Site and DNS: ${["GoDaddy", "Cloudflare Account", "Cloudflare Token", "Brilliant Directories"].filter((name) => keys.includes(name)).join(", ") || "none of those keys are saved"}.`,
    `Scout · Scraping: last search ${data.query || "none"}.`,
    `Gauge · Analytics: ${data.stats.map((row) => `${row.label} ${row.value}`).join(", ") || "no analytics saved"}.`,
    `Hack · Life hacks: ${open.length} open tasks to draw a next step from.`,
    `Lens · Insights: ${data.accounts.length} accounts, ${data.expenses.filter((row) => !row.paid).length} unpaid bills.`,
    `Sim · Simulators: the simulator panel is the source. No run is stored on the board unless a note says so.`,
    `Lead · Leads: ${data.leads.length}. ${data.leads.slice(0, 8).map((row) => `${row.name} (${row.status})`).join(", ") || "none"}.`,
    `Book · Storage: ${data.contacts.length} contacts, ${data.contacts.length - crm} personal.`,
    `Jobs on: ${data.jobs.filter((row) => row.active).map((row) => row.agent).join(", ") || "none"}.`,
  ].join("\n");
}

const CATALOG = [
  { id: "llama3.2", name: "Ollama", key: "Ollama (local)", note: "First choice on this machine" },
  { id: "openai/gpt-oss-20b", name: "NVIDIA", key: "NVIDIA", note: "Hosted open model" },
  { id: "meta-llama/Llama-3.1-8B-Instruct", name: "Hugging Face", key: "Hugging Face", note: "Open model" },
  { id: "grok-4.5", name: "Grok", key: "xAI", note: "Uses grok2api when that gateway key is saved" },
  { id: "claude-sonnet-4-20250514", name: "Claude Sonnet", key: "Anthropic", note: "Writing and analysis" },
  { id: "claude-opus-4-20250514", name: "Claude Opus", key: "Anthropic", note: "Hard tasks" },
  { id: "gpt-4o", name: "GPT-4o", key: "OpenAI", note: "Vision and code" },
  { id: "gpt-4o-mini", name: "GPT-4o mini", key: "OpenAI", note: "Fast OpenAI" },
  { id: "gemini-2.0-flash", name: "Gemini Flash", key: "Gemini", note: "Google multimodal" },
  { id: "llama-3.3-70b-versatile", name: "Groq Llama 3.3", key: "Groq", note: "Fast open model" },
  { id: "deepseek-chat", name: "DeepSeek", key: "DeepSeek", note: "Reasoning and code" },
  { id: "mistral-large-latest", name: "Mistral Large", key: "Mistral", note: "European model" },
  { id: "meta-llama/llama-3.3-70b-instruct", name: "OpenRouter Llama", key: "OpenRouter", note: "Any routed model" },
];

function readChat(data: Memory, name: string) {
  const row = data.notes.find((item) => item.title === `Chat · ${name}`);
  try {
    const parsed = JSON.parse(row?.body || "[]") as { role?: string; text?: string }[];
    if (!Array.isArray(parsed)) return [] as { role: "user" | "ai"; text: string }[];
    return parsed.filter((item) => item?.text && (item.role === "user" || item.role === "ai")).slice(-24).map((item) => ({ role: item.role as "user" | "ai", text: String(item.text) }));
  } catch {
    return [] as { role: "user" | "ai"; text: string }[];
  }
}

function saveChat(update: Update, name: string, lines: { role: "user" | "ai"; text: string }[]) {
  update((prev) => ({
    ...prev,
    notes: [{ id: hubNoteId(`Chat · ${name}`), title: `Chat · ${name}`, body: JSON.stringify(lines.slice(-24)) }, ...prev.notes.filter((row) => row.title !== `Chat · ${name}`)],
  }));
}

function preferredModel(data: Memory) {
  return data.notes.find((row) => row.title === "Hub · Model")?.body.trim() || "grok-4.5";
}

function keyFor(data: Memory, modelId: string) {
  const row = CATALOG.find((item) => item.id === modelId);
  if (!row) return "";
  if (row.key === "NVIDIA") return data.keys.find((item) => item.name === "NVIDIA")?.value || data.keys.find((item) => item.name === "NVIDIA NIM")?.value || "";
  if (row.key === "xAI") return data.keys.find((item) => item.name === "xAI")?.value || data.keys.find((item) => item.name === "Grok (xAI)")?.value || "";
  return data.keys.find((item) => item.name === row.key)?.value || "";
}

function mindOf(card: string) {
  if (card === "OpenAI") return "openai";
  if (card === "OpenRouter") return "openrouter";
  if (card === "NVIDIA") return "nvidia";
  if (card === "Hugging Face") return "huggingface";
  if (card === "Ollama (local)") return "ollama";
  if (card === "xAI") return "grok";
  return "";
}

function readSkins(data: Memory) {
  const row = data.notes.find((item) => item.title === "Hub · Skins");
  try {
    const extra = JSON.parse(row?.body || "[]") as { name?: string; note?: string }[];
    const custom = Array.isArray(extra) ? extra.filter((item) => item?.name && !BUILT_SKINS.some((skin) => skin.name === item.name)).map((item) => ({ name: String(item.name), note: String(item.note || "") })) : [];
    return [...BUILT_SKINS, ...custom];
  } catch {
    return BUILT_SKINS;
  }
}

function readAgent(data: Memory, name: string) {
  const cached = readAgentCache()[name];
  const row = data.notes.find((item) => item.title === `Agent · ${name}`);
  const pick = (label: string) => row?.body.split("\n").find((line) => line.startsWith(label))?.slice(label.length).trim() || "";
  const job = data.jobs.find((item) => item.agent === name);
  if (cached) return { ...cached, task: cached.task || job?.task || "", active: cached.active };
  return {
    soul: pick("Soul: "),
    personality: pick("Personality: "),
    instructions: pick("Instructions: "),
    rules: pick("Rules: "),
    voice: pick("Voice: ") || defaultVoice(name),
    skin: pick("Skin: ") || "Nova",
    avatar: pick("Avatar: ") || "nova",
    task: job?.task || "",
    active: Boolean(job?.active),
  };
}

function saveAgent(update: Update, name: string, form: AgentSettings) {
  const cache = readAgentCache();
  cache[name] = form;
  writeAgentCache(cache);
  void pushAgent(name, form);
  update((prev) => ({
    ...prev,
    jobs: [{ id: hubNoteId(`Job · ${name}`), agent: name, task: form.task.trim() || "Awaiting assignment", active: form.active }, ...prev.jobs.filter((row) => row.agent !== name)],
  }));
}

/** Everything that makes this agent who it is: soul, personality, instructions, rules, and what it remembers. */
function personaOf(name: string, form: AgentSettings, blurb: string, mem: AgentMemory) {
  const parts = [
    `You are ${name}.`,
    form.soul.trim() ? `## Soul\n${form.soul.trim()}` : "",
    form.personality.trim() ? `## Personality\n${form.personality.trim()}` : "",
    form.instructions.trim() ? `## Instructions\n${form.instructions.trim()}` : blurb,
    form.rules.trim() ? `## Rules you must follow\n${form.rules.trim()}` : "",
    isEmptyMemory(mem) ? "" : `## Your memory (persistent; use it, don't recite it)\n${memoryBlock(mem)}`,
  ];
  return parts.filter(Boolean).join("\n\n");
}

function MemoryPanel({ name, mem, onChange }: { name: string; mem: AgentMemory; onChange: (next: AgentMemory) => void }) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [state, setState] = useState("");
  const [loaded, setLoaded] = useState(name);
  if (loaded !== name) { setLoaded(name); setDrafts({}); setState(""); }
  const value = (kind: typeof MEMORY_KINDS[number]) => drafts[kind] ?? memoryText(mem[kind]);
  async function save() {
    const next = normalizeMemory(Object.fromEntries(MEMORY_KINDS.map((kind) => [kind, memoryLines(value(kind))])));
    setState("Saving");
    const ok = await pushAgentMemory(name, next);
    onChange(next);
    setDrafts({});
    setState(ok ? "Saved" : "Saved on this device only");
  }
  async function clear() {
    const next = normalizeMemory({});
    setState("Clearing");
    const ok = await pushAgentMemory(name, next);
    onChange(next);
    setDrafts({});
    setState(ok ? "Cleared" : "Cleared on this device only");
  }
  return (
    <div className="mt-5">
      <p className="mb-1 text-[10px] tracking-widest text-white/35">MEMORY · {MEMORY_KINDS.reduce((sum, kind) => sum + mem[kind].length, 0)} ITEMS</p>
      <p className="text-[11px] text-white/40">One item per line. {name} also learns from chat: say "remember …", "always …", "I prefer …", or "forget …".</p>
      {MEMORY_KINDS.map((kind) => (
        <label key={kind} className="mt-3 block text-[11px] uppercase tracking-wider text-white/40">{MEMORY_LABELS[kind]}
          <textarea className={field} value={value(kind)} onChange={(event) => setDrafts({ ...drafts, [kind]: event.target.value })} />
        </label>
      ))}
      <div className="mt-2 flex items-center gap-4">
        <button type="button" className="quiet is-on" onClick={() => void save()}>Save memory</button>
        <button type="button" className="link-remove" onClick={() => void clear()}>Clear memory</button>
        {state ? <span className="text-[11px] text-white/45">{state}</span> : null}
      </div>
    </div>
  );
}

function Profile({ name, blurb, data, update, stamp }: { name: string; blurb: string; data: Memory; update: Update; stamp: number }) {
  const roster = ROSTER.find((agent) => agent.name === name);
  const saved = Boolean(readAgentCache()[name]) || data.notes.some((row) => row.title === `Agent · ${name}`);
  const base = readAgent(data, name);
  const current = !saved && roster ? { ...base, soul: roster.tagline, personality: roster.role, instructions: roster.prompt, avatar: roster.avatar } : base;
  const [form, setForm] = useState(current);
  const [loaded, setLoaded] = useState(name);
  const [seen, setSeen] = useState(stamp);
  const [skinName, setSkinName] = useState("");
  const [skinNote, setSkinNote] = useState("");
  const [mem, setMem] = useState<AgentMemory>(() => readMemoryCache(name));
  if (loaded !== name || seen !== stamp) { setLoaded(name); setSeen(stamp); setForm(readAgent(data, name)); setMem(readMemoryCache(name)); }
  useEffect(() => {
    let live = true;
    void pullAgentMemory(name).then((next) => { if (live) setMem(next); });
    return () => { live = false; };
  }, [name]);
  const skins = readSkins(data);
  const clip = AVATARS.includes(form.avatar) ? `/agents/avatars/${form.avatar}.mp4` : "";
  return (
    <div>
      <h1 className="text-2xl">{name}</h1>
      <p className="text-sm text-white/50">{blurb}</p>
      <div className="mt-3 flex gap-4">
        <button type="button" className="quiet" onClick={() => setForm({ ...form, active: !form.active })}>{form.active ? "On" : "Off"}</button>
      </div>
      <p className="mb-2 mt-4 text-[10px] tracking-widest text-white/35">AVATAR</p>
      <div className="flex flex-wrap items-end gap-3">
        {AVATARS.map((avatar) => (
          <button key={avatar} type="button" className={`quiet ${form.avatar === avatar ? "is-on" : ""}`} onClick={() => setForm({ ...form, avatar })}>
            <img className="mb-1 h-16 w-16 rounded-full object-cover" src={`/agents/stills/${avatar}.jpg`} alt="" />
            <span className="capitalize">{avatar}</span>
          </button>
        ))}
        {clip ? null : form.avatar ? <img src={form.avatar} alt="" className="h-16 w-16 rounded-full object-cover" /> : null}
      </div>
      <label className="mt-2 block text-[11px] uppercase tracking-wider text-white/40">Avatar URL
        <input className="mt-1 h-8 w-full rounded-full border border-line bg-black/40 px-3 text-sm normal-case" placeholder="https://… image or video" value={AVATARS.includes(form.avatar) ? "" : form.avatar} onChange={(event) => setForm({ ...form, avatar: event.target.value.trim() || "nova" })} />
      </label>
      <p className="mb-1 mt-4 text-[10px] tracking-widest text-white/35">SKIN</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {skins.map((skin) => <button key={skin.name} type="button" className={`quiet ${form.skin === skin.name ? "is-on" : ""}`} onClick={() => setForm({ ...form, skin: skin.name })}>{skin.name}</button>)}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <input className="h-8 w-36 rounded-full border border-line bg-black/40 px-3 text-sm" placeholder="New skin" value={skinName} onChange={(event) => setSkinName(event.target.value)} />
        <input className="h-8 min-w-40 flex-1 rounded-full border border-line bg-black/40 px-3 text-sm" placeholder="How it looks" value={skinNote} onChange={(event) => setSkinNote(event.target.value)} />
        <button type="button" className="quiet is-on" onClick={() => {
          const next = skinName.trim();
          if (!next) return;
          const custom = readSkins(data).filter((skin) => !BUILT_SKINS.some((item) => item.name === skin.name) && skin.name !== next);
          update((prev) => ({ ...prev, notes: [{ id: hubNoteId("Hub · Skins"), title: "Hub · Skins", body: JSON.stringify([...custom, { name: next, note: skinNote.trim() }]) }, ...prev.notes.filter((row) => row.title !== "Hub · Skins")] }));
          setForm({ ...form, skin: next });
          setSkinName("");
          setSkinNote("");
        }}>Create skin</button>
      </div>
      <p className="mt-1 text-[11px] text-white/35">{skins.find((skin) => skin.name === form.skin)?.note || "No look written for this skin."}</p>
      <label className="mt-3 block text-[11px] uppercase tracking-wider text-white/40">Voice
        <select className="mt-1 h-9 w-full rounded-full border border-line bg-black px-3 text-sm normal-case text-white" value={form.voice} onChange={(event) => { const next = { ...form, voice: event.target.value }; setForm(next); saveAgent(update, name, next); }}>
          {[...VOICES, ...readClones(data.notes).filter((row) => !VOICES.some((voice) => voice.id === row.id))].map((voice) => <option key={voice.id} value={voice.id}>{voice.name}</option>)}
        </select>
      </label>
      <VoiceClone data={data} update={update} onReady={(id) => { const next = { ...form, voice: id }; setForm(next); saveAgent(update, name, next); }} />
      {(["soul", "personality", "instructions", "rules"] as const).map((key) => (
        <label key={key} className="mt-3 block text-[11px] uppercase tracking-wider text-white/40">{key}
          <textarea className={field} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
        </label>
      ))}
      <label className="mt-3 block text-[11px] uppercase tracking-wider text-white/40">Assignment
        <input className="mt-1 h-8 w-full rounded-full border border-line bg-black/40 px-3 text-sm" value={form.task} onChange={(event) => setForm({ ...form, task: event.target.value })} />
      </label>
      <button type="button" className="bg-blue mt-4" onClick={() => saveAgent(update, name, form)}>Save</button>
      <MemoryPanel name={name} mem={mem} onChange={setMem} />
      <AgentChat name={name} prompt={personaOf(name, form, blurb, mem)} mem={mem} onMemory={setMem} voice={form.voice} data={data} update={update} onVoice={(id) => { const next = { ...form, voice: id }; setForm(next); saveAgent(update, name, next); }} />
    </div>
  );
}

function AgentChat({ name, prompt, mem, onMemory, voice, data, update, onVoice }: { name: string; prompt: string; mem: AgentMemory; onMemory: (next: AgentMemory) => void; voice: string; data: Memory; update: Update; onVoice: (id: string) => void }) {
  const stored = readChat(data, name);
  const [lines, setLines] = useState(stored);
  const [loaded, setLoaded] = useState(name);
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  if (loaded !== name) { setLoaded(name); setLines(readChat(data, name)); setText(""); setNote(""); }
  const model = preferredModel(data);
  async function send() {
    const question = text.trim();
    if (!question) return;
    const next = [...lines, { role: "user" as const, text: question }];
    setLines(next);
    setText("");
    setNote("Thinking");
    const study = learnFromMessage(mem, question);
    const memo = [study.learned.length ? `Remembered: ${study.learned.join("; ")}` : "", study.forgot.length ? `Forgot: ${study.forgot.join("; ")}` : ""].filter(Boolean).join("\n");
    let liveMem = mem;
    if (memo) {
      liveMem = study.mem;
      onMemory(liveMem);
      await pushAgentMemory(name, liveMem);
    }
    const remembers = isEmptyMemory(liveMem) ? "" : `## ${name}'s memory\n${memoryBlock(liveMem)}`;
    const memoTail = memo ? `\n\n_${memo}_` : "";
    const history = next.slice(-6).map((line) => `${line.role === "user" ? "User" : name}: ${line.text}`).join("\n");
    let tool = await runShared(data, question);
    if (tool?.hand) {
      const hosted = await runHand(data, tool);
      tool = { ...tool, text: [tool.text, hosted].filter(Boolean).join("\n\n") };
    }
    if (tool?.task) update((prev) => ({ ...prev, tasks: [{ id: newId(), title: tool?.task || "", done: false }, ...prev.tasks] }));
    if (tool?.noteTitle) update((prev) => ({ ...prev, notes: [{ id: newId(), title: tool?.noteTitle || "Note", body: tool?.noteBody || "" }, ...prev.notes] }));
    const command = /^\/(plugins|plugin|telegram|skill|search|page|apify|contacts|finance|quote|youtube|task|note|csv|check|open)\b/i.test(question);
    if (command && tool) {
      const done = [...next, { role: "ai" as const, text: tool.text + memoTail }];
      setLines(done);
      setNote(name);
      saveChat(update, name, done);
      return;
    }
    const { askNyx } = await import("@/lib/lifeos/sync");
    const row = CATALOG.find((item) => item.id === model);
    const named = name === "Erebus" || name === "Kranos" || name === "Hermes" || name === "Qwen";
    const preface = [named ? briefFor(name as AgentId) : "", boardFacts(data, question), remembers, history, skillBrief(), matchedSkill(question), prompt, tool ? `Tool result:\n${tool.text}` : ""].filter(Boolean).join("\n\n");
    const call = (nextQuestion: string, sheet: string) => askNyx({ data: { question: nextQuestion, facts: sheet, name, prompt, model, key: keyFor(data, model), mind: mindOf(row?.key || ""), endpoint: data.keys.find((item) => item.name === "Ollama (local)")?.value || "" } });
    if (name === "Hermes" || name === "Qwen") {
      const picture = /\b(image|picture|photo|draw)\b/i.test(question);
      const clip = /\b(video|clip|animate)\b/i.test(question);
      const job = name === "Hermes"
        ? await askHermes(data, hostPrompt("Hermes", question, preface))
        : clip
          ? await askQwen(data, question, "video")
          : picture
            ? await askQwen(data, question, "image")
            : await askQwenChat(data, hostPrompt("Qwen", question, preface));
      const reply = [tool?.text, job.text].filter(Boolean).join("\n\n") || "No reply.";
      const done = [...next, { role: "ai" as const, text: reply + memoTail }];
      setLines(done);
      setNote(job.ok ? name : "Not working");
      saveChat(update, name, done);
      return;
    }
    if (name === "Erebus" || name === "Kranos") {
      try {
        const { askErebus } = await import("@/routes/api/agents/erebus");
        const skill = matchedSkill(question);
        const turned = await askErebus({
          data: {
            question,
            facts: preface,
            mind: mindOf(row?.key || ""),
            model,
            endpoint: data.keys.find((item) => item.name === "Ollama (local)")?.value || "",
            prompt,
            key: keyFor(data, model),
            memory: { leads: data.leads, tasks: data.tasks, ideas: data.ideas, events: data.events, facts: data.facts },
            skills: skill ? [{ id: "matched", name: "Matched skill", text: skill }] : [],
            agent: name,
          },
        });
        applyActs(update, turned.acts || []);
        const hosted = await hostFromActs(data, turned.acts || []);
        const reply = [tool?.text, turned.text, hosted].filter(Boolean).join("\n\n") || "No reply. Save a key for this model, or check xAI / NVIDIA / OpenAI on the machine.";
        const done = [...next, { role: "ai" as const, text: reply + memoTail }];
        setLines(done);
        setNote(turned.ok ? turned.mind : "Offline");
        saveChat(update, name, done);
        return;
      } catch { /* no session: the browser loop below still answers */ }
    }
    const turned = await askWithAbilities(data, question, preface, call, named ? name as AgentId : "Erebus");
    applyActs(update, turned.acts);
    const reply = [tool?.text, turned.text].filter(Boolean).join("\n\n") || "No reply. Save a key for this model, or check xAI / NVIDIA / OpenAI on the machine.";
    const done = [...next, { role: "ai" as const, text: reply + memoTail }];
    setLines(done);
    setNote(turned.ok ? turned.mind : "Offline");
    saveChat(update, name, done);
  }
  async function hear(line: string) {
    const key = data.keys.find((row) => row.name === "ElevenLabs")?.value || "";
    try {
      const { speakVoice } = await import("@/lib/lifeos/sync");
      const result = await speakVoice({ data: { text: line.slice(0, 400), key, voice: voiceId(voice) } });
      if (result.ok && result.audio) {
        const audio = new Audio(`data:audio/mpeg;base64,${result.audio}`);
        void audio.play();
        return;
      }
    } catch { /* browser voice below */ }
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    synth.speak(new SpeechSynthesisUtterance(line.slice(0, 400)));
  }
  return (
    <div className="mt-6 border-t border-white/10 pt-4">
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-[10px] tracking-widest text-white/35">CHAT · {CATALOG.find((item) => item.id === model)?.name || model}</p>
        <label className="text-[11px] uppercase tracking-wider text-white/40">Voice
          <select className="ml-2 h-8 rounded-full border border-line bg-black px-2 text-sm normal-case text-white" value={voiceId(voice)} aria-label="Voice" onChange={(event) => onVoice(event.target.value)}>
            {[...VOICES, ...readClones(data.notes).filter((row) => !VOICES.some((voice) => voice.id === row.id))].map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">
        {lines.map((line, index) => (
          <p key={`${line.role}-${index}`} className={`text-sm ${line.role === "user" ? "text-white/80" : "text-white/55"}`}>
            <span className="mr-2 text-[10px] uppercase tracking-wider text-white/35">{line.role === "user" ? "You" : name}</span>
            {line.text}
            {line.role === "ai" ? <button type="button" className="quiet ml-2" onClick={() => hear(line.text)}>Hear</button> : null}
          </p>
        ))}
        {!lines.length ? <p className="text-sm text-white/40">{name} is ready.</p> : null}
      </div>
      <div className="mt-3 flex gap-2">
        <input className="h-8 flex-1 rounded-full border border-line bg-black/40 px-3 text-sm" value={text} placeholder={`Message ${name}`} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void send(); }} />
        <button type="button" className="quiet is-on" onClick={() => void send()}>Send</button>
      </div>
      {note ? <p className="mt-1 text-[11px] text-white/35">{note}</p> : null}
    </div>
  );
}

function Models({ data, update }: { data: Memory; update: Update }) {
  const active = preferredModel(data);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  function saveKey(name: string) {
    const value = (drafts[name] || "").trim();
    if (!value) return;
    update((prev) => ({ ...prev, keys: [{ id: newId(), name, value }, ...prev.keys.filter((row) => row.name !== name)] }));
    setDrafts((prev) => ({ ...prev, [name]: "" }));
  }
  return (
    <div>
      <h1 className="text-2xl">Models</h1>
      <p className="text-sm text-white/50">The model you select is what Erebus and Kranos call. OpenAI, OpenRouter, NVIDIA, and Hugging Face use the key on that row.</p>
      <div className="mt-4">
        {CATALOG.map((model) => {
          const saved = data.keys.find((row) => row.name === model.key)?.value || "";
          return (
            <div key={model.id} className="border-b border-white/10 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button type="button" className={`quiet ${active === model.id ? "is-on" : ""}`} onClick={() => update((prev) => ({ ...prev, notes: [{ id: hubNoteId("Hub · Model"), title: "Hub · Model", body: model.id }, ...prev.notes.filter((row) => row.title !== "Hub · Model")] }))}>
                  {model.name}
                  <span className="ml-2 text-[11px] text-white/40">{model.note} · {saved ? "Key saved" : "No key"}</span>
                </button>
              </div>
              <div className="mt-2 flex gap-2">
                <input className="h-8 min-w-0 flex-1 rounded-full border border-line bg-black/40 px-3 text-sm" placeholder={`${model.key} key`} value={drafts[model.key] ?? ""} onChange={(event) => setDrafts((prev) => ({ ...prev, [model.key]: event.target.value }))} />
                <button type="button" className="quiet is-on" onClick={() => saveKey(model.key)}>Save key</button>
                {saved ? <button type="button" className="link-remove" onClick={() => update((prev) => ({ ...prev, keys: prev.keys.filter((row) => row.name !== model.key) }))}>Clear</button> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LocalLink({ name, urlName, fallback, data, update, cli }: { name: string; urlName: string; fallback: string; data: Memory; update: Update; cli: "hermes" | "qwen" }) {
  const savedUrl = data.keys.find((row) => row.name === urlName)?.value || fallback;
  const savedKey = data.keys.find((row) => row.name === name)?.value || "";
  const [url, setUrl] = useState(savedUrl);
  const [key, setKey] = useState("");
  const [note, setNote] = useState("");
  const [prompt, setPrompt] = useState("");
  function put(label: string, value: string) {
    update((prev) => ({ ...prev, keys: [{ id: newId(), name: label, value }, ...prev.keys.filter((row) => row.name !== label)] }));
  }
  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <p className="text-[10px] tracking-widest text-white/35">CLI · {cli}</p>
      <input className="mt-2 h-8 w-full rounded-full border border-line bg-black/40 px-3 text-sm" value={url} onChange={(event) => setUrl(event.target.value)} />
      <input className="mt-2 h-8 w-full rounded-full border border-line bg-black/40 px-3 text-sm" placeholder={savedKey ? "Key saved" : "API key if this server requires one"} value={key} onChange={(event) => setKey(event.target.value)} />
      <div className="mt-2 flex gap-3">
        <button type="button" className="quiet is-on" onClick={() => { put(urlName, url.trim()); if (key.trim()) put(name, key.trim()); setNote("Saved."); }}>Save</button>
        <button type="button" className={`quiet ${note === "Checking…" ? "is-busy" : ""}`} aria-busy={note === "Checking…"} disabled={note === "Checking…"} onClick={() => {
          setNote("Checking…");
          void (async () => {
            const gateway = await pingGateway(url.trim());
            const { runHostedAgent } = await import("@/lib/lifeos/cli-agents");
            const hosted = await runHostedAgent({ data: { who: cli, check: true, key: key.trim() || savedKey, url: url.trim() } }).catch(() => ({ ok: false, text: "The server did not answer." }));
            setNote([gateway, hosted.text].filter(Boolean).join(" ") || "No gateway and no server key answered.");
          })();
        }}>Check</button>
      </div>
      <div className="mt-3 flex gap-2">
        <input className="h-8 min-w-0 flex-1 rounded-full border border-line bg-black/40 px-3 text-sm" placeholder={cli === "qwen" ? "Ask Qwen" : "Ask Hermes"} value={prompt} onChange={(event) => setPrompt(event.target.value)} />
        <button type="button" className="quiet is-on" disabled={!prompt.trim()} onClick={() => {
          const line = prompt.trim();
          setPrompt("");
          setNote("Sending…");
          const ask = cli === "qwen" ? askQwenChat(data, hostPrompt("Qwen", line)) : askHermes(data, hostPrompt("Hermes", line));
          void ask.then((job) => setNote(job.text || "No reply."));
        }}>Send</button>
      </div>
      {note ? <p className="mt-2 text-sm text-white/70">{note}</p> : null}
    </div>
  );
}

function TelegramBox({ token }: { token: string }) {
  const [chat, setChat] = useState("");
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <p className="text-sm text-white/50">Send one message. The token stays on the server call. It does not broadcast.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className={`quiet ${note === "Checking the bot…" ? "is-busy" : ""}`} aria-busy={note === "Checking the bot…"} disabled={note === "Checking the bot…"} onClick={() => {
          setNote("Checking the bot…");
          void import("@/lib/lifeos/sync").then(({ telegramBot }) => telegramBot({ data: { token } })).then((result) => setNote(result.ok ? `Connected ${result.bot}` : result.error));
        }}>Check bot</button>
        <input className="h-8 w-36 rounded-full border border-line bg-black/40 px-3 text-sm" placeholder="Chat id" value={chat} onChange={(event) => setChat(event.target.value)} />
        <input className="h-8 min-w-40 flex-1 rounded-full border border-line bg-black/40 px-3 text-sm" placeholder="Message" value={text} onChange={(event) => setText(event.target.value)} />
        <button type="button" className={`quiet is-on ${note === "Sending…" ? "is-busy" : ""}`} aria-busy={note === "Sending…"} disabled={note === "Sending…" || !text.trim()} onClick={() => {
          setNote("Sending…");
          void import("@/lib/lifeos/sync").then(({ telegramBot }) => telegramBot({ data: { token, chat, text } })).then((result) => setNote(result.ok ? "Sent." : result.error));
        }}>Send</button>
      </div>
      {note ? <p className="mt-2 text-sm text-white/70">{note}</p> : null}
    </div>
  );
}

export function HubDesk({ data, update }: { data: Memory; update: Update }) {
  const [section, setSection] = useState<Section>("erebus");
  const [draft, setDraft] = useState("");
  const [openAgent, setOpenAgent] = useState("");
  const [brief, setBrief] = useState("");
  const [briefing, setBriefing] = useState(false);
  const [stamp, setStamp] = useState(0);
  const savedBrief = data.notes.find((row) => row.title === "Kranos · Report")?.body || "";
  const notesRef = useRef(data.notes);
  notesRef.current = data.notes;
  useEffect(() => {
    update((prev) => {
      const have = new Set(prev.jobs.map((row) => row.agent));
      const add = STAFF.filter((row) => !have.has(row.name)).map((row) => ({ id: newId(), agent: row.name, task: row.task, active: true }));
      if (!add.length) return prev;
      return { ...prev, jobs: [...add, ...prev.jobs] };
    });
  }, [update]);
  useEffect(() => {
    const notes = notesRef.current;
    void (async () => {
      const remote = await pullAgents();
      const merged = { ...readAgentCache() };
      if (remote) {
        for (const [name, row] of Object.entries(remote)) {
          const local = merged[name];
          if (!local || row.instructions.length >= local.instructions.length) merged[name] = row;
        }
      }
      for (const note of notes) {
        if (!note.title.startsWith("Agent · ")) continue;
        const name = note.title.slice("Agent · ".length);
        if (merged[name]?.soul || merged[name]?.instructions || merged[name]?.rules) continue;
        const pick = (label: string) => note.body.split("\n").find((line) => line.startsWith(label))?.slice(label.length).trim() || "";
        const form = {
          soul: pick("Soul: "),
          personality: pick("Personality: "),
          instructions: pick("Instructions: "),
          rules: pick("Rules: "),
          voice: pick("Voice: "),
          skin: pick("Skin: ") || "Nova",
          avatar: pick("Avatar: ") || "nova",
          task: pick("Task: "),
          active: false,
        };
        if (!form.soul && !form.instructions && !form.rules) continue;
        merged[name] = form;
        void pushAgent(name, form);
      }
      writeAgentCache(merged);
      setStamp((value) => value + 1);
    })();
  }, []);
  const known = new Set(["Erebus", "Kranos", "Telegram", "Hermes", "Qwen", ...ROSTER.map((agent) => agent.name), ...STAFF.map((agent) => agent.name)]);
  const custom = [...new Set([...Object.keys(readAgentCache()), ...data.notes.filter((row) => row.title.startsWith("Agent ·")).map((row) => row.title.replace("Agent · ", ""))])].filter((name) => !known.has(name));
  const workers = data.jobs.filter((row) => !["Erebus", "Kranos"].includes(row.agent));
  const telegram = data.keys.some((row) => row.name === "Telegram" && row.value);

  return (
    <div className="grid min-h-[36rem] gap-3 lg:grid-cols-[13rem_1fr]">
      <aside className="module-card h-fit p-3">
        <p className="text-sm">AI Hub</p>
        {GROUPS.map((group) => (
          <div key={group.label} className="mt-4">
            <p className="text-[10px] tracking-widest text-white/35">{group.label}</p>
            {group.items.map((item) => (
              <button key={item.id} type="button" className={`menu ${section === item.id ? "is-on" : ""}`} onClick={() => setSection(item.id)}>{item.label}</button>
            ))}
          </div>
        ))}
      </aside>
      <section className="module-card p-4">
        <EngineBar panel="AI Hub" data={data} update={update} />
        {section === "erebus" ? <Profile name="Erebus" stamp={stamp} blurb="Runs the dashboard. Reasons from the question, then uses tools when you approve them." data={data} update={update} /> : null}
        {section === "kranos" ? <Profile name="Kranos" stamp={stamp} blurb="Manages workers, agents, and Telegram. Writes the progress summary from their reports." data={data} update={update} /> : null}
        {section === "messaging" ? (
          <div>
            <Profile name="Telegram" stamp={stamp} blurb={telegram ? "Bot token is on this machine. It only sends and reads messages." : "No Telegram token on this machine. Settings still save."} data={data} update={update} />
            <TelegramBox token={data.keys.find((row) => row.name === "Telegram")?.value || ""} />
          </div>
        ) : null}
        {section === "hermes" ? <div><Profile name="Hermes" stamp={stamp} blurb="Files, browser, and the terminal, through the hermes command. Erebus sends that work here." data={data} update={update} /><LocalLink name="Hermes" urlName="Hermes URL" fallback="http://127.0.0.1:8642" cli="hermes" data={data} update={update} /></div> : null}
        {section === "qwen" ? <div><Profile name="Qwen" stamp={stamp} blurb="Images and video, through the qwen command. Erebus sends that work here." data={data} update={update} /><LocalLink name="Qwen" urlName="Qwen URL" fallback="http://127.0.0.1:8000" cli="qwen" data={data} update={update} /></div> : null}
        {section === "agents" ? (
          openAgent ? <div><button type="button" className="quiet" onClick={() => setOpenAgent("")}>Back</button><Profile name={openAgent} stamp={stamp} blurb={ROSTER.find((agent) => agent.name === openAgent)?.tagline || "Change the skin, voice, and rules without deleting this agent."} data={data} update={update} /></div> : (
          <div>
            <h1 className="text-2xl">Agents</h1>
            <p className="text-sm text-white/50">Specialists report to Kranos. Erebus stays on the code. Open one to change voice, rules, and chat.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {STAFF.map((agent) => {
                const row = readAgent(data, agent.name);
                return (
                  <button key={agent.name} type="button" className="menu text-left" onClick={() => setOpenAgent(agent.name)}>
                    <span className="block text-sm">{agent.name}</span>
                    <span className="block text-[11px] text-white/40">{agent.role} · reports to Kranos · {row.active ? "On" : "Idle"}</span>
                  </button>
                );
              })}
            </div>
            <p className="mb-2 mt-6 text-[10px] tracking-widest text-white/35">OTHER</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {ROSTER.map((agent) => {
                const row = readAgent(data, agent.name);
                return (
                  <button key={agent.name} type="button" className="menu text-left" onClick={() => setOpenAgent(agent.name)}>
                    <span className="block text-sm">{agent.name}</span>
                    <span className="block text-[11px] text-white/40">{agent.role} · {row.skin || "Nova"} · {row.active ? "On" : "Idle"}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex gap-3">
              <input className="h-8 flex-1 rounded-full border border-line bg-black/40 px-3 text-sm" value={draft} placeholder="New agent name" onChange={(event) => setDraft(event.target.value)} />
              <button type="button" className="quiet is-on" onClick={() => { if (!draft.trim()) return; saveAgent(update, draft.trim(), { ...readAgent(data, draft.trim()), active: false }); setOpenAgent(draft.trim()); setDraft(""); }}>Add agent</button>
            </div>
            <div className="mt-4">
              {custom.map((name) => {
                const row = readAgent(data, name);
                return (
                  <div key={name} className="flex items-center justify-between border-b border-white/10 py-2 text-sm">
                    <button type="button" className="quiet" onClick={() => setOpenAgent(name)}>{name}<span className="ml-2 text-[11px] text-white/40">{row.skin} · {row.active ? "On" : "Off"}</span></button>
                    <button type="button" className="link-remove" onClick={() => { void deleteAgent(name); update((prev) => ({ ...prev, notes: prev.notes.filter((item) => item.title !== `Agent · ${name}`), jobs: prev.jobs.filter((item) => item.agent !== name) })); }}>Remove</button>
                  </div>
                );
              })}
            </div>
          </div>
          )
        ) : null}
        {section === "models" ? <Models data={data} update={update} /> : null}
        {section === "skills" ? (
          <div>
            <h1 className="text-2xl">Skills</h1>
            <p className="text-sm text-white/50">Erebus, Kranos, Hermes, and Qwen share these skills. Live tools run from the dock and from any of their chats. /plugin runs a plugin through its owner.</p>
            {["LifeApp", "Loaded", "Browser", "Code", "Data", "Finance", "Comms", "Workflow", "Media", "Sales", "Social", "Marketing", "Reasoning", "Content", "App skills"].map((group) => {
              const rows = AGENT_SKILLS.filter((row) => row.group === group);
              if (!rows.length) return null;
              return (
                <div key={group} className="mt-4">
                  <p className="text-[10px] tracking-widest text-white/35">{group}</p>
                  {rows.map((row) => (
                    <p key={row.id} className="mt-2 text-sm"><span className={row.live ? "text-green" : "text-white/35"}>{row.live ? "Live" : "Off"}</span> · {row.name}<span className="block text-[11px] text-white/40">{row.note}</span></p>
                  ))}
                </div>
              );
            })}
            <div className="mt-4">
              <p className="text-[10px] tracking-widest text-white/35">Plugins</p>
              {PLUGINS.map((card) => (
                <p key={card.id} className="mt-2 text-sm"><span className="text-white/70">{card.owner}</span> · {card.id}<span className="block text-[11px] text-white/40">{card.runner} · {card.note}</span></p>
              ))}
            </div>
          </div>
        ) : null}
        {section === "hierarchy" ? (
          <div>
            <h1 className="text-2xl">Hierarchy</h1>
            <p className="mt-1 text-sm text-white/50">Erebus runs the dashboard. Kranos manages workers, agents, and Telegram. Hermes and Qwen are separate tools you open on their own tabs.</p>
            <button type="button" className="quiet is-on mt-3" onClick={() => {
              setBriefing(true);
              const facts = laneDigest(data);
              const model = preferredModel(data);
              const picked = CATALOG.find((item) => item.id === model);
              void import("@/lib/lifeos/sync").then(({ askNyx }) => askNyx({ data: { name: "Kranos", prompt: "You are Kranos. Specialists reported the facts below. Write three sections: Progress, Stuck, Better. Use only these facts. Do not invent numbers, names, or results.", question: "Organize the specialist reports.", facts, model, key: keyFor(data, model), mind: mindOf(picked?.key || ""), endpoint: data.keys.find((row) => row.name === "Ollama (local)")?.value || "" } })).then((result) => {
                const text = result.text || facts;
                setBrief(text);
                update((prev) => ({
                  ...prev,
                  notes: [{ id: hubNoteId("Kranos · Report"), title: "Kranos · Report", body: text }, ...prev.notes.filter((row) => row.title !== "Kranos · Report")],
                  thread: [...prev.thread, { id: newId(), who: "Kranos", text: text.slice(0, 4000), mine: false, platform: "kranos" }],
                }));
              }).catch(() => setBrief(facts)).finally(() => setBriefing(false));
            }}>{briefing ? "Collecting…" : "Collect reports"}</button>
            <pre className="mt-4 whitespace-pre-wrap text-sm text-white/75">{brief || savedBrief || laneDigest(data)}</pre>
            <p className="mt-4 text-sm">Erebus <span className="text-white/40">runs the dashboard</span></p>
            <p className="mt-2 pl-4 text-sm">Kranos <span className="text-white/40">workers, agents, and Telegram</span></p>
            <p className="mt-2 text-sm">Hermes <span className="text-white/40">separate tool · files and terminal</span></p>
            <p className="mt-1 text-sm">Qwen <span className="text-white/40">separate tool · image and video</span></p>
            {STAFF.map((row) => <p key={row.name} className="mt-1 pl-8 text-sm text-white/70">{row.name}<span className="ml-2 text-white/40">{row.role}</span></p>)}
          </div>
        ) : null}
        {section === "workers" ? (
          <div>
            <h1 className="text-2xl">Workers</h1>
            <p className="text-sm text-white/50">Cloudflare workers and anyone who is not Erebus or Kranos. Assign a preset, then turn it on.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {STAFF.map((row) => (
                <button key={row.name} type="button" className="quiet" onClick={() => saveAgent(update, row.name, { ...readAgent(data, row.name), task: row.task, active: true })}>{workers.some((job) => job.agent === row.name) ? row.name : `Add ${row.name}`}</button>
              ))}
            </div>
            {workers.map((row) => (
              <div key={row.id} className="mt-3 flex items-center justify-between gap-3 text-sm">
                <span>{row.agent}<span className="ml-2 text-white/40">{row.task}</span></span>
                <button type="button" className="quiet" onClick={() => update((prev) => ({ ...prev, jobs: prev.jobs.map((item) => item.id === row.id ? { ...item, active: !item.active } : item) }))}>{row.active ? "On" : "Off"}</button>
              </div>
            ))}
            {!workers.length ? <p className="mt-3 text-sm text-white/40">No workers assigned.</p> : null}
          </div>
        ) : null}
        {section === "assignments" ? (
          <div>
            <h1 className="text-2xl">Assignments</h1>
            <p className="text-sm text-white/50">Who has work, and whether it is on.</p>
            {data.jobs.map((row) => (
              <div key={row.id} className="mt-3 grid items-center gap-2 sm:grid-cols-[8rem_1fr_auto]">
                <span className="text-sm">{row.agent}</span>
                <input className="h-8 rounded-full border border-line bg-black/40 px-3 text-sm" value={row.task} onChange={(event) => update((prev) => ({ ...prev, jobs: prev.jobs.map((item) => item.id === row.id ? { ...item, task: event.target.value } : item) }))} />
                <button type="button" className={`quiet ${row.active ? "is-on" : ""}`} onClick={() => update((prev) => ({ ...prev, jobs: prev.jobs.map((item) => item.id === row.id ? { ...item, active: !item.active } : item) }))}>{row.active ? "Active" : "Idle"}</button>
              </div>
            ))}
            {!data.jobs.length ? <p className="mt-3 text-sm text-white/40">No assignments yet.</p> : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
