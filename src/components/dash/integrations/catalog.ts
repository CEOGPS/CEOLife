import { PROVIDERS, type Category, type ProviderId } from "@/lib/integrations/providers";

/**
 * Services that connect with a pasted API key. The key is stored in the board memory
 * (`data.keys`) exactly as before, so every desk that reads it keeps working.
 */
export type KeyService = { name: string; category: Category; url?: string; custom?: boolean };

/** Cards added from the API Directory are stored as a key row with this prefix, so they sync like keys. */
export const CARD_PREFIX = "Directory card: ";

/** Maps a directory category onto this page's groups. */
export function directoryCategory(raw: string): Category {
  const c = raw.toLowerCase();
  if (/\b(ai|ml|generative|recognition|translation|text analysis|voice)\b/.test(c)) return "AI";
  if (/email|sms|calendar|chats|messaging/.test(c)) return "Mail & Calendar";
  if (/finance|payment|blockchain|crypto|commerce|business|real estate/.test(c)) return "Finance";
  if (/marketing|seo|analytics|crm|forms|surveys|statistics|visitor/.test(c)) return "Marketing";
  if (/social|bots|comment/.test(c)) return "Social";
  if (/music|video|media|images|photo|news|entertainment|games|books|comics|weather|maps|geo|travel|sport|space|fun|animals|food/.test(c)) return "Media";
  if (/project|collaboration|documents|productivity|issue|wiki|bookmarks|education|jobs/.test(c)) return "Productivity";
  if (/cloud|iaas|paas|baas|hosting|cdn|dns|storage|databases|managed data|major cloud/.test(c)) return "Cloud";
  if (/dev|code|ci and cd|testing|monitoring|log|security|auth|docker|ide|artifact|package|tunnel|crash|feature|low-code|captcha|validation|urls|scrapers|screenshot|open source/.test(c)) return "Developer";
  return "Other";
}

