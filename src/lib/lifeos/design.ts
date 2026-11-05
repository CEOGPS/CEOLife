import { createServerFn } from "@tanstack/react-start";
import { sessionMiddleware } from "./session-middleware";
import { chatOllamaCloud } from "./ollama-cloud";

/**
 * Design Studio (Creator): turns a brief into one self-contained HTML document.
 * Kinds follow Open Design's useful outputs: landing pages, UI prototypes, slide decks and social graphics.
 * The page is shown in a sandboxed iframe on the client, so nothing it contains can reach the dashboard.
 */
export type DesignKind = "landing" | "prototype" | "deck" | "social";

const SIZES: Record<string, [number, number]> = {
  square: [1080, 1080],
  story: [1080, 1920],
  wide: [1200, 628],
  portrait: [1080, 1350],
};

function rules(kind: DesignKind, size: string, slides: number) {
  const common = [
    "Return ONE complete HTML document and nothing else: start with <!doctype html>, no markdown fences, no commentary.",
    "All CSS inline in a <style> tag. No external scripts, no frameworks, no tracking. Google Fonts <link> tags are allowed.",
    "No external images. Use CSS gradients, shapes, inline SVG and emoji for visuals.",
    "Never invent prices, statistics, testimonials, reviews, quotes or client names. Use clearly marked placeholders like [Price] when the brief gives none.",
    "Modern, polished, accessible: real hierarchy, generous spacing, readable contrast, no lorem ipsum.",
  ];
  if (kind === "landing") return [...common,
    "Make a responsive marketing landing page: hero with headline, subhead and one primary call to action; benefits; how it works; FAQ; final call to action; footer.",
    "Mobile first, works from 360px to 1440px wide.",
  ];
  if (kind === "prototype") return [...common,
    "Make a clickable UI prototype of an app with 3 to 5 screens inside one page. Each screen is a <section data-screen=\"name\">. Show one at a time.",
    "Add a small inline <script> that switches screens when an element with data-go=\"name\" is clicked. No other script.",
    "Use a phone frame 390x844 centered on the page unless the brief asks for desktop.",
  ];
  if (kind === "deck") return [...common,
    `Make a slide deck of ${slides} slides. Each slide is <section class="slide"> exactly 1280px wide and 720px tall, stacked vertically with 24px gap, overflow hidden.`,
    "One idea per slide, large type, a title slide first and a closing slide last. Speaker-friendly, not text-heavy.",
    "Add @media print { .slide { page-break-after: always; margin: 0 } } and @page { size: 1280px 720px; margin: 0 }.",
  ];
  const [w, h] = SIZES[size] || SIZES.square;
  return [...common,
    `Make one social media graphic. The whole design is a single <div id="art"> exactly ${w}px by ${h}px, body margin 0, nothing outside it.`,
    "Bold, scroll-stopping, short copy (headline under 8 words, one supporting line, optional handle or call to action).",
    "Optional subtle CSS animation is allowed (it can be exported as video).",
  ];
}

type Keys = Partial<Record<"anthropic" | "openai" | "openrouter" | "nvidia" | "groq" | "gemini" | "deepseek" | "xai" | "ollama", string>>;
type Msg = { role: "system" | "user" | "assistant"; content: string };

const MAX_TOKENS = 8000;
const TIMEOUT = 110_000;

function env(name: string) {
  return (typeof process !== "undefined" ? process.env[name] || "" : "").trim();
}

