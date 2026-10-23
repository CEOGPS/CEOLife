/** Shared skills, tools, and plugins for Erebus, Kranos, Hermes, and Qwen. */

export type AgentId = "Erebus" | "Kranos" | "Hermes" | "Qwen";

export type PluginCard = {
  id: string;
  owner: AgentId;
  kind: string;
  /** Who actually runs it. */
  runner: "dashboard" | "hermes" | "qwen";
  note: string;
  aliases: string[];
};

export type KitHand = "hermes" | "qwen-image" | "qwen-video" | "qwen-chat";

export type KitPlan = {
  text: string;
  hand?: KitHand;
  handPrompt?: string;
  telegram?: { chat: string; text: string };
  search?: string;
  page?: string;
  noteTitle?: string;
  noteBody?: string;
};

const ROLES: Record<AgentId, string> = {
  Erebus: "You are Erebus. You run this dashboard. Reason from the question and the tool results. Board facts are context. If a fact is missing, say it is unknown and answer the rest.",
  Kranos: "You are Kranos. You manage workers, agents, and Telegram. You write Progress, Stuck, and Better from the reports you were given. You do not take over the dashboard, and you do not do Hermes or Qwen's jobs.",
  Hermes: "You are Hermes. You are the files, browser, and terminal tool. You run the Hermes plugin pack on this computer. Do the work, then answer with what the command returned.",
  Qwen: "You are Qwen. You are the local image and video tool. Return the file URL when a file was made. If the gateway made nothing, say the exact error.",
};

function card(id: string, owner: AgentId, kind: string, runner: PluginCard["runner"], note: string, aliases: string[] = []): PluginCard {
  return { id, owner, kind, runner, note, aliases: [id, ...aliases] };
}

const image = (id: string, alias: string, note: string) => card(id, "Qwen", "image", "qwen", note, [alias, `image ${alias}`]);
const video = (id: string, alias: string, note: string) => card(id, "Qwen", "video", "qwen", note, [alias, `video ${alias}`]);
const web = (id: string, note: string) => card(id, "Hermes", "web", "dashboard", note, [id.replace(/^web-/, "")]);
const memory = (id: string) => card(id, "Hermes", "memory", "hermes", "Memory provider. Hermes loads it. The dashboard does not import it.");
const model = (id: string, alias: string, note = "Model provider on the Hermes host.") => card(id, id === "qwen-oauth-provider" ? "Qwen" : "Hermes", "model", id === "qwen-oauth-provider" ? "qwen" : "hermes", note, [alias]);
const platform = (id: string, owner: AgentId, runner: PluginCard["runner"], note: string, aliases: string[] = []) => card(id, owner, "platform", runner, note, aliases);