export const KEY_SERVICES: KeyService[] = [
  { name: "Ahrefs", category: "Marketing" },
  { name: "Airtable", category: "Productivity" },
  { name: "Alibaba", category: "Marketing" },
  { name: "Alignable", category: "Social" },
  { name: "Anthropic", category: "AI" },
  { name: "Antigravity", category: "AI" },
  { name: "Anyscale", category: "AI" },
  { name: "Apple iCloud", category: "Mail & Calendar" },
  { name: "Apple Maps", category: "Media" },
  { name: "Asana", category: "Productivity" },
  { name: "AWS S3", category: "Developer" },
  { name: "Azure AI", category: "AI" },
  { name: "Azure Storage", category: "Developer" },
  { name: "Base44", category: "Developer" },
  { name: "Bing", category: "Marketing" },
  { name: "Blackforest Labs", category: "AI" },
  { name: "Brevo", category: "Marketing" },
  { name: "Brex", category: "Finance" },
  { name: "Brilliant Directories", category: "Marketing" },
  { name: "Browserbase", category: "Developer" },
  { name: "Calendly", category: "Mail & Calendar" },
  { name: "Canva", category: "Productivity" },
  { name: "Cash App", category: "Finance" },
  { name: "CEO GPS", category: "Productivity" },
  { name: "Chase", category: "Finance" },
  { name: "ClickUp", category: "Productivity" },
  { name: "Cloudflare", category: "Developer" },
  { name: "Cloudflare Account", category: "Developer" },
  { name: "Cloudflare Token", category: "Developer" },
  { name: "Cohere", category: "AI" },
  { name: "Copilot (Microsoft)", category: "AI" },
  { name: "Credit Karma", category: "Finance" },
  { name: "Cron", category: "Developer" },
  { name: "Crypto.com", category: "Finance" },
  { name: "D-ID (avatar)", category: "AI" },
  { name: "DeepSeek", category: "AI" },
  { name: "Digits", category: "Finance" },
  { name: "Docker", category: "Developer" },
  { name: "Dogpile", category: "Media" },
  { name: "DraftKings", category: "Finance" },
  { name: "Dropbox", category: "Productivity" },
  { name: "ElevenLabs", category: "AI" },
  { name: "Exa", category: "AI" },
  { name: "Experian", category: "Finance" },
  { name: "Facebook App ID", category: "Social" },
  { name: "Firebase", category: "Developer" },
  { name: "Firefox", category: "Media" },
  { name: "Fish.Audio", category: "AI" },
  { name: "Gemma", category: "AI" },
  { name: "Genies", category: "AI" },
  { name: "GitHub", category: "Developer" },
  { name: "GitLab", category: "Developer" },
  { name: "Gmail (OAuth)", category: "Mail & Calendar" },
  { name: "GoDaddy", category: "Marketing" },
  { name: "Google AI (Gemini)", category: "AI" },
  { name: "Google Analytics", category: "Marketing" },
  { name: "Google Calendar", category: "Mail & Calendar" },
  { name: "Google Maps", category: "Media" },
  { name: "Google Voice", category: "Mail & Calendar" },
  { name: "Grok (xAI)", category: "AI" },
  { name: "Groq", category: "AI" },
  { name: "Gumloop", category: "Productivity" },
  { name: "Hercules", category: "AI" },
  { name: "Hermes", category: "AI" },
  { name: "HubSpot", category: "Marketing" },
  { name: "Hugging Face", category: "AI" },
  { name: "iCloud Calendar", category: "Mail & Calendar" },
  { name: "Instagram", category: "Social" },
  { name: "Jotform", category: "Marketing" },
  { name: "Klaviyo", category: "Marketing" },
  { name: "Kling", category: "AI" },
  { name: "Kraken", category: "Finance" },
  { name: "Krea", category: "AI" },
  { name: "Linear", category: "Productivity" },
  { name: "LinkedIn", category: "Social" },
  { name: "Luma", category: "AI" },
  { name: "Lumin", category: "AI" },
  { name: "Mailchimp", category: "Marketing" },
  { name: "Make (Integromat)", category: "Productivity" },
  { name: "Malwarebytes", category: "Productivity" },
  { name: "Mercury", category: "Finance" },
  { name: "Meta LLaMA", category: "AI" },
  { name: "Mistral", category: "AI" },
  { name: "Monday.com", category: "Productivity" },
  { name: "Moondream2", category: "AI" },
  { name: "MorningStar", category: "Finance" },
  { name: "MOZ", category: "Marketing" },
  { name: "Nextdoor", category: "Social" },
  { name: "Notion", category: "Productivity" },
  { name: "NVIDIA", category: "AI" },
  { name: "NVIDIA NIM", category: "AI" },
  { name: "Nylas", category: "Mail & Calendar" },
  { name: "Ollama (local)", category: "AI" },
  { name: "Ollama Cloud", category: "AI" },
  { name: "OpenAI", category: "AI" },
  { name: "OpenRouter", category: "AI" },
  { name: "Opera", category: "Media" },
  { name: "Otter.ai", category: "AI" },
  { name: "Outlook", category: "Mail & Calendar" },
  { name: "Outlook Calendar", category: "Mail & Calendar" },
  { name: "Pandora", category: "Media" },
  { name: "PayPal", category: "Finance" },
  { name: "Pinterest", category: "Social" },
  { name: "Plaid", category: "Finance" },
  { name: "Plain", category: "Productivity" },
  { name: "PocketBase", category: "Developer" },
  { name: "Postman", category: "Developer" },
  { name: "Prisma", category: "Developer" },
  { name: "Proton Mail", category: "Mail & Calendar" },
  { name: "QuarkAI", category: "AI" },
  { name: "Qwen", category: "AI" },
  { name: "Reddit", category: "Social" },
  { name: "Replicate", category: "AI" },
  { name: "Ring", category: "Mail & Calendar" },
  { name: "Runwav", category: "AI" },
  { name: "Search Console", category: "Marketing" },
  { name: "SendGrid", category: "Marketing" },
  { name: "Shutterstock", category: "Media" },
  { name: "ShowMeLocal", category: "Marketing" },
  { name: "Signal", category: "Social" },
  { name: "Slack", category: "Productivity" },
  { name: "Snapchat", category: "Social" },
  { name: "SoFi", category: "Finance" },
  { name: "Stability AI", category: "AI" },
  { name: "Stripe", category: "Finance" },
  { name: "Suno (music)", category: "AI" },
  { name: "Supabase", category: "Developer" },
  { name: "Telegram", category: "Social" },
  { name: "Temu", category: "Media" },
  { name: "Tenstrip", category: "Media" },
  { name: "Threads", category: "Social" },
  { name: "TikTok", category: "Social" },
  { name: "TikTok Shop", category: "Social" },
  { name: "Todoist", category: "Productivity" },
  { name: "Trello", category: "Productivity" },
  { name: "Trivago", category: "Media" },
  { name: "Twilio", category: "Developer" },
  { name: "Twitter/X", category: "Social" },
  { name: "Venmo", category: "Finance" },
  { name: "Vimeo", category: "Media" },
  { name: "VS Code", category: "Developer" },
  { name: "Wan-AI", category: "AI" },
  { name: "WhatsApp", category: "Social" },
  { name: "WordPress", category: "Developer" },
  { name: "X", category: "Social" },
  { name: "xAI", category: "AI" },
  { name: "grok2api", category: "AI" },
  { name: "grok2api URL", category: "AI" },
  { name: "Yahoo", category: "Media" },
  { name: "Yelp", category: "Marketing" },
  { name: "YouTube", category: "Social" },
  { name: "YP.com", category: "Marketing" },
  { name: "Zoominfo", category: "Marketing" },
  { name: "Firecrawl", category: "AI" },
  { name: "GLM", category: "AI" },
  { name: "Kimi", category: "AI" },
  { name: "Meta", category: "Social" },
  { name: "Microsoft", category: "Productivity" },
  { name: "Parallel", category: "AI" },
  { name: "Weather", category: "Media" },
  { name: "Xiaomi", category: "Productivity" },
  { name: "Zoom", category: "Mail & Calendar" },
  { name: "NewsAPI", category: "Media" },
  { name: "Open Weather", category: "Media" },
  { name: "Alpha Vantage", category: "Finance" },
  { name: "Hunter.io", category: "Marketing" },
  { name: "DeepL", category: "AI" },
  { name: "NASA", category: "Media" },
  { name: "CoinGecko", category: "Finance" },
  { name: "Numverify", category: "Developer" },
  { name: "Serpstack", category: "Marketing" },
  { name: "Mailboxlayer", category: "Marketing" },
  { name: "Scrapestack", category: "Developer" },
  { name: "Mediastack", category: "Media" },
  { name: "IPstack", category: "Developer" },
];