function clean(value: string) {
  return String(value || "").trim().replace(/^['"]|['"]$/g, "").replace(/^(bearer|token)\s+/i, "").trim();
}

async function post(url: string, headers: Record<string, string>, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const raw = await response.text();
  let json: Record<string, unknown> = {};
  try { json = raw ? JSON.parse(raw) as Record<string, unknown> : {}; } catch { json = {}; }
  if (!response.ok) {
    const err = json.error as { message?: string } | string | undefined;
    throw new Error((typeof err === "string" ? err : err?.message) || `HTTP ${response.status}`);
  }
  return json;
}

async function openAiStyle(url: string, key: string, model: string, messages: Msg[], extra: Record<string, string> = {}) {
  const json = await post(url, { Authorization: `Bearer ${key}`, ...extra }, { model, messages, max_tokens: MAX_TOKENS, temperature: 0.6 }) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content || "";
}

/** Each route is tried in order until one returns a document. Board keys win over server keys. */
function routes(keys: Keys) {
  const pick = (board: string | undefined, ...names: string[]) => clean(board || "") || names.map(env).find(Boolean) || "";
  const list: { name: string; run: (messages: Msg[]) => Promise<string> }[] = [];
  // Creator order (owner's choice): Google's free models first, then Ollama Cloud, then paid fallbacks.
  // Anthropic is kept for the agents and is deliberately not used here.
  const gemini = pick(keys.gemini, "GOOGLE_AI_STUDIO_API_KEY", "GEMINI_API_KEY");
  if (gemini) list.push({
    name: "Google",
    run: async (messages) => {
      const system = messages.find((row) => row.role === "system")?.content || "";
      const models = (env("DESIGN_MODELS_GOOGLE") || "gemini-3.5-flash,gemini-flash-latest,gemma-4-31b-it").split(",").map((m) => m.trim()).filter(Boolean);
      let last = "";
      for (const model of models) {
        try {
          const json = await post(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(gemini)}`, {}, {
            ...(model.startsWith("gemma") ? {} : { system_instruction: { parts: [{ text: system }] } }),
            contents: messages.filter((row) => row.role !== "system").map((row, index) => ({
              role: row.role === "assistant" ? "model" : "user",
              // Gemma has no system slot, so the rules ride on the first user turn.
              parts: [{ text: model.startsWith("gemma") && index === 0 ? `${system}\n\n${row.content}` : row.content }],
            })),
            generationConfig: { maxOutputTokens: MAX_TOKENS, temperature: 0.6 },
          }) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
          const text = (json.candidates?.[0]?.content?.parts || []).map((part) => part.text || "").join("");
          if (text) return text;
          last = `${model}: empty reply`;
        } catch (error) {
          last = `${model}: ${error instanceof Error ? error.message : "failed"}`;
          // Billing or key problems apply to every model on the key, so stop trying the rest.
          if (/credits|billing|api key not valid|permission/i.test(last)) break;
        }
      }
      throw new Error(last || "no Google model answered");
    },
  });
  const ollama = pick(keys.ollama, "OLLAMA_API_KEY");
  if (ollama) list.push({
    name: "Ollama Cloud",
    run: async (messages) => {
      const reply = await chatOllamaCloud(messages, { key: ollama, model: env("DESIGN_MODEL_OLLAMA"), maxTokens: MAX_TOKENS, timeoutMs: TIMEOUT });
      if (reply.error) throw new Error(reply.error);
      return reply.text;
    },
  });
  const openai = pick(keys.openai, "OPENAI_API_KEY");
  if (openai) list.push({ name: "OpenAI", run: (m) => openAiStyle("https://api.openai.com/v1/chat/completions", openai, env("DESIGN_MODEL_OPENAI") || "gpt-4o-mini", m) });
  const openrouter = pick(keys.openrouter, "OPENROUTER_API_KEY");
  if (openrouter) list.push({ name: "OpenRouter", run: (m) => openAiStyle("https://openrouter.ai/api/v1/chat/completions", openrouter, env("DESIGN_MODEL_OPENROUTER") || "openrouter/auto", m, { "HTTP-Referer": "https://lifeos.ceogps.com", "X-Title": "LifeOS" }) });
  const deepseek = pick(keys.deepseek, "DEEPSEEK_API_KEY");
  if (deepseek) list.push({ name: "DeepSeek", run: (m) => openAiStyle("https://api.deepseek.com/chat/completions", deepseek, "deepseek-chat", m) });
  const groq = pick(keys.groq, "GROQ_API_KEY");
  if (groq) list.push({ name: "Groq", run: (m) => openAiStyle("https://api.groq.com/openai/v1/chat/completions", groq, "llama-3.3-70b-versatile", m) });
  const nvidia = pick(keys.nvidia, "NVIDIA_API_KEY", "NVAPI_KEY");
  if (nvidia) list.push({ name: "NVIDIA", run: (m) => openAiStyle("https://integrate.api.nvidia.com/v1/chat/completions", nvidia, env("DESIGN_MODEL_NVIDIA") || "meta/llama-3.3-70b-instruct", m) });
  const xai = pick(keys.xai, "XAI_API_KEY", "GROK_API_KEY");
  if (xai) list.push({ name: "xAI", run: (m) => openAiStyle("https://api.x.ai/v1/chat/completions", xai, env("DESIGN_MODEL_XAI") || "grok-4.5", m) });
  return list;
}

/** Pulls the HTML document out of a model reply, dropping fences or chatter around it. */
export function extractHtml(reply: string) {
  const text = String(reply || "").replace(/^﻿/, "");
  const fenced = text.match(/```(?:html)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.search(/<!doctype html|<html[\s>]/i);
  if (start < 0) return "";
  const end = body.toLowerCase().lastIndexOf("</html>");
  return (end > start ? body.slice(start, end + 7) : body.slice(start)).trim();
}

export const draftDesign = createServerFn({ method: "POST" })
  .middleware([sessionMiddleware])
  .validator((input: { kind?: string; brief?: string; brand?: string; size?: string; slides?: number; html?: string; change?: string; keys?: Keys }) => {
    const kinds: DesignKind[] = ["landing", "prototype", "deck", "social"];
    const kind = kinds.includes(input?.kind as DesignKind) ? input.kind as DesignKind : "landing";
    const brief = String(input?.brief || "").trim().slice(0, 4000);
    const change = String(input?.change || "").trim().slice(0, 2000);
    const html = String(input?.html || "").slice(0, 120_000);
    if (!brief && !(html && change)) throw new Error("Write a brief first.");
    const keys: Keys = {};
    for (const name of ["anthropic", "openai", "openrouter", "nvidia", "groq", "gemini", "deepseek", "xai", "ollama"] as const) {
      const value = String(input?.keys?.[name] || "").trim().slice(0, 400);
      if (value) keys[name] = value;
    }
    return {
      kind,
      brief,
      brand: String(input?.brand || "").trim().slice(0, 1200),
      size: String(input?.size || "square").slice(0, 20),
      slides: Math.min(16, Math.max(3, Number(input?.slides) || 8)),
      html,
      change,
      keys,
    };
  })
  .handler(async ({ data }) => {
    const system = [
      "You are a senior product designer and front-end developer. You produce finished, production-quality designs as HTML.",
      ...rules(data.kind, data.size, data.slides),
    ].join("\n");
    const brand = data.brand ? `\nBrand notes (colors, fonts, voice): ${data.brand}` : "";
    const messages: Msg[] = data.html && data.change
      ? [
        { role: "system", content: system },
        { role: "user", content: `Here is the current design:\n${data.html}\n\nRevise it: ${data.change}${brand}\nReturn the full updated document.` },
      ]
      : [{ role: "system", content: system }, { role: "user", content: `Brief: ${data.brief}${brand}` }];
    const tried: string[] = [];
    for (const route of routes(data.keys)) {
      try {
        const html = extractHtml(await route.run(messages));
        if (html.length > 200) return { ok: true as const, html, model: route.name, error: "" };
        tried.push(`${route.name}: no HTML came back`);
      } catch (error) {
        const reason = (error instanceof Error ? error.message : "failed")
          .replace(/\b(sk|rk|pk|gsk|xai|nvapi|sk-ant|sk-proj|sk-or)[-_][A-Za-z0-9_*-]{6,}/g, "[key]")
          .replace(/[A-Za-z0-9_-]{40,}/g, "[hidden]")
          .replace(/\s+/g, " ")
          .slice(0, 120);
        tried.push(`${route.name}: ${reason}`);
      }
    }
    return {
      ok: false as const,
      html: "",
      model: "",
      error: tried.length ? `No model finished the design. ${tried.join(" · ")}` : "No AI key is available. Add a Google AI Studio or Ollama Cloud key in Integrations.",
    };
  });