export const PLUGINS: PluginCard[] = [
  platform("telegram-platform", "Kranos", "dashboard", "Sends only with approved=yes and a saved bot token.", ["telegram"]),
  platform("email-platform", "Erebus", "dashboard", "Records a draft. Nothing is sent from the plugin.", ["email"]),
  platform("sms-platform", "Hermes", "hermes", "SMS adapter. Hermes runs it. Sending needs approved=yes.", ["sms"]),
  platform("whatsapp-platform", "Hermes", "hermes", "WhatsApp adapter. Hermes runs it. Sending needs approved=yes.", ["whatsapp"]),
  platform("slack-platform", "Hermes", "hermes", "Slack adapter. Hermes runs it. Sending needs approved=yes.", ["slack"]),
  platform("discord-platform", "Hermes", "hermes", "Discord adapter. Hermes runs it. Sending needs approved=yes.", ["discord"]),
  platform("feishu-platform", "Hermes", "hermes", "Feishu adapter. Hermes runs it.", ["feishu"]),
  platform("wecom-platform", "Hermes", "hermes", "WeCom adapter. Hermes runs it.", ["wecom"]),
  platform("dingtalk-platform", "Hermes", "hermes", "DingTalk adapter. Hermes runs it.", ["dingtalk"]),
  platform("line-platform", "Hermes", "hermes", "LINE adapter. Hermes runs it.", ["line"]),
  platform("matrix-platform", "Hermes", "hermes", "Matrix adapter. Hermes runs it.", ["matrix"]),
  platform("mattermost-platform", "Hermes", "hermes", "Mattermost adapter. Hermes runs it.", ["mattermost"]),
  platform("irc-platform", "Hermes", "hermes", "IRC adapter. Hermes runs it.", ["irc"]),
  platform("google_chat-platform", "Hermes", "hermes", "Google Chat adapter. Hermes runs it.", ["google chat", "google-chat"]),
  platform("teams-platform", "Hermes", "hermes", "Teams adapter. Hermes runs it.", ["teams"]),
  platform("photon-platform", "Hermes", "hermes", "Photon adapter. Hermes runs it.", ["photon"]),
  platform("ntfy-platform", "Hermes", "hermes", "ntfy adapter. Hermes runs it.", ["ntfy"]),
  platform("raft-platform", "Hermes", "hermes", "Raft adapter. Hermes runs it.", ["raft"]),
  platform("simplex-platform", "Hermes", "hermes", "SimpleX adapter. Hermes runs it.", ["simplex"]),
  platform("buzz-platform", "Hermes", "hermes", "Buzz adapter. Hermes runs it.", ["buzz"]),
  platform("a2a-platform", "Hermes", "hermes", "A2A adapter. Hermes runs it.", ["a2a"]),
  platform("homeassistant-platform", "Hermes", "hermes", "Home Assistant adapter. Hermes runs it.", ["homeassistant", "home assistant"]),
  image("image-xai", "xai", "xAI image plugin. Qwen is the local runner. A paid image call is not made from here."),
  image("image-openai", "openai", "OpenAI image plugin. Qwen is the local runner."),
  image("image-openai-codex", "openai-codex", "OpenAI Codex image plugin. Qwen is the local runner."),
  image("image-fal", "fal", "fal image plugin. Qwen is the local runner."),
  image("image-krea", "krea", "Krea image plugin. Qwen is the local runner."),
  image("image-deepinfra", "deepinfra", "DeepInfra image plugin. Qwen is the local runner."),
  image("image-openrouter", "openrouter", "OpenRouter image plugin. Qwen is the local runner."),
  image("image-meta-ai", "meta-ai-image-gen", "Meta image plugin. Qwen is the local runner."),
  video("video-xai", "xai", "xAI video plugin. Qwen is the local runner. A paid video call is not made from here."),
  video("video-fal", "fal", "fal video plugin. Qwen is the local runner."),
  video("video-openrouter", "openrouter", "OpenRouter video plugin. Qwen is the local runner."),
  video("video-deepinfra", "deepinfra", "DeepInfra video plugin. Qwen is the local runner."),
  web("web-brave-free", "Brave search plugin. The dashboard search runs now."),
  web("web-ddgs", "DuckDuckGo search plugin. The dashboard search runs now."),
  web("web-searxng", "SearXNG plugin. The dashboard search runs now."),
  web("web-tavily", "Tavily plugin. The dashboard search runs now."),
  web("web-exa", "Exa plugin. The dashboard search runs now."),
  web("web-perplexity", "Perplexity plugin. The dashboard search runs now."),
  web("web-firecrawl", "Firecrawl search plugin. The dashboard search runs now."),
  web("web-xai", "xAI search plugin. The dashboard search runs now."),
  web("web-parallel", "Parallel search plugin. The dashboard search runs now."),
  web("web-keenable", "Keenable search plugin. The dashboard search runs now."),
  card("browser-browser-use", "Hermes", "browser", "hermes", "Browser-use plugin. A public https URL can also be read from the dashboard.", ["browser-use", "browser"]),
  card("browser-browserbase", "Hermes", "browser", "hermes", "Browserbase plugin. A public https URL can also be read from the dashboard.", ["browserbase"]),
  card("browser-firecrawl", "Hermes", "browser", "hermes", "Firecrawl browser plugin. A public https URL can also be read from the dashboard.", ["firecrawl"]),
  memory("honcho"),
  memory("mem0"),
  memory("supermemory"),
  memory("byterover"),
  memory("hindsight"),
  memory("holographic"),
  memory("openviking"),
  memory("retaindb"),
  model("qwen-oauth-provider", "qwen-oauth", "Qwen sign-in for the local model. Qwen runs it."),
  model("xai-provider", "xai"),
  model("openai-codex-provider", "openai-codex"),
  model("openrouter-provider", "openrouter"),
  model("nvidia-provider", "nvidia"),
  model("huggingface-provider", "huggingface"),
  model("ollama-cloud-provider", "ollama-cloud"),
  model("gemini-provider", "gemini"),
  model("anthropic-provider", "anthropic"),
  model("deepseek-provider", "deepseek"),
  model("deepinfra-provider", "deepinfra"),
  model("alibaba-provider", "alibaba"),
  model("alibaba-coding-plan-provider", "alibaba-coding-plan"),
  model("azure-foundry-provider", "azure-foundry"),
  model("bedrock-provider", "bedrock"),
  model("vertex-provider", "vertex"),
  model("copilot-provider", "copilot"),
  model("copilot-acp-provider", "copilot-acp"),
  model("kimi-coding-provider", "kimi-coding"),
  model("kilocode-provider", "kilocode"),
  model("minimax-provider", "minimax"),
  model("meta-ai-provider", "meta-ai"),
  model("nous-provider", "nous"),
  model("novita-provider", "novita"),
  model("arcee-provider", "arcee"),
  model("fireworks-provider", "fireworks"),
  model("gmi-provider", "gmi"),
  model("stepfun-provider", "stepfun"),
  model("upstage-provider", "upstage"),
  model("xiaomi-provider", "xiaomi"),
  model("zai-provider", "zai"),
  model("custom-provider", "custom"),
  model("router-provider", "router"),
  model("ai-gateway-provider", "ai-gateway"),
  model("actual-provider", "actual"),
  model("commandcode-provider", "commandcode"),
  model("nebius-token-factory-provider", "nebius-token-factory"),
  model("opencode-zen-provider", "opencode-zen"),
  model("opencode-free-provider", "opencode-free"),
  card("spotify", "Hermes", "general", "hermes", "Spotify plugin. Hermes runs it. Playback is not faked from the dashboard."),
  card("google_meet", "Hermes", "general", "hermes", "Google Meet plugin. Hermes runs it.", ["google meet", "meet"]),
  card("teams_pipeline", "Hermes", "general", "hermes", "Teams meeting pipeline. Hermes runs it."),
  card("disk-cleanup", "Hermes", "general", "hermes", "Disk cleanup. Hermes runs it only with approved=yes. Nothing is deleted from the dashboard."),
  card("security-guidance", "Hermes", "general", "hermes", "Security guidance plugin. Hermes runs it.", ["security"]),
  card("chronos", "Kranos", "cron", "hermes", "Cron provider. Kranos owns the schedule. Hermes runs the plugin."),
  card("kanban", "Kranos", "general", "hermes", "Kanban board for workers. Kranos owns it. Hermes runs the dispatcher."),
  card("hermes-achievements", "Hermes", "general", "hermes", "Achievement tracker. Hermes runs it.", ["achievements"]),
  card("langfuse", "Hermes", "general", "hermes", "Langfuse observability. Hermes runs it."),
  card("self-hosted", "Hermes", "auth", "hermes", "Dashboard auth provider.", ["dashboard auth"]),
  card("nous", "Hermes", "auth", "hermes", "Nous dashboard auth provider."),
  card("drain", "Hermes", "auth", "hermes", "Drain dashboard auth provider."),
  card("basic", "Hermes", "auth", "hermes", "Basic dashboard auth provider."),
  card("google-antigravity-sdk", "Hermes", "general", "hermes", "Antigravity SDK plugin. Hermes runs it."),
  card("chrome-devtools-plugin", "Hermes", "browser", "hermes", "Chrome DevTools plugin. Hermes runs it.", ["chrome", "devtools"]),
  card("firebase", "Hermes", "general", "hermes", "Firebase plugin. Hermes runs it."),
  card("android-cli-plugin", "Hermes", "general", "hermes", "Android CLI plugin. Hermes runs it.", ["android"]),
  card("science", "Hermes", "general", "hermes", "Science skill pack. Hermes runs it."),
  card("modern-web-guidance-plugin", "Hermes", "general", "hermes", "Web guidance plugin. Hermes runs it.", ["web guidance"]),
];

