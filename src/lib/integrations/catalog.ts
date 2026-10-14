/**
 * The integrations catalog — one entry per service the panel can show.
 *
 * This file is client-safe: it holds names, categories and capability *shapes*
 * only. Endpoints, scopes and credential names live in the server registry
 * (`oauth-providers.server.ts`), so nothing here can leak a secret or an
 * unverified endpoint.
 *
 * `methods` is the contract the panel renders honestly:
 *   oauth  — the app runs a real authorization-code flow for it
 *   apikey — the service is connected with an API key you paste
 *   local  — the service runs on this computer (checked by address)
 *   none   — no public API for this service; it is listed, not connected
 */

export type IntegrationCategory =
  | "google"
  | "ai"
  | "developer"
  | "productivity"
  | "comms"
  | "social"
  | "finance"
  | "marketing"
  | "local";

export type AuthMethod = "oauth" | "apikey" | "local" | "none";

export type Integration = {
  id: string;
  name: string;
  category: IntegrationCategory;
  methods: AuthMethod[];
  summary: string;
  dependents: string[];
  /** Name the server probe knows this service by (`runProbe`). */
  probe?: string;
  /** Server account check, when the service verifies through a connected Google login. */
  account?: "search-console" | "google-analytics" | "godaddy" | "brilliant";
  /** Honest capability note shown on the card. */
  note?: string;
};

export const CATEGORY_LABEL: Record<IntegrationCategory, string> = {
  google: "Google",
  ai: "AI & models",
  developer: "Developer & cloud",
  productivity: "Productivity",
  comms: "Communication",
  social: "Social & media",
  finance: "Finance",
  marketing: "Marketing & search",
  local: "Local & self-hosted",
};

/** Services the server can probe with a live request (see `runProbe`). */
const PROBE = new Set([
  "Airtable",
  "Anthropic",
  "Brevo",
  "Browserbase",
  "ClickUp",
  "Cloudflare",
  "Cloudflare Account",
  "Cloudflare Token",
  "DeepSeek",
  "Dropbox",
  "ElevenLabs",
  "Firecrawl",
  "GitHub",
  "Google AI (Gemini)",
  "Google Maps",
  "Groq",
  "Hugging Face",
  "Jotform",
  "Linear",
  "Luma",
  "Mistral",
  "Notion",
  "NVIDIA",
  "NVIDIA NIM",
  "Nylas",
  "Ollama (local)",
  "OpenAI",
  "OpenRouter",
  "Qwen",
  "Replicate",
  "Runwav",
  "SendGrid",
  "Slack",
  "Stability AI",
  "Stripe",
  "Telegram",
  "VS Code",
  "X",
  "YouTube",
  "grok2api",
  "grok2api URL",
  "xAI",
]);

/** Provider id in the OAuth registry, for the services it can authorize. */
const OAUTH: Record<string, string> = {
  Google: "google",
  "Gmail (OAuth)": "google",
  "Google Calendar": "google",
  "Google Analytics": "google",
  "Search Console": "google",
  YouTube: "google",
  Microsoft: "microsoft",
  Outlook: "microsoft",
  "Outlook Calendar": "microsoft",
  GitHub: "github",
  GitLab: "gitlab",
  Slack: "slack",
  Notion: "notion",
  Discord: "discord",
  Spotify: "spotify",
  LinkedIn: "linkedin",
  Reddit: "reddit",
  Dropbox: "dropbox",
  Zoom: "zoom",
  X: "x",
  "Twitter/X": "x",
  Facebook: "facebook",
  Instagram: "facebook",
  Meta: "facebook",
  Threads: "facebook",
  Pinterest: "pinterest",
  TikTok: "tiktok",
  ClickUp: "clickup",
  Yahoo: "yahoo",
};

