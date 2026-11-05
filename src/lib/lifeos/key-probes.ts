/**
 * Real "is this key live?" checks for services that runProbe did not cover.
 * Each one calls an account endpoint (who am I / my credits / my account), so a
 * pass means the key actually works, not just that something was saved.
 * Returns null when the service has no checkable API, so the caller can say so.
 */
type Result = { ok: boolean; checked: true; text: string };

const MS = 8000;

function messageOf(raw: string, status: number) {
  try {
    const body = JSON.parse(raw.slice(0, 4000)) as Record<string, unknown>;
    const pick = (value: unknown): string => {
      if (typeof value === "string") return value;
      if (value && typeof value === "object") {
        const row = value as Record<string, unknown>;
        return pick(row.message || row.error_description || row.error || row.detail || row.msg || "");
      }
      return "";
    };
    const text = pick(body.error) || pick(body.message) || pick(body.detail) || pick(body.errors) || pick(body.error_description);
    if (text) return text.replace(/\s+/g, " ").slice(0, 220);
  } catch {
    /* not json */
  }
  return `Refused (HTTP ${status}).`;
}

async function call(url: string, init: RequestInit, okText: string): Promise<Result> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(MS) });
  const raw = await response.text();
  if (response.ok) return { ok: true, checked: true, text: okText };
  if (response.status === 401 || response.status === 403) {
    return { ok: false, checked: true, text: `Key refused: ${messageOf(raw, response.status)}` };
  }
  return { ok: false, checked: true, text: messageOf(raw, response.status) };
}

function bearer(key: string) {
  return { Authorization: `Bearer ${key}`, Accept: "application/json" };
}

function pair(key: string) {
  const at = key.indexOf(":");
  return at > 0 ? [key.slice(0, at).trim(), key.slice(at + 1).trim()] : [key.trim(), ""];
}

const LIVE = "Connected. The key works.";

/** apilayer services answer HTTP 200 with { success: false, error } on a bad key, so the body decides. HTTPS only: keys are never sent in clear. */
async function apilayer(url: string): Promise<Result> {
  const response = await fetch(url, { signal: AbortSignal.timeout(MS) });
  const raw = await response.text();
  let body: { success?: boolean; error?: { code?: number; type?: string; info?: string } } = {};
  try { body = JSON.parse(raw); } catch { /* scrapestack returns the page itself on success */ }
  if (body.error || body.success === false) {
    const code = body.error?.code;
    if (code === 105 || /https/i.test(body.error?.type || "")) {
      return { ok: false, checked: true, text: "The key is valid, but this plan only allows plain HTTP. LifeOS will not send keys unencrypted. A paid plan unlocks HTTPS." };
    }
    if (code === 104 || /usage_limit/i.test(body.error?.type || "")) return { ok: true, checked: true, text: "Key accepted. This month's free requests are used up." };
    return { ok: false, checked: true, text: `Key refused: ${(body.error?.info || body.error?.type || "unknown error").slice(0, 180)}` };
  }
  return response.ok ? { ok: true, checked: true, text: LIVE } : { ok: false, checked: true, text: `Refused (HTTP ${response.status}).` };
}