const SENDS = new Set(["platform", "cron"]);

export function pluginNeedsApproval(card: PluginCard) {
  return card.id === "disk-cleanup" || SENDS.has(card.kind);
}

export function fields(spec: string) {
  const out: Record<string, string> = {};
  for (const match of spec.matchAll(/(\w+)=([^=]+?)(?=\s+\w+=|$)/g)) out[match[1].toLowerCase()] = match[2].trim();
  return out;
}

export function findPlugins(query: string): PluginCard[] {
  const q = query.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  return PLUGINS.filter((card) => {
    const hay = `${card.id} ${card.aliases.join(" ")} ${card.kind} ${card.owner}`.toLowerCase();
    return tokens.every((token) => hay.includes(token));
  });
}

export function pluginIndex() {
  const lines = ["Plugins shared by Erebus, Kranos, Hermes, and Qwen. /plugin <id> runs one."];
  for (const card of PLUGINS) lines.push(`${card.id} · ${card.owner} · ${card.runner} · ${card.note}`);
  return lines.join("\n");
}

export function toolsFor(agent: AgentId) {
  if (agent === "Qwen") return "Image and video plugins. Return a file URL. Do not claim a clip exists unless the gateway returned one.";
  if (agent === "Hermes") return "Files, terminal, browser plugins, memory plugins, and model providers. /search and /page still run on the dashboard. Do not claim a command ran unless its output is in the tool result.";
  if (agent === "Kranos") return "READ_LIFEOS, CREATE_TASK, REMEMBER_FACT, NOTIFY, TELEGRAM (approved=yes), and /plugin. Telegram is yours. Site edits and file edits belong to Erebus and Hermes.";
  return "SEARCH_WEB, BROWSE_URL, READ_LIFEOS, UPDATE_LEAD, CREATE_TASK, REMEMBER_FACT, DRAFT_EMAIL, NOTIFY, BROWSER, SITE, SOCIAL, EMAIL, CODE, BLOG, IMAGE, VIDEO, MUSIC, /skill, /plugin. Browser, site, social, email, code, and outside sends wait for approved=yes.";
}

