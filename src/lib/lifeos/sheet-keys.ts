export const SERVICE_ENV: Record<string, string[]> = {
  NVIDIA: ["NVIDIA_API_KEY", "NVAPI_KEY", "VITE_NVIDIA_API_KEY"],
  ElevenLabs: ["ELEVENLABS_API_KEY", "VITE_ELEVENLABS_API_KEY"],
  "Cloudflare Account": ["CF_ACCOUNT_ID", "CLOUDFLARE_ACCOUNT_ID"],
  "Cloudflare Token": ["CF_API_TOKEN", "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_API_TOKEN"],
  Luma: ["LUMA_API_KEY", "VITE_LUMA_API_KEY"],
  Nylas: ["NYLAS_API_KEY", "NYLAS_GRANT_KEY_CEOGPS", "NYLAS_GRANT_KEY_CAGEDNREALITY", "NYLAS_GRANT_KEY_CHRISGR33NINC"],
  Discord: ["DISCORD_CLIENT_SECRET", "DISCORD_CLIENT_ID"],
  Bing: ["BING_SEARCH_API_KEY", "BING_API_KEY"],
  Brave: ["BRAVE_SEARCH_API_KEY", "BRAVE_API_KEY"],
  Dogpile: ["DOGPILE_API_KEY"],
  Instagram: ["INSTAGRAM_ACCESS_TOKEN", "INSTAGRAM_API_KEY", "INSTAGRAM_CLIENT_ID", "INSTAGRAM_CLIENT_SECRET"],
  LinkedIn: ["LINKEDIN_ACCESS_TOKEN", "LINKEDIN_API_KEY", "LINKEDIN_CLIENT_ID", "LINKEDIN_REFRESH_TOKEN"],
  Snapchat: ["SNAPCHAT_API_KEY", "SNAPCHAT_ACCESS_TOKEN"],
  TikTok: ["TIKTOK_ACCESS_TOKEN", "TIKTOK_API_KEY", "TIKTOK_CLIENT_ID", "TIKTOK_CLIENT_SECRET"],
  Yahoo: ["YAHOO_API_KEY", "YAHOO_CLIENT_SECRET"],
  Reddit: ["REDDIT_ACCESS_TOKEN", "REDDIT_API_KEY"],
  X: [
    "X_ACCESS_TOKEN",
    "TWITTER_ACCESS_TOKEN",
    "TWITTER_CLIENT_ID",
    "TWITTER_CLIENT_SECRET",
    "TWITTER_BEARER_TOKEN",
    "TWITTER_CONSUMER_KEY",
    "TWITTER_CONSUMER_KEY_SECRET",
    "TWITTER_ACCESS_TOKEN_SECRET",
    "TWITTER_API_REFRESH_TOKEN",
  ],
  YouTube: ["YOUTUBE_DATA_V3_API_KEY", "VITE_YOUTUBE_API_KEY", "YOUTUBE_API_KEY"],
  OpenAI: ["OPENAI_API_KEY", "VITE_OPENAI_API_KEY", "VOICE_TOOLS_OPENAI_KEY"],
  Anthropic: ["ANTHROPIC_API_KEY"],
  xAI: ["XAI_API_KEY", "GROK_API_KEY"],
  "Grok (xAI)": ["XAI_API_KEY", "GROK_API_KEY"],
  grok2api: ["GROK2API_KEY"],
  "grok2api URL": ["GROK2API_BASE_URL"],
  Telegram: ["TELEGRAM_BOT_TOKEN"],
  "Google Analytics": ["GA_PROPERTY_ID", "GOOGLE_ANALYTICS_PROPERTY"],
  "Search Console": ["SEARCH_CONSOLE_SITE", "GSC_SITE_URL"],
  "Brilliant Directories": ["BRILLIANT_API_KEY", "BD_API_KEY"],
  "Brilliant Site": ["BRILLIANT_SITE", "BD_SITE"],
  GoDaddy: ["GODADDY_API_KEY", "GODADDY_KEY"],
  "GoDaddy Secret": ["GODADDY_API_SECRET", "GODADDY_SECRET"],
  Supabase: ["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
  "Facebook App ID": ["FACEBOOK_APP_ID", "VITE_FACEBOOK_APP_ID", "FACEBOOK_CLIENT_ID"],
  SendGrid: ["SENDGRID_API_KEY"],
  Brevo: ["BREVO_API_KEY", "BREVO_MCP_API_KEY"],
  Spotify: ["SPOTIFY_CLIENT_SECRET", "SPOTIFY_CLIENT_ID"],
  Replicate: ["REPLICATE_API_TOKEN", "VITE_REPLICATE_API_KEY"],
  Stripe: ["STRIPE_SECRET_KEY", "STRIPE_API_KEY", "STRIPE_PUBLIC_KEY"],
  Hermes: ["HERMES_API_KEY"],
  Qwen: ["QWEN_API_KEY", "DASHSCOPE_API_KEY"],
  "Google Maps": ["GOOGLE_MAPS_API_KEY", "VITE_GOOGLE_MAPS_API_KEY"],
  Twilio: ["TWILIO_AUTH_TOKEN", "TWILIO_ACCOUNT_SID"],
  Groq: ["GROQ_API_KEY"],
  OpenRouter: ["OPENROUTER_API_KEY"],
  DeepSeek: ["DEEPSEEK_API_KEY"],
  Mistral: ["MISTRAL_API_KEY"],
  "Hugging Face": ["HUGGINGFACE_API_KEY", "HF_TOKEN"],
  Airtable: ["AIRTABLE_API_TOKEN"],
  Alibaba: ["ALIBABA_CLOUD_ACCESS_KEY_ID", "ALIBABA_ACCESS_KEY_SECRET"],
  Browserbase: ["BROWSERBASE_API_KEY"],
  ClickUp: ["CLICKUP_API_TOKEN"],
  Cloudflare: ["CLOUDFLARE_GLOBAL_API_KEY"],
  Cron: ["CRON_API_KEY"],
  Dropbox: ["DROPBOX_ACCESS_TOKEN", "DROPBOX_APP_KEY"],
  Exa: ["EXA_API_KEY"],
  Firebase: ["FIREBASE_BROWSER_API_KEY"],
  Genies: ["GENIES_CLIENT_SECRET", "GENIES_CLIENT_ID", "GENIES_APP_ID"],
  GitHub: ["GITHUB_PERSONAL_ACCESS_TOKEN", "GITHUB_CLIENT_SECRET", "GITHUB_OAUTH_CLIENT_SECRET", "GITHUB_PERSONAL_API_KEY", "GITHUB_OAUTH_CLIENT_ID"],
  "Google AI (Gemini)": ["GEMINI_API_KEY", "GOOGLE_AI_STUDIO_API_KEY"],
  "Gmail (OAuth)": ["GMAIL_API_KEY"],
  Jotform: ["JOTFORM_API_KEY"],
  Kling: ["KLING_API_KEY", "KLINGAI_API_KEY"],
  Linear: ["LINEAR_API_KEY"],
  LunarCrush: ["LUNAR_CRUSH_API_KEY"],
  "Make (Integromat)": ["MAKE_COM_API_KEY"],
  "Meta LLaMA": ["METALLAMA_API_KEY"],
  Notion: ["NOTION_API_KEY"],
  "Ollama (local)": ["OLLAMA_URL", "OLLAMA_HOST", "OLLAMA_MODEL", "OLLAMA_API_KEY", "OLLAMA_BASE_URL"],
  PocketBase: ["POCKETBASE_API_KEY", "POCKETBASE_URL"],
  Runwav: ["RUNWAY_API_KEY"],
  Slack: ["SLACK_OAUTH_TOKEN", "SLACK_BOT_TOKEN", "SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET"],
  "Stability AI": ["STABILITY_AI_API_KEY", "STABILITY_AI_CLIENT_ID"],
  Vercel: ["AI_GATEWAY_KEY"],
  "Azure AI": ["AZURE_CLIENT_ID"],
  Firecrawl: ["VITE_FIRECRAWL_API_KEY", "FIRECRAWL_API_KEY"],
  GLM: ["GLM_API_KEY"],
  Kimi: ["KIMI_API_KEY"],
  Meta: ["META_PAGE_ACCESS_TOKEN", "META_APP_SECRET", "META_APP_ID", "META_API_KEY", "META_CLIENT_ID"],
  Microsoft: ["MICROSOFT_CLIENT_SECRET", "MICROSOFT_CLIENT_ID"],
  Parallel: ["PARALLEL_API_KEY"],
  Weather: ["OPEN_WEATHER_MAP_API_KEY", "VITE_WEATHER_API_KEY"],
  Xiaomi: ["XIAOMI_API_KEY"],
  Zoom: ["ZOOM_CLIENT_SECRET", "ZOOM_CLIENT_ID"],
  "D-ID (avatar)": ["DID_API_KEY"],
  // APILayer (same key works for all of these free-tier endpoints)
  Numverify: ["NUMVERIFY_API_KEY", "APILAYER_KEY"],
  Serpstack: ["SERPSTACK_API_KEY", "APILAYER_KEY"],
  "Mailbox Layer": ["MAILBOX_LAYER_API_KEY", "APILAYER_KEY"],
  Scrapestack: ["SCRAPESTACK_API_KEY", "APILAYER_KEY"],
  Mediastack: ["MEDIASTACK_API_KEY", "APILAYER_KEY"],
  IPstack: ["IPSTACK_API_KEY", "APILAYER_KEY"],
  Positionstack: ["POSITIONSTACK_API_KEY", "APILAYER_KEY"],
  Weatherstack: ["WEATHERSTACK_API_KEY", "APILAYER_KEY"],
  Fixer: ["FIXER_API_KEY", "APILAYER_KEY"],

  // --- Public API collection (tools-collection/apis-collection) ---
  Abstract: ["ABSTRACT_API_KEY"],
  "Air Quality": ["AIRNOW_API_KEY", "WAQI_API_KEY"],
  AlphaVantage: ["ALPHAVANTAGE_API_KEY"],
  Amadeus: ["AMADEUS_API_KEY", "AMADEUS_API_SECRET"],
  APIFootball: ["API_FOOTBALL_KEY"],
  "API Ninjas": ["API_NINJAS_KEY"],
  AssemblyAI: ["ASSEMBLYAI_API_KEY"],
  AudD: ["AUDD_API_TOKEN"],
  Aviationstack: ["AVIATIONSTACK_API_KEY"],
  "Barcode Lookup": ["BARCODE_LOOKUP_API_KEY"],
  "Better Stack": ["BETTERSTACK_API_KEY"],
  "Bitly": ["BITLY_ACCESS_TOKEN"],
  "Blockchain.info": ["BLOCKCHAIN_API_KEY"],
  "Brave Search": ["BRAVE_SEARCH_API_KEY"],
  "Calendarific": ["CALENDARIFIC_API_KEY"],
  "Carbon Interface": ["CARBON_INTERFACE_API_KEY"],
  "Clarifai": ["CLARIFAI_API_KEY"],
  "Clearbit": ["CLEARBIT_API_KEY"],
  "CoinAPI": ["COINAPI_KEY"],
  "CoinGecko": ["COINGECKO_API_KEY"],
  "CoinMarketCap": ["COINMARKETCAP_API_KEY"],
  "Congress.gov": ["CONGRESS_API_KEY"],
  "Covalent": ["COVALENT_API_KEY"],
  "Currents": ["CURRENTS_API_KEY"],
  "Datamuse": ["DATAMUSE_API_KEY"],
  "Deepgram": ["DEEPGRAM_API_KEY"],
  "DeepL": ["DEEPL_API_KEY"],
  "Detect Language": ["DETECTLANGUAGE_API_KEY"],
  "DictionaryAPI": ["DICTIONARY_API_KEY"],
  "Duffel": ["DUFFEL_API_KEY"],
  "Etherscan": ["ETHERSCAN_API_KEY"],
  "ExchangeRate": ["EXCHANGERATE_API_KEY"],
  "FEC": ["FEC_API_KEY"],
  "Finnhub": ["FINNHUB_API_KEY"],
  "FlightAware": ["FLIGHTAWARE_API_KEY"],
  "FoodData Central": ["USDA_API_KEY"],
  "Forex": ["FOREX_API_KEY"],
  "Foursquare": ["FOURSQUARE_API_KEY"],
  "FreeCurrency": ["FREECURRENCY_API_KEY"],
  "Geocodio": ["GEOCODIO_API_KEY"],
  "GNews": ["GNEWS_API_KEY"],
  "GraphHopper": ["GRAPHHOPPER_API_KEY"],
  "Here": ["HERE_API_KEY"],
  "Hunter": ["HUNTER_API_KEY"],
  "IEX Cloud": ["IEX_API_KEY"],
  "Imgur": ["IMGUR_CLIENT_ID"],
  "IPGeolocation": ["IPGEOLOCATION_API_KEY"],
  "IPInfo": ["IPINFO_TOKEN"],
  "JSONBin": ["JSONBIN_API_KEY"],
  "LocationIQ": ["LOCATIONIQ_API_KEY"],
  "Mapbox": ["MAPBOX_ACCESS_TOKEN"],
  "Marketstack": ["MARKETSTACK_API_KEY"],
  "MeaningCloud": ["MEANINGCLOUD_API_KEY"],
  "MediaWiki": ["MEDIAWIKI_API_KEY"],
  "MerriamWebster": ["MERRIAM_WEBSTER_API_KEY"],
  "Metalprice": ["METALPRICE_API_KEY"],
  "NASA": ["NASA_API_KEY"],
  "NewsAPI": ["NEWSAPI_KEY"],
  "Newscatcher": ["NEWSCATCHER_API_KEY"],
  "OpenCage": ["OPENCAGE_API_KEY"],
  "OpenCorporates": ["OPENCORPORATES_API_KEY"],
  "OpenExchangeRates": ["OPENEXCHANGERATES_APP_ID"],
  "OpenFoodFacts": ["OPENFOODFACTS_API_KEY"],
  "OpenLibrary": ["OPENLIBRARY_API_KEY"],
  "OpenRouteService": ["OPENROUTESERVICE_API_KEY"],
  "OpenWeather": ["OPENWEATHER_API_KEY"],
  "Pexels": ["PEXELS_API_KEY"],
  "Pixabay": ["PIXABAY_API_KEY"],
  "Polygon": ["POLYGON_API_KEY"],
  "PositionStack": ["POSITIONSTACK_API_KEY"],
  "Quotable": ["QUOTABLE_API_KEY"],
  "RapidAPI": ["RAPIDAPI_KEY"],
  "RestCountries": ["RESTCOUNTRIES_API_KEY"],
  "ScraperAPI": ["SCRAPERAPI_KEY"],
  "ScrapingBee": ["SCRAPINGBEE_API_KEY"],
  "SerpAPI": ["SERPAPI_KEY"],
  "Shodan": ["SHODAN_API_KEY"],
  "Skyscanner": ["SKYSCANNER_API_KEY"],
  "Spotify Web": ["SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET"],
  "Steam": ["STEAM_API_KEY"],
  "StockData": ["STOCKDATA_API_KEY"],
  "TheSportsDB": ["THESPORTSDB_API_KEY"],
  "TimeZoneDB": ["TIMEZONEDB_API_KEY"],
  "TomTom": ["TOMTOM_API_KEY"],
  "Twilio": ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"],
  "Unsplash": ["UNSPLASH_ACCESS_KEY"],
  "VirusTotal": ["VIRUSTOTAL_API_KEY"],
  "WeatherAPI": ["WEATHERAPI_KEY"],
  "WordsAPI": ["WORDSAPI_KEY"],
  "WorldNews": ["WORLDNEWS_API_KEY"],
  "Yahoo Finance": ["YAHOO_FINANCE_API_KEY"],
  "Zillow": ["ZILLOW_API_KEY"],
  "Zipcodebase": ["ZIPCODEBASE_API_KEY"],
  // free / key-optional helpers
  "Advice Slip": ["ADVICE_SLIP_KEY"],
  "Bored API": ["BORED_API_KEY"],
  "Cat Facts": ["CAT_FACTS_KEY"],
  "Dog CEO": ["DOG_CEO_KEY"],
  "JokeAPI": ["JOKEAPI_KEY"],
  "Kanye Rest": ["KANYE_REST_KEY"],
  "Numbers API": ["NUMBERS_API_KEY"],
  "Public Holidays": ["PUBLIC_HOLIDAYS_KEY"],
  "Quotes Free": ["QUOTES_FREE_KEY"],
  "Random User": ["RANDOMUSER_KEY"],
  "Sunrise Sunset": ["SUNRISE_SUNSET_KEY"],
  "Universities List": ["UNIVERSITIES_API_KEY"],
  "URL Scan": ["URLSCAN_API_KEY"],
  "VAT Validation": ["VAT_API_KEY"],
  "Whois": ["WHOIS_API_KEY"],

  "Whois": ["WHOIS_API_KEY"],
  // free-for.dev useful free tiers
  "Better Uptime": ["BETTERUPTIME_API_KEY"],
  "Bugsnag": ["BUGSNAG_API_KEY"],
  "Cloudflare Analytics": ["CF_ANALYTICS_TOKEN"],
  "Countly": ["COUNTLY_API_KEY"],
  "Crisp": ["CRISP_API_KEY"],
  "Customer.io": ["CUSTOMERIO_API_KEY"],
  "Datadog": ["DATADOG_API_KEY"],
  "EmailOctopus": ["EMAILOCTOPUS_API_KEY"],
  "Formspree": ["FORMSPREE_API_KEY"],
  "Getform": ["GETFORM_API_KEY"],
  "GlitchTip": ["GLITCHTIP_API_KEY"],
  "Grafana Cloud": ["GRAFANA_API_KEY"],
  "Hasura": ["HASURA_ADMIN_SECRET"],
  "Highlight": ["HIGHLIGHT_API_KEY"],
  "Imgix": ["IMGIX_API_KEY"],
  "Instatus": ["INSTATUS_API_KEY"],
  "Jitsu": ["JITSU_API_KEY"],
  "Koyeb": ["KOYEB_API_TOKEN"],
  "Logtail": ["LOGTAIL_TOKEN"],
  "Logflare": ["LOGFLARE_API_KEY"],
  "Mailgun": ["MAILGUN_API_KEY"],
  "Mailjet": ["MAILJET_API_KEY"],
  "Neon": ["NEON_API_KEY"],
  "New Relic": ["NEWRELIC_API_KEY"],
  "Nhost": ["NHOST_ADMIN_SECRET"],
  "OneSignal": ["ONESIGNAL_API_KEY"],
  "OpenStatus": ["OPENSTATUS_API_KEY"],
  "Plausible": ["PLAUSIBLE_API_KEY"],
  "PocketBase Cloud": ["POCKETBASE_CLOUD_KEY"],
  "PostHog": ["POSTHOG_API_KEY"],
  "Pushbullet": ["PUSHBULLET_API_KEY"],
  "Pusher": ["PUSHER_APP_KEY"],
  "Railway": ["RAILWAY_TOKEN"],
  "Render": ["RENDER_API_KEY"],
  "Resend": ["RESEND_API_KEY"],
  "Sentry": ["SENTRY_DSN", "SENTRY_AUTH_TOKEN"],
  "Simple Analytics": ["SIMPLE_ANALYTICS_API_KEY"],
  "Supabase Analytics": ["SUPABASE_ANALYTICS_KEY"],
  "Svix": ["SVIX_API_KEY"],
  "Tally": ["TALLY_API_KEY"],
  "Tinybird": ["TINYBIRD_TOKEN"],
  "Turso": ["TURSO_AUTH_TOKEN"],
  "UptimeRobot": ["UPTIMEROBOT_API_KEY"],
  "Vercel Analytics": ["VERCEL_ANALYTICS_TOKEN"],
  "Web3Forms": ["WEB3FORMS_ACCESS_KEY"],
  "Webhook.site": ["WEBHOOK_SITE_TOKEN"],
  "Xata": ["XATA_API_KEY"],
  "Yandex Cloud": ["YANDEX_CLOUD_API_KEY"],
  "Zapier": ["ZAPIER_API_KEY"],
  "ZeroBounce": ["ZEROBOUNCE_API_KEY"],
  "Zuplo": ["ZUPLO_API_KEY"],
};

function normKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function addPair(bag: Record<string, string>, name: string, value: string) {
  const key = name.trim().replace(/^export\s+/i, "");
  let next = value.trim().replace(/^\uFEFF/, "");
  if ((next.startsWith('"') && next.endsWith('"')) || (next.startsWith("'") && next.endsWith("'"))) next = next.slice(1, -1);
  if (!key || !next || next.length < 4) return;
  if (/^(your[-_ ]?key|changeme|todo|xxx+|placeholder|none|null|undefined)$/i.test(next)) return;
  if (!bag[key]) bag[key] = next.slice(0, 2000);
}

function cellsOf(line: string) {
  if (line.includes("\t")) return line.split("\t").map((cell) => cell.trim().replace(/^"|"$/g, ""));
  if (line.includes(",") && !line.includes("=")) return line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""));
  return [line];
}