const SUMMARY: Record<string, string> = {
  Google: "Sign-in plus Calendar, Drive and Search Console access for every Google surface in LifeOS.",
  "Gmail (OAuth)": "Reads the connected mailbox with Google's own consent screen.",
  "Google Calendar": "Events land on the board and in the day planner.",
  "Google Analytics": "Traffic readouts on the analytics desk.",
  "Search Console": "Site queries and coverage for the properties you own.",
  YouTube: "Channel and video readouts.",
  Microsoft: "One Microsoft login covering Outlook and the calendar.",
  Outlook: "Reads mail with Microsoft's consent screen.",
  "Outlook Calendar": "Events land on the board.",
  GitHub: "Repos, issues and pull requests for the engineering desks.",
  Slack: "Channel and workspace readouts for the comms desk.",
  Discord: "Server and account readouts.",
  Spotify: "Playback and playlists for the music desk.",
  Notion: "Databases and pages for the notes desk.",
  Dropbox: "Files for the storage desk.",
  Stripe: "Balance and charges for the finance desk.",
  Anthropic: "Claude models for Erebus and Kranos.",
  OpenAI: "GPT models plus voice for the AI hub.",
  OpenRouter: "One key, many models, for the AI hub.",
  "Hugging Face": "Hosted model inference for the AI hub.",
  NVIDIA: "NIM models for the AI hub.",
  "NVIDIA NIM": "NIM models for the AI hub.",
  Ollama: "Models running on this computer, no cloud key.",
  "Ollama (local)": "Models running on this computer, no cloud key.",
  Groq: "Fast inference for the AI hub.",
  DeepSeek: "DeepSeek models for the AI hub.",
  Mistral: "Mistral models for the AI hub.",
  xAI: "Grok models for Erebus.",
  "Grok (xAI)": "Grok models for Erebus.",
  "Google AI (Gemini)": "Gemini models for the AI hub.",
};

const DEPENDENTS: Record<string, string[]> = {
  Google: ["Calendar", "Search Console check", "Analytics check", "Gmail"],
  "Gmail (OAuth)": ["Inbox digest"],
  "Google Calendar": ["Day planner", "Board events"],
  Microsoft: ["Outlook", "Calendar"],
  GitHub: ["Engineering desks", "Agent repos"],
  Slack: ["Comms desk"],
  Notion: ["Notes desk"],
  Spotify: ["Music desk"],
  Stripe: ["Finance desk"],
  OpenAI: ["AI hub", "Voice tools"],
  Anthropic: ["Erebus", "Kranos"],
  OpenRouter: ["AI hub"],
  "Hugging Face": ["AI hub"],
  NVIDIA: ["AI hub"],
  "NVIDIA NIM": ["AI hub"],
  xAI: ["Erebus"],
  "Grok (xAI)": ["Erebus"],
  "Google AI (Gemini)": ["AI hub"],
  Ollama: ["AI hub (local)"],
  "Ollama (local)": ["AI hub (local)"],
};