/**
 * These run on a one-click login card, so they get no key card. A key saved earlier stays stored
 * (features that read it keep working), but the card is hidden so each service has one way to connect.
 */
export const COVERED_BY_LOGIN = new Set([
  "Outlook", "Outlook Calendar", "Google Calendar", "Gmail (OAuth)", "Twitter/X", "X", "LinkedIn", "Microsoft",
  "GitHub", "Slack", "Notion", "Facebook App ID",
]);

/** The accounts each login card is meant to hold. Each gets its own Connect button. */
export const PLANNED_ACCOUNTS: Partial<Record<ProviderId, string[]>> = {
  google: ["chrisgr33ninc@gmail.com", "ceogps.marketinggod@gmail.com"],
  facebook: ["cagednreality@icloud.com", "cagednreality@outlook.com"],
};

/** Google accounts tried, in order, for Search Console and Analytics. */
export const GOOGLE_DATA_ACCOUNTS = ["ceogps.marketinggod@gmail.com", "chrisgr33ninc@gmail.com", "chris@ceogps.com"];

/** OAuth apps that live on lifeos1-api. A missing copy in this page's env does not block Connect. */
export const WORKER_OAUTH = new Set<ProviderId>([
  "google", "microsoft", "github", "slack", "notion", "spotify", "discord", "facebook", "linkedin", "twitter",
]);