export function briefFor(agent: AgentId) {
  const owned = PLUGINS.filter((card) => card.owner === agent);
  const sample = owned.slice(0, 8).map((card) => card.id).join(", ");
  return [
    ROLES[agent],
    "Hierarchy: Erebus runs the dashboard. Kranos manages workers, agents, and Telegram. Hermes and Qwen are separate tools.",
    "Skills are procedures for all four of you. Follow a loaded skill. A skill does not by itself run a shell, deploy, or send.",
    `Tools: ${toolsFor(agent)}`,
    `You own ${owned.length} plugins, including ${sample}. /plugins lists every plugin and its owner. /plugin <id> runs the dashboard path or hands the job to the owner.`,
    "Do not invent connection statuses, mail counts, balances, or people. Do not claim a plugin ran unless the tool result says so.",
  ].join("\n");
}

export function hostPrompt(agent: AgentId, question: string, extra = "") {
  return [briefFor(agent), extra, `Request:\n${question}`].filter(Boolean).join("\n\n").slice(0, 12000);
}

export function kitLine(text: string) {
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (/^(PLUGIN|TELEGRAM):/i.test(line)) return line;
  }
  return "";
}

function requestOf(text: string): { id: string; rest: string } | "index" | null {
  const line = text.trim();
  if (/^\/plugins\b/i.test(line)) return "index";
  const slash = line.match(/^(?:\/plugin|\/telegram)\s+([\s\S]+)/i);
  if (slash) {
    if (/^\/telegram\b/i.test(line)) return { id: "telegram-platform", rest: slash[1].trim() };
    const body = slash[1].trim();
    const id = body.split(/\s+/)[0] || "";
    return { id, rest: body.slice(id.length).trim() };
  }
  const model = line.match(/^(PLUGIN|TELEGRAM):\s*([\s\S]+)/i);
  if (!model) return null;
  if (model[1].toUpperCase() === "TELEGRAM") return { id: "telegram-platform", rest: model[2].trim() };
  const body = model[2].trim();
  const id = body.split(/\s+/)[0] || "";
  return { id, rest: body.slice(id.length).trim() };
}