const NOTE: Record<string, string> = {
  "Apple iCloud": "Apple has no personal API. Use an app-specific password from appleid.apple.com; mail and calendar connect through Nylas.",
  "iCloud Calendar": "Apple has no personal API. Connect it through Nylas with an app-specific password.",
  "Apple Maps": "Use a MapKit JS or Apple Maps Server API token from your Apple Developer account.",
  Bing: "Microsoft retired the Bing Search API for new customers; this card stays until you hold an existing key.",
  Dogpile: "Metasearch has no public API. Nothing can connect here.",
  Signal: "Signal has no public API and no business connector. Nothing can connect here.",
  "VS Code": "Not a service — checked as a local editor endpoint only.",
  Firefox: "A browser, not a service. Nothing to connect.",
  Opera: "A browser, not a service. Nothing to connect.",
  Docker: "Use a Docker Hub personal access token (read-only) to check the registry.",
  Snapchat: "Marketing API only, behind a Business app review. Add it after approval.",
  "Cash App": "No public developer API for personal accounts.",
  Venmo: "No public developer API.",
  "Credit Karma": "No public developer API for account data.",
  SoFi: "No public developer API.",
  Chase: "No public developer API; banking data needs an aggregator such as Plaid.",
  Experian: "Business API only, with a commercial agreement.",
  Digits: "No public API.",
  "DraftKings": "No public API for accounts.",
  Hercules: "Internal agent service — connect it once it exposes a URL and key.",
  Hermes: "Internal agent service — connect it once it exposes a URL and key.",
  Antigravity: "Internal agent service — connect it once it exposes a URL and key.",
  Genies: "No public integration API.",
  Plain: "Internal tooling — connect it once it exposes a URL and key.",
  Tenstrip: "Internal tooling — connect it once it exposes a URL and key.",
  Lumin: "Internal tooling — connect it once it exposes a URL and key.",
  "grok2api URL": "The gateway address that `grok2api` checks against.",
  WhatsApp: "Business API only, through Meta with a verified business.",
  "TikTok Shop": "Seller API needs a partner app review.",
  "Facebook App ID": "The app id used by the Facebook connect flow; saved, not tested.",
  "CEO GPS": "House brand — connect it with its own key or leave it empty.",
  Supabase: "Service-role or anon key for direct database calls.",
  Cloudflare: "API token with the scopes you want to read.",
  Base44: "API key for app-builder calls.",
  "Brilliant Directories": "Key plus the site URL; checked against the live directory.",
  GoDaddy: "Key and secret from the same GoDaddy API page.",
  Nylas: "Connects iCloud mail and calendar, plus Google and Microsoft mailboxes.",
  "X": "OAuth 2.0 with PKCE; the X app must allow the callback URL shown on the card.",
  "Twitter/X": "OAuth 2.0 with PKCE; the X app must allow the callback URL shown on the card.",
  Reddit: "Requires a script-type app; Reddit reviews new API clients before they go live.",
  TikTok: "Requires a reviewed TikTok for Developers app.",
  Pinterest: "Requires a standard-access Pinterest app.",
};

const CATALOG_ROWS: Record<IntegrationCategory, string[]> = {
  google: [
    "Google",
    "Gmail (OAuth)",
    "Google AI (Gemini)",
    "Google Analytics",
    "Google Calendar",
    "Google Maps",
    "Google Voice",
    "Search Console",
    "YouTube",
    "Firebase",
  ],
  ai: [
    "Alibaba",
    "Anthropic",
    "Antigravity",
    "Anyscale",
    "Azure AI",
    "Base 1",
    "Blackforest Labs",
    "Cohere",
    "D-ID (avatar)",
    "DeepSeek",
    "ElevenLabs",
    "Exa",
    "Fish.Audio",
    "Gemma",
    "Grok (xAI)",
    "grok2api",
    "grok2api URL",
    "Groq",
    "Hercules",
    "Hermes",
    "Hugging Face",
    "Kimi",
    "Kling",
    "Krea",
    "Luma",
    "Meta LLaMA",
    "Mistral",
    "Moondream2",
    "NVIDIA",
    "NVIDIA NIM",
    "Ollama (local)",
    "OpenAI",
    "OpenRouter",
    "Parallel",
    "QuarkAI",
    "Qwen",
    "Replicate",
    "Runwav",
    "Stability AI",
    "Suno (music)",
    "Wan-AI",
    "xAI",
  ],
  developer: [
    "AWS S3",
    "Azure Storage",
    "Base44",
    "Browserbase",
    "Cloudflare",
    "Cloudflare Account",
    "Cloudflare Token",
    "Docker",
    "Firecrawl",
    "GitHub",
    "GitLab",
    "GoDaddy",
    "Jotform",
    "Make (Integromat)",
    "PocketBase",
    "Postman",
    "Prisma",
    "VS Code",
  ],
  productivity: [
    "Airtable",
    "Asana",
    "Calendly",
    "Canva",
    "ClickUp",
    "Cron",
    "Dropbox",
    "Linear",
    "Monday.com",
    "Notion",
    "Otter.ai",
    "Todoist",
    "Trello",
    "Zoom",
  ],
  comms: [
    "Brevo",
    "Copilot (Microsoft)",
    "Discord",
    "Klaviyo",
    "Mailchimp",
    "Microsoft",
    "Outlook",
    "Outlook Calendar",
    "Proton Mail",
    "SendGrid",
    "Signal",
    "Slack",
    "Telegram",
    "Twilio",
    "WhatsApp",
  ],
  social: [
    "Facebook",
    "Facebook App ID",
    "Instagram",
    "LinkedIn",
    "Meta",
    "Nextdoor",
    "Pandora",
    "Pinterest",
    "Reddit",
    "Shutterstock",
    "Snapchat",
    "Spotify",
    "Threads",
    "TikTok",
    "TikTok Shop",
    "Vimeo",
    "X",
    "Twitter/X",
  ],
  finance: [
    "Brex",
    "Cash App",
    "Chase",
    "Credit Karma",
    "Crypto.com",
    "Digits",
    "DraftKings",
    "Experian",
    "Kraken",
    "Mercury",
    "MorningStar",
    "PayPal",
    "Plaid",
    "SoFi",
    "Stripe",
    "Venmo",
  ],
  marketing: [
    "Ahrefs",
    "Alignable",
    "Bing",
    "Brilliant Directories",
    "CEO GPS",
    "Dogpile",
    "Gumloop",
    "HubSpot",
    "LunarCrush",
    "MOZ",
    "Ring",
    "ShowMeLocal",
    "Temu",
    "Trivago",
    "Weather",
    "Yahoo",
    "Yelp",
    "YP.com",
    "Zoominfo",
  ],
  local: [
    "Apple iCloud",
    "Apple Maps",
    "Firefox",
    "iCloud Calendar",
    "Malwarebytes",
    "Nylas",
    "Opera",
    "Supabase",
    "Xiaomi",
    "WordPress",
  ],
};