/** Real top-level link. Works without the click handler and escapes a preview frame. */
export function oauthStartHref(provider: string, account?: string) {
  if (provider === "spotify") return "https://lifeos.ceogps.com/api/oauth/start?provider=spotify";
  const params = new URLSearchParams();
  params.set("provider", provider);
  const hint = (account || "").trim();
  if (hint) params.set("account", hint);
  return `/api/oauth/start?${params.toString()}`;
}

/** Cards that verify through a Google login or need more than one field. */
export const ACCOUNT_SERVICES: Record<string, "search-console" | "google-analytics" | "godaddy" | "brilliant"> = {
  "Search Console": "search-console",
  "Google Analytics": "google-analytics",
  GoDaddy: "godaddy",
  "Brilliant Directories": "brilliant",
};

/** A second field that some services need next to the key. Stored under `keyName`. */
export const EXTRA_FIELD: Record<string, { label: string; keyName: string; placeholder: string; secret: boolean }> = {
  GoDaddy: { label: "API secret", keyName: "GoDaddy Secret", placeholder: "Paste the GoDaddy secret", secret: true },
  "Brilliant Directories": { label: "Site address", keyName: "Brilliant Site", placeholder: "https://yoursite.com", secret: false },
};

/** Cards whose first field is optional or not a secret. */
export const KEY_LABEL: Record<string, string> = {
  "Search Console": "",
  "Google Analytics": "Property ID (optional)",
  "grok2api URL": "Server URL",
};

export const NO_KEY_NEEDED = new Set(["Search Console"]);
/** These can be tested with nothing pasted because the server holds the credential. */
export const SERVER_HELD = new Set(["Cloudflare", "Cloudflare Account", "Cloudflare Token", "Ollama Cloud"]);

/** No account API. Test hits a public endpoint and says so. A saved key is not marked working. */
export const PUBLIC_TEST = new Set([
  "Crypto.com", "Docker", "Firefox", "GitLab", "Kraken", "Postman", "VS Code", "Weather", "WordPress", "Yahoo",
]);

/** Services that share one stored key under two names. */
export const KEY_TWINS: Record<string, string[]> = {
  xAI: ["xAI", "Grok (xAI)"],
  "Grok (xAI)": ["xAI", "Grok (xAI)"],
};

export const GOOGLE_FAMILY = /^(Google|Gmail|YouTube|Search Console|Firebase)/;

export const CATEGORY_ORDER: Category[] = ["Mail & Calendar", "AI", "Developer", "Social", "Productivity", "Marketing", "Finance", "Media", "Cloud", "Other"];

/** The mailboxes the dashboard is built around. */
export const MAILBOXES = {
  google: "chrisgr33ninc@gmail.com",
  marketing: "ceogps.marketinggod@gmail.com",
  work: "chris@ceogps.com",
  icloud: "cagednreality@icloud.com",
  outlook: "cagednreality@outlook.com",
} as const;

export const BOARD_EMAIL_LIST: string[] = [MAILBOXES.work, MAILBOXES.google, MAILBOXES.marketing, MAILBOXES.icloud, MAILBOXES.outlook];

/** Google uses the Gmail accounts, Facebook and the Email desk use cagednreality, every other platform uses the work address. */
export function recommendedPlan(): Partial<Record<ProviderId, string>> {
  const plan: Partial<Record<ProviderId, string>> = { google: MAILBOXES.google, facebook: MAILBOXES.icloud, nylas: MAILBOXES.icloud };
  for (const meta of PROVIDERS) if (!plan[meta.id]) plan[meta.id] = MAILBOXES.work;
  return plan;
}