export async function probeExtra(name: string, key: string): Promise<Result | null> {
  switch (name) {
    case "Microsoft":
      return call("https://graph.microsoft.com/v1.0/me", { headers: bearer(key) }, LIVE);
    case "Vimeo":
      return call("https://api.vimeo.com/me", { headers: bearer(key) }, LIVE);
    case "Pinterest":
      return call("https://api.pinterest.com/v5/user_account", { headers: bearer(key) }, LIVE);
    case "Zoom":
      return call("https://api.zoom.us/v2/users/me", { headers: bearer(key) }, LIVE);
    case "Canva":
      return call("https://api.canva.com/rest/v1/users/me", { headers: bearer(key) }, LIVE);
    case "Shutterstock":
      return call("https://api.shutterstock.com/v2/user", { headers: bearer(key) }, LIVE);
    case "Yelp":
      return call("https://api.yelp.com/v3/businesses/search?location=Atlanta&limit=1", { headers: bearer(key) }, LIVE);
    case "Ahrefs":
      return call("https://api.ahrefs.com/v3/subscription-info/limits-and-usage", { headers: bearer(key) }, LIVE);
    case "Mercury":
      return call("https://api.mercury.com/api/v1/accounts", { headers: bearer(key) }, LIVE);
    case "Brex":
      return call("https://platform.brexapis.com/v2/users/me", { headers: bearer(key) }, LIVE);
    case "Snapchat":
      return call("https://adsapi.snapchat.com/v1/me", { headers: bearer(key) }, LIVE);
    case "TikTok":
    case "TikTok Shop":
      return call("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name", { headers: bearer(key) }, LIVE);
    case "Reddit":
      return call("https://oauth.reddit.com/api/v1/me", { headers: { ...bearer(key), "User-Agent": "LifeOS/1.0 by ceogps" } }, LIVE);
    case "Kimi":
      return call("https://api.moonshot.ai/v1/models", { headers: bearer(key) }, LIVE);
    case "Fish.Audio":
      return call("https://api.fish.audio/wallet/self/api-credit", { headers: bearer(key) }, LIVE);
    case "Blackforest Labs":
      return call("https://api.bfl.ai/v1/credits", { headers: { "x-key": key, Accept: "application/json" } }, LIVE);
    case "D-ID (avatar)":
      return call("https://api.d-id.com/credits", { headers: { Authorization: `Basic ${key}`, Accept: "application/json" } }, LIVE);
    case "Instagram":
      return call(`https://graph.instagram.com/me?fields=id,username&access_token=${encodeURIComponent(key)}`, {}, LIVE);
    case "Threads":
      return call(`https://graph.threads.net/v1.0/me?fields=id,username&access_token=${encodeURIComponent(key)}`, {}, LIVE);
    case "Meta":
    case "WhatsApp":
      return call(`https://graph.facebook.com/v21.0/me?access_token=${encodeURIComponent(key)}`, {}, LIVE);
    case "Twilio": {
      const [sid, token] = pair(key);
      if (!/^AC[a-f0-9]{32}$/i.test(sid) || !token) {
        return { ok: false, checked: true, text: "Save it as AccountSID:AuthToken (the SID starts with AC)." };
      }
      return call(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, { headers: { Authorization: `Basic ${btoa(`${sid}:${token}`)}` } }, LIVE);
    }
    case "Trello": {
      const [apiKey, token] = pair(key);
      if (!token) return { ok: false, checked: true, text: "Save it as key:token. Trello needs both." };
      return call(`https://api.trello.com/1/members/me?key=${encodeURIComponent(apiKey)}&token=${encodeURIComponent(token)}`, {}, LIVE);
    }
    case "PayPal": {
      const [id, secret] = pair(key);
      if (!secret) return { ok: false, checked: true, text: "Save it as clientId:secret. PayPal needs both." };
      return call("https://api-m.paypal.com/v1/oauth2/token", {
        method: "POST",
        headers: { Authorization: `Basic ${btoa(`${id}:${secret}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: "grant_type=client_credentials",
      }, LIVE);
    }
    case "Make (Integromat)": {
      const first = await call("https://us1.make.com/api/v2/users/me", { headers: { Authorization: `Token ${key}` } }, LIVE);
      if (first.ok) return first;
      const second = await call("https://eu1.make.com/api/v2/users/me", { headers: { Authorization: `Token ${key}` } }, LIVE);
      return second.ok ? second : first;
    }
    case "Supabase": {
      const base = (process.env.SUPABASE_URL || "https://mhvcdstgkyplhzjptgfr.supabase.co").replace(/\/+$/, "");
      return call(`${base}/auth/v1/settings`, { headers: { apikey: key, Accept: "application/json" } }, LIVE);
    }
    case "Numverify":
      return apilayer(`https://apilayer.net/api/validate?access_key=${encodeURIComponent(key)}&number=14158586273`);
    case "Mailboxlayer":
      return apilayer(`https://apilayer.net/api/check?access_key=${encodeURIComponent(key)}&email=support@apilayer.com`);
    case "Serpstack":
      return apilayer(`https://api.serpstack.com/search?access_key=${encodeURIComponent(key)}&query=ceo%20gps&num=1`);
    case "Scrapestack":
      return apilayer(`https://api.scrapestack.com/scrape?access_key=${encodeURIComponent(key)}&url=${encodeURIComponent("https://example.com")}`);
    case "Mediastack":
      return apilayer(`https://api.mediastack.com/v1/news?access_key=${encodeURIComponent(key)}&limit=1`);
    case "IPstack":
      return apilayer(`https://api.ipstack.com/check?access_key=${encodeURIComponent(key)}`);
    case "NewsAPI":
      return call("https://newsapi.org/v2/top-headlines?country=us&pageSize=1", { headers: { "X-Api-Key": key, "User-Agent": "LifeOS/1.0" } }, LIVE);
    case "Open Weather":
    case "Weather":
      return call(`https://api.openweathermap.org/data/2.5/weather?q=Atlanta&appid=${encodeURIComponent(key)}`, {}, LIVE);
    case "Hunter.io":
      return call(`https://api.hunter.io/v2/account?api_key=${encodeURIComponent(key)}`, {}, LIVE);
    case "NASA":
      return call(`https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(key)}`, {}, LIVE);
    case "DeepL": {
      const host = key.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
      return call(`${host}/v2/usage`, { headers: { Authorization: `DeepL-Auth-Key ${key}` } }, LIVE);
    }
    case "Alpha Vantage": {
      // Alpha Vantage answers 200 even for a bad key, so read the body.
      const response = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=IBM&apikey=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(MS) });
      const body = await response.json().catch(() => ({})) as Record<string, unknown>;
      if (body["Global Quote"] && Object.keys(body["Global Quote"] as object).length) return { ok: true, checked: true, text: LIVE };
      const note = String(body["Error Message"] || body.Information || body.Note || "");
      if (/rate limit|requests per day|premium/i.test(note)) return { ok: true, checked: true, text: "Key accepted. Today's free request limit is used up." };
      return { ok: false, checked: true, text: note.slice(0, 200) || "Alpha Vantage refused the key." };
    }
    case "CoinGecko": {
      const demo = await call("https://api.coingecko.com/api/v3/ping", { headers: { "x-cg-demo-api-key": key, Accept: "application/json" } }, LIVE);
      if (demo.ok) return demo;
      const pro = await call("https://pro-api.coingecko.com/api/v3/ping", { headers: { "x-cg-pro-api-key": key, Accept: "application/json" } }, LIVE);
      return pro.ok ? pro : demo;
    }
    default:
      return null;
  }
}