/** Services whose server check is tied to a connected Google login. */
const ACCOUNT: Record<string, Integration["account"]> = {
  "Search Console": "search-console",
  "Google Analytics": "google-analytics",
  GoDaddy: "godaddy",
  "Brilliant Directories": "brilliant",
};

/** Services that have no connectable public API at all. */
const UNSUPPORTED = new Set([
  "Dogpile",
  "Signal",
  "Firefox",
  "Opera",
  "Cash App",
  "Venmo",
  "Credit Karma",
  "SoFi",
  "Chase",
  "Experian",
  "Digits",
  "DraftKings",
  "Genies",
  "Malwarebytes",
  "Ring",
  "Weather",
  "Xiaomi",
  "Prisma",
  "Postman",
  "Cron",
  "Pandora",
]);

function slug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function build(): Integration[] {
  const rows: Integration[] = [];
  const taken = new Set<string>();
  for (const [category, names] of Object.entries(CATALOG_ROWS) as [IntegrationCategory, string[]][]) {
    for (const name of names) {
      const base = OAUTH[name] && name === "Google" ? "google" : slug(name);
      let id = base;
      for (let n = 2; taken.has(id); n += 1) id = `${base}-${n}`;
      taken.add(id);
      const methods: AuthMethod[] = [];
      if (OAUTH[name]) methods.push("oauth");
      if (PROBE.has(name) && name !== "Ollama (local)") methods.push("apikey");
      if (name === "Ollama (local)") methods.push("local");
      if (!methods.length) methods.push("apikey");
      if (UNSUPPORTED.has(name)) {
        rows.push({ id, name, category, methods: ["none"], summary: "", dependents: [], note: NOTE[name] });
        continue;
      }
      rows.push({
        id,
        name,
        category,
        methods,
        summary: SUMMARY[name] || "",
        dependents: DEPENDENTS[name] || [],
        probe: PROBE.has(name) && name !== "Ollama (local)" ? name : undefined,
        account: ACCOUNT[name],
        note: NOTE[name],
      });
    }
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
}

export const CATALOG: Integration[] = build();

export function integration(id: string): Integration | undefined {
  return CATALOG.find((row) => row.id === id);
}

/** Provider id in the OAuth registry for a catalog entry, when it has one. */
export function oauthProviderId(entry: Integration): string | undefined {
  return OAUTH[entry.name];
}

export function oauthProviderIds(): Set<string> {
  return new Set(Object.values(OAUTH));
}