function allowed(fromUser: boolean, approved: boolean) {
  return fromUser || approved;
}

/** Resolve one user or model line into a plan. Does not call the network. */
export function planKitLine(text: string, fromUser = false): KitPlan | null {
  const request = requestOf(text);
  if (!request) return null;
  if (request === "index") return { text: pluginIndex() };
  const matches = findPlugins(request.id);
  if (!matches.length) return { text: `No plugin named ${request.id.slice(0, 80)}. /plugins lists them.` };
  if (matches.length > 1) {
    return { text: `Several plugins match ${request.id}: ${matches.map((card) => card.id).join(", ")}. Name one id.` };
  }
  const card = matches[0];
  const spec = fields(request.rest);
  const approved = spec.approved === "yes" || /\bapproved=yes\b/i.test(request.rest);
  if (pluginNeedsApproval(card) && card.id !== "email-platform" && !approved) {
    return { text: `Approval required for ${card.id}. Send the same line with approved=yes. Nothing ran.` };
  }
  if (card.id === "telegram-platform") {
    const chat = spec.chat || "";
    const message = spec.text || spec.message || "";
    if (!chat || !message) return { text: "Telegram needs chat= and text=, plus approved=yes. Nothing was sent." };
    return { text: `Telegram send requested for chat ${chat}.`, telegram: { chat, text: message.slice(0, 500) } };
  }
  if (card.id === "email-platform") {
    const body = spec.body || request.rest || "Empty draft";
    return {
      text: "Email plugin recorded a draft. Nothing was sent.",
      noteTitle: spec.subject || "Email draft",
      noteBody: `To: ${spec.to || ""}\n${body}`.slice(0, 4000),
    };
  }
  if (card.kind === "web") {
    const query = (spec.query || request.rest || card.id).slice(0, 180);
    return { text: `Dashboard search for the ${card.id} plugin.`, search: query };
  }
  const url = request.rest.match(/https:\/\/\S+/)?.[0] || spec.url || "";
  if (card.kind === "browser" && url) {
    const plan: KitPlan = { text: `Reading ${url} for ${card.id}.`, page: url };
    if (allowed(fromUser, approved)) {
      plan.hand = "hermes";
      plan.handPrompt = hostPrompt("Hermes", request.rest || url, `Plugin ${card.id}. ${card.note}`);
    }
    return plan;
  }
  if (!allowed(fromUser, approved) && (card.runner === "hermes" || card.runner === "qwen")) {
    return { text: `${card.id} belongs to ${card.owner}. Add approved=yes to run it. Nothing ran.` };
  }
  if (card.kind === "image") {
    const prompt = spec.prompt || request.rest || card.note;
    return { text: `Asking Qwen to run ${card.id}.`, hand: "qwen-image", handPrompt: prompt.slice(0, 1000) };
  }
  if (card.kind === "video") {
    const prompt = spec.prompt || request.rest || card.note;
    return { text: `Asking Qwen to run ${card.id}.`, hand: "qwen-video", handPrompt: prompt.slice(0, 1000) };
  }
  if (card.runner === "qwen") {
    return { text: `Asking Qwen to run ${card.id}.`, hand: "qwen-chat", handPrompt: hostPrompt("Qwen", request.rest || card.note, `Plugin ${card.id}. ${card.note}`) };
  }
  return {
    text: `Asking Hermes to run ${card.id}. ${card.note}`,
    hand: "hermes",
    handPrompt: hostPrompt("Hermes", request.rest || `Use the ${card.id} plugin and report what it returned.`, `Plugin ${card.id}. ${card.note}`),
  };
}