/** Services with no public API a key could prove. The card says this plainly instead of "Saved". */
export const NO_API = new Set([
  "Alibaba", "Alignable", "Antigravity", "Apple Maps", "Base44", "Bing", "Cash App", "CEO GPS", "Chase",
  "Copilot (Microsoft)", "Credit Karma", "Cron", "Digits", "Dogpile", "DraftKings", "Experian", "Genies",
  "Google Voice", "Hercules", "Hermes", "Lumin", "Malwarebytes", "MorningStar", "Nextdoor", "Opera",
  "Otter.ai", "Pandora", "Plain", "PocketBase", "Prisma", "Proton Mail", "QuarkAI", "Ring", "ShowMeLocal",
  "Signal", "SoFi", "Suno (music)", "Temu", "Tenstrip", "Trivago", "Venmo", "Xiaomi", "YP.com",
]);

/** Services that have an API, but no free read-only call that proves a key (each call costs credits or needs signing). */
export const NO_CHECK = new Set([
  "Azure AI", "Exa", "Firebase", "Facebook App ID", "GLM", "Kling", "Meta LLaMA", "Moondream2", "Parallel",
  "Gemma", "Wan-AI", "Krea", "Gumloop", "Zoominfo", "MOZ", "Plaid", "Anyscale", "AWS S3", "Azure Storage",
]);