function parseSheet(text: string) {
  const bag: Record<string, string> = {};
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      for (const row of rows) {
        if (!row || typeof row !== "object") continue;
        const record = row as Record<string, unknown>;
        const named = String(record.name || record.service || record.integration || "");
        const value = String(record.value || record.secret || record.token || record.apiKey || record.api_key || "");
        if (named && value) addPair(bag, named, value);
        else for (const [key, item] of Object.entries(record)) if (typeof item === "string") addPair(bag, key, item);
      }
      return bag;
    } catch { /* plain text below */ }
  }
  const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#") && !line.startsWith("//") && !line.startsWith("["));
  const header = cellsOf(lines[0] || "").map((cell) => cell.toLowerCase().replace(/[^a-z_]/g, ""));
  const nameCol = header.findIndex((cell) => ["name", "service", "integration", "platform", "key", "env", "variable"].includes(cell));
  const valueCol = header.findIndex((cell) => ["value", "secret", "token", "apikey", "api_key", "keyvalue"].includes(cell));
  if (lines.length > 1 && nameCol >= 0 && valueCol >= 0 && nameCol !== valueCol) {
    for (const line of lines.slice(1)) {
      const cells = cellsOf(line);
      addPair(bag, cells[nameCol] || "", cells[valueCol] || "");
    }
    return bag;
  }
  for (const line of lines) {
    const cells = cellsOf(line);
    if (cells.length >= 2 && !line.includes("=")) {
      addPair(bag, cells[0], cells.slice(1).join(line.includes("\t") ? "\t" : ","));
      continue;
    }
    const eq = line.indexOf("=");
    if (eq > 0) {
      addPair(bag, line.slice(0, eq), line.slice(eq + 1));
      continue;
    }
    const colon = line.indexOf(":");
    if (colon > 0 && !line.slice(0, colon).includes("/")) addPair(bag, line.slice(0, colon), line.slice(colon + 1));
  }
  return bag;
}

export function sheetKeys(text: string, names: string[]) {
  const alias = new Map<string, string>();
  for (const [service, keys] of Object.entries(SERVICE_ENV)) {
    alias.set(normKey(service), service);
    for (const key of keys) alias.set(normKey(key), service);
  }
  for (const name of names) alias.set(normKey(name), name);
  const found: { name: string; value: string }[] = [];
  const seen = new Set<string>();
  for (const [raw, value] of Object.entries(parseSheet(text))) {
    const service = alias.get(normKey(raw));
    if (!service || seen.has(service)) continue;
    seen.add(service);
    found.push({ name: service, value });
  }
  return found;
}
