import type { PlannerAct } from "@/components/dash/erebus-abilities";

const LINE = /^(BROWSER|SITE|SOCIAL|EMAIL|CODE|BLOG|IMAGE|VIDEO|MUSIC):\s*(.*)$/i;

export function agentToolCatalog() {
  return [
    "Extra tools. Emit one line and nothing else. Browser, site, social, email, and code wait for approved=yes on that same line.",
    "BROWSER: url=https://example.com approved=yes",
    "SITE: path=/panel/home note=what should change approved=yes",
    "SOCIAL: text=the post approved=yes",
    "EMAIL: to=person@example.com subject=Hello body=the note approved=yes",
    "CODE: path=src/example.ts note=the change approved=yes",
    "BLOG: title=the title body=the draft approved=yes",
    "IMAGE: prompt=what to draw approved=yes",
    "VIDEO: prompt=the motion approved=yes",
    "MUSIC: prompt=the song approved=yes",
    "Hermes is the files and terminal tool. Qwen is the local image and video tool. Name them when that is the right tool. Do not claim they ran unless a tool result says so.",
  ].join("\n");
}

function fields(spec: string) {
  const out: Record<string, string> = {};
  for (const match of spec.matchAll(/(\w+)=([^=]+?)(?=\s+\w+=|$)/g)) out[match[1].toLowerCase()] = match[2].trim();
  return out;
}

function plain(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1200);
}

export async function runAgentAct(line: string): Promise<PlannerAct | null> {
  const match = line.trim().match(LINE);
  if (!match) return null;
  const kind = match[1].toUpperCase();
  const spec = fields(match[2]);
  const approved = spec.approved === "yes";
  if (!approved) return { text: `Approval required. Send the same ${kind} line with approved=yes. Nothing ran.` };

  if (kind === "BROWSER") {
    const url = spec.url || "";
    if (!/^https:\/\//i.test(url)) return { text: "Browser needs an https URL. Nothing was opened." };
    try {
      const response = await fetch(url, { headers: { "User-Agent": "LifeOS/1", Accept: "text/html,application/json" }, signal: AbortSignal.timeout(8000), redirect: "follow" });
      const raw = await response.text();
      const title = raw.match(/<title[^>]*>([^<]*)/i)?.[1]?.trim() || "";
      return { text: response.ok ? `Opened ${response.url || url}. HTTP ${response.status}. ${title} ${plain(raw)}`.slice(0, 1500) : `The page refused the browser (HTTP ${response.status}).` };
    } catch (error) {
      return { text: error instanceof Error ? error.message : "The browser did not open that page." };
    }
  }

  if (kind === "SITE") {
    const path = spec.path || "";
    const note = spec.note || "";
    if (!path || !note) return { text: "Site change needs path= and note=. Nothing was changed." };
    return { text: `Recorded a site change for ${path.slice(0, 120)}: ${note.slice(0, 400)}. A person still has to apply it.`, noteTitle: "Site change", noteBody: `${path}\n${note}`.slice(0, 2000) };
  }

  if (kind === "SOCIAL") {
    const text = spec.text || "";
    if (!text) return { text: "Social needs text=. Nothing was posted." };
    return { text: "No connected social account accepted this post from the agent. Open Social Link and post it there. Nothing was published.", noteTitle: "Social draft", noteBody: text.slice(0, 2000) };
  }

  if (kind === "EMAIL") {
    const to = spec.to || "";
    const subject = spec.subject || "";
    const body = spec.body || "";
    if (!to.includes("@") || !subject) return { text: "Email needs to= and subject=. Nothing was sent." };
    return { text: `Draft recorded for ${to}. Sending needs a connected Nylas grant. Nothing was sent.`, draft: { to, subject: subject.slice(0, 180), body: body.slice(0, 4000) } };
  }

  if (kind === "CODE" || kind === "BLOG") {
    const title = kind === "BLOG" ? spec.title || "Blog draft" : spec.path || "Code note";
    const body = spec.note || spec.body || "";
    if (!body) return { text: `${kind} needs the text. Nothing was written.` };
    return { text: `${kind === "BLOG" ? "Blog draft" : "Code note"} recorded. The files were not edited.`, noteTitle: title.slice(0, 120), noteBody: body.slice(0, 4000) };
  }

  if (kind === "IMAGE") {
    const prompt = spec.prompt || "";
    if (!prompt) return { text: "Image needs prompt=. Nothing was generated." };
    try {
      const response = await fetch(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.slice(0, 300))}?nologo=true&width=1024&height=1024`, { signal: AbortSignal.timeout(20000), redirect: "follow" });
      if (!response.ok) return { text: `The free image host refused the prompt (HTTP ${response.status}).` };
      return { text: `Image is at ${response.url}` };
    } catch (error) {
      return { text: error instanceof Error ? error.message : "The image host did not answer." };
    }
  }

  if (kind === "VIDEO") return { text: "No free video engine is configured for this turn. Music Einstein and Creator call Luma or Workers when that key is present. Nothing was rendered." };
  if (kind === "MUSIC") return { text: "No free song engine is configured for this turn. Music Einstein uses ElevenLabs or ACE-Step when that key is present. Nothing was generated." };
  return { text: "That tool did not run." };
}
