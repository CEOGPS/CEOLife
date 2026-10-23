import { useMemo, useState, type ReactNode } from "react";
import { newId, type Memory } from "./memory";
import { fmtPhone } from "./format";

type Update = (recipe: (prev: Memory) => Memory) => void;
const field = "h-8 w-full rounded-full border border-line bg-black/40 px-3 text-sm";
const SOURCES = ["Google", "Bing", "DuckDuckGo", "Yahoo", "Wikipedia", "Reddit", "X", "LinkedIn", "Facebook", "Instagram", "YouTube", "TikTok", "Nextdoor", "Craigslist", "Yelp", "BBB", "Angi", "Thumbtack", "Google Business", "Apple Maps", "Bing Places", "Whitepages", "TruePeopleSearch", "FastPeopleSearch", "Spokeo", "Hunter", "Have I Been Pwned", "TinEye", "Google Lens", "Yandex", "GitHub", "Stack Overflow", "Product Hunt", "Crunchbase", "OpenCorporates", "SEC EDGAR", "CourtListener", "Google Patents", "Indeed", "Glassdoor", "Zillow", "Redfin", "Realtor", "Apartments", "LoopNet", "Census", "Data.gov", "OpenStreetMap", "Weather.gov"];

function Box({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="module-card">
      <div className="border-b border-white/10 px-4 py-3"><h2 className="module-title">{title}</h2></div>
      <div className="p-4">{children}</div>
    </section>
  );
}

const AGENTS = /^(you|user|nyx|erebus|kranos|nova)$/i;
const PLATFORMS = ["All", "SMS", "Google Voice", "Messenger", "Instagram", "WhatsApp", "Telegram", "Email"] as const;

function chatPartner(line: { who: string; text: string; mine: boolean; platform?: string }) {
  if (line.platform === "erebus" || line.platform === "kranos") return null;
  if (AGENTS.test(line.who) || line.who.includes("·")) return null;
  return line.who;
}

function chatBody(line: { who: string; text: string; mine: boolean }) {
  if (line.mine) {
    const match = /^([^:]{1,40}):\s([\s\S]*)$/.exec(line.text);
    if (match) return match[2];
  }
  return line.text;
}

function showPlatform(raw: string) {
  if (raw === "telegram") return "Telegram";
  if (raw === "messenger") return "Messenger";
  if (raw === "instagram") return "Instagram";
  if (raw === "voice") return "Google Voice";
  if (raw === "sms") return "SMS";
  if (raw === "email") return "Email";
  return raw || "SMS";
}

function sendPlatform(label: string) {
  if (label === "Telegram") return "telegram";
  if (label === "Messenger") return "messenger";
  if (label === "Instagram") return "instagram";
  if (label === "Google Voice") return "voice";
  if (label === "Email") return "email";
  if (label === "WhatsApp") return "whatsapp";
  return "sms";
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || "").join("") || "?";
}

export function MessagesDesk({ data, update }: { data: Memory; update: Update }) {
  const [who, setWho] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>("All");
  const [picking, setPicking] = useState(false);
  const [whoId, setWhoId] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const needle = q.trim().toLowerCase();
  const conversations = useMemo(() => {
    const map = new Map<string, { last: string; platform: string }>();
    for (const line of data.thread) {
      const name = chatPartner(line);
      if (!name) continue;
      const where = line.platform || "SMS";
      if (platform !== "All" && where !== platform) continue;
      map.set(name, { last: chatBody(line), platform: where });
    }
    if (who && !map.has(who)) map.set(who, { last: "New conversation", platform: platform === "All" ? "SMS" : platform });
    return [...map.entries()]
      .map(([name, row]) => ({ name, ...row }))
      .filter((row) => !needle || row.name.toLowerCase().includes(needle) || row.last.toLowerCase().includes(needle));
  }, [data.thread, who, needle, platform]);
  const person = data.contacts.find((row) => row.id === whoId) || data.contacts.find((row) => row.name === who);
  const lines = data.thread.filter((line) => chatPartner(line) === who);
  const picks = useMemo(() => {
    if (!needle) return [];
    return data.contacts.filter((row) => {
      const hay = `${row.name} ${row.firstName} ${row.lastName} ${row.company} ${row.email} ${row.phone} ${(row.emails || []).join(" ")} ${(row.phones || []).join(" ")}`.toLowerCase();
      return hay.includes(needle);
    }).slice(0, 20);
  }, [data.contacts, needle]);

  function open(name: string, id = "") {
    setWho(name);
    setWhoId(id);
    setPicking(false);
    setQ("");
    setNote("");
  }

  async function pull() {
    setBusy("pull");
    setNote("Pulling…");
    try {
      const { readOauth, freshToken } = await import("@/lib/lifeos/oauth");
      const { pullChats } = await import("@/lib/lifeos/sync");
      const facebook = readOauth().some((row) => row.provider === "facebook") ? await freshToken("facebook") : "";
      const result = await pullChats({ data: { facebook } });
      update((prev) => {
        const have = new Set(prev.thread.map((row) => row.id));
        const fresh = result.messages.filter((row) => row.id && !have.has(row.id)).map((row) => ({
          id: row.id,
          who: row.who,
          text: row.text,
          mine: row.mine,
          platform: showPlatform(row.platform),
        }));
        return fresh.length ? { ...prev, thread: [...prev.thread, ...fresh] } : prev;
      });
      setNote(result.text || (result.messages.length ? "Pulled." : "Nothing new."));
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Pull did not answer.");
    } finally {
      setBusy("");
    }
  }

  async function send() {
    const body = text.trim();
    if (!body || !who) return;
    const latest = [...data.thread].reverse().find((line) => chatPartner(line) === who);
    const label = latest?.platform || (platform === "All" ? "" : platform);
    const provider = sendPlatform(label);
    if (provider === "whatsapp" || !label) {
      setNote(provider === "whatsapp" ? "WhatsApp opens in its own app." : "Pull the chat first, or pick SMS or Email.");
      return;
    }
    const phone = (person?.phone || person?.phones?.find((item) => /\d/.test(item)) || who).replace(/\D/g, "").slice(-10);
    const route = provider === "sms" ? phone : provider === "email" ? (person?.email || who) : (latest?.id || "");
    setBusy("send");
    setNote("Sending…");
    try {
      const { readOauth, freshToken } = await import("@/lib/lifeos/oauth");
      const { sendChat } = await import("@/lib/lifeos/sync");
      const facebook = readOauth().some((row) => row.provider === "facebook") ? await freshToken("facebook") : "";
      const result = await sendChat({ data: { platform: provider, route, text: body, facebook } });
      if (!result.ok) {
        setNote(result.error || "Not sent.");
        return;
      }
      update((prev) => ({
        ...prev,
        thread: [...prev.thread, { id: result.id || newId(), who, text: body, mine: true, platform: label }],
      }));
      setText("");
      setNote("Sent.");
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Not sent.");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="module-card grid min-h-[34rem] overflow-hidden lg:grid-cols-[18rem_1fr]">
      <aside className="flex min-h-0 flex-col border-b border-white/10 lg:border-r lg:border-b-0">
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-3">
          <h2 className="module-title">Chats</h2>
          <button type="button" className={`ml-auto quiet ${busy === "pull" ? "is-busy" : ""}`} aria-busy={busy === "pull"} disabled={busy === "pull"} onClick={() => void pull()}>{busy === "pull" ? "Pulling" : "Pull"}</button>
          <button type="button" className="bg-blue" onClick={() => setPicking((value) => !value)}>{picking ? "Close" : "New"}</button>
        </div>
        <label className="px-3 py-2">
          <input className={field} value={q} placeholder="Search chats, contacts, CRM" onChange={(event) => { setQ(event.target.value); setPicking(true); }} />
        </label>
        <div className="flex gap-2 overflow-x-auto px-3 pb-2">
          {PLATFORMS.map((item) => (
            <button key={item} type="button" className={`quiet shrink-0 ${platform === item ? "is-on" : ""}`} onClick={() => setPlatform(item)}>{item}</button>
          ))}
        </div>
        {picking || needle ? (
          <ul className="max-h-52 overflow-y-auto border-b border-white/10 px-2 pb-2">
            {picks.map((row) => (
              <li key={row.id}>
                <button type="button" className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-white/5" onClick={() => open(row.name || row.email || row.phone, row.id)}>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-xs">{initials(row.name || row.email || "?")}</span>
                  <span className="min-w-0">
                    <span className="block truncate">{row.name || "No name"}</span>
                    <span className="block truncate text-[11px] text-white/40">{row.kind === "crm" ? "CRM" : "Contact"} · {[fmtPhone(row.phone), row.email, row.company].filter(Boolean).join(" · ") || "No phone or email"}</span>
                  </span>
                </button>
              </li>
            ))}
            {needle && picks.length === 0 ? <li className="px-2 py-2 text-sm text-white/40">No contacts or CRM match.</li> : null}
            {!needle && picking ? <li className="px-2 py-2 text-[11px] text-white/35">Type a name, phone, email, or company.</li> : null}
          </ul>
        ) : null}
        <ul className="min-h-0 flex-1 overflow-y-auto p-2">
          {conversations.map((row) => (
            <li key={row.name}>
              <button type="button" className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left ${who === row.name ? "bg-[oklch(0.68_0.15_230/16%)]" : "hover:bg-white/5"}`} onClick={() => open(row.name)}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-black/40 text-xs text-blue-2">{initials(row.name)}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm">{row.name}</span>
                  <span className="block truncate text-xs text-white/40">{row.platform} · {row.last}</span>
                </span>
              </button>
            </li>
          ))}
          {conversations.length === 0 ? <li className="px-2 py-6 text-sm text-white/40">No conversations yet. Start one with New.</li> : null}
        </ul>
      </aside>
      <div className="flex min-h-[24rem] flex-col">
        <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          {who ? (
            <>
              <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-white/10 bg-black/40 text-sm text-blue-2">
                {person?.avatar ? <img src={person.avatar} alt="" className="h-full w-full object-cover" /> : initials(who)}
              </span>
              <span>
                <span className="block text-sm">{who}</span>
                <span className="block text-xs text-white/40">{person ? [platform === "All" ? "SMS" : platform, fmtPhone(person.phone || person.phones?.find((item) => /\d/.test(item)) || "") || person.email].filter(Boolean).join(" · ") : "No saved contact"}</span>
              </span>
              <span className="ml-auto flex gap-3">
                <a className="quiet is-on" href={(() => { const number = (person?.phone || person?.phones?.find((item) => /\d/.test(item)) || "").replace(/\D/g, ""); return number ? `tel:${number}` : undefined; })()}>Call</a>
                <a className="quiet is-on" href={(() => { const number = (person?.phone || person?.phones?.find((item) => /\d/.test(item)) || "").replace(/\D/g, ""); const face = number || person?.email || ""; return face ? `facetime:${face}` : undefined; })()}>FaceTime</a>
              </span>
            </>
          ) : <h2 className="module-title">Messages</h2>}
        </header>
        <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-4">
          {who ? lines.map((row) => (
            <li key={row.id} className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${row.mine ? "ml-auto bg-[rgba(76,29,149,0.45)]" : "bg-white/5"}`}>{chatBody(row)}</li>
          )) : <li className="m-auto text-sm text-white/40">Choose a conversation. Contacts stay in Contacts until you message them.</li>}
          {who && lines.length === 0 ? <li className="m-auto text-sm text-white/40">No messages with {who} yet.</li> : null}
        </ul>
        <form className="sticky bottom-0 z-10 mt-auto flex shrink-0 items-center gap-2 border-t border-white/10 bg-black/80 p-3" onSubmit={(event) => { event.preventDefault(); void send(); }}>
          <input className={field} value={text} placeholder={who ? `Message ${who}` : "Choose a conversation"} disabled={!who || busy === "send"} onChange={(event) => setText(event.target.value)} />
          <button type="submit" className="msg-send" aria-busy={busy === "send"} disabled={!who || busy === "send" || !text.trim()}>
            {busy === "send" ? <span aria-hidden="true" className="msg-spin" /> : null}
            {busy === "send" ? "Sending" : "Send"}
          </button>
        </form>
        {note ? <p className="px-3 pb-3 text-xs text-white/50">{note}</p> : null}
      </div>
    </section>
  );
}

export function SearchDesk({ data, update }: { data: Memory; update: Update }) {
  const [q, setQ] = useState(data.query);
  const [kind, setKind] = useState<"web" | "phone" | "email" | "image">("web");
  const [live, setLive] = useState<{ title: string; url: string; snippet?: string }[]>([]);
  const [note, setNote] = useState("");
  const hits = useMemo(() => {
    const needle = q.toLowerCase();
    if (!needle) return [];
    return [
      ...data.notes.map((row) => `Note · ${row.title}`),
      ...data.contacts.map((row) => `Contact · ${row.name}`),
      ...data.leads.map((row) => `Lead · ${row.name}`),
      ...data.tasks.map((row) => `Task · ${row.title}`),
      ...data.mail.map((row) => `Email · ${row.title}`),
    ].filter((row) => row.toLowerCase().includes(needle)).slice(0, 8);
  }, [data, q]);
  const query = kind === "phone" ? fmtPhone(q) || q : q;
  const links = kind === "phone"
    ? [["Whitepages", `https://www.whitepages.com/phone/${q.replace(/\D/g, "")}`], ["TruePeopleSearch", `https://www.truepeoplesearch.com/results?phoneno=${encodeURIComponent(q)}`]]
    : kind === "email"
      ? [["Google", `https://www.google.com/search?q=${encodeURIComponent(q)}`], ["Have I Been Pwned", `https://haveibeenpwned.com/account/${encodeURIComponent(q)}`]]
      : kind === "image"
        ? [["Google Lens", `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(q)}`], ["TinEye", `https://tineye.com/search?url=${encodeURIComponent(q)}`], ["Yandex", `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(q)}`]]
        : SOURCES.slice(0, 12).map((name) => [name, `https://duckduckgo.com/?q=${encodeURIComponent(`${query} site:${name.replaceAll(" ", "").toLowerCase()}`)}`] as [string, string]);
  return (
    <Box title="OmniSearch">
      <form className="flex flex-wrap gap-2" onSubmit={(event) => {
        event.preventDefault();
        update((prev) => ({ ...prev, query }));
        setNote("Searching…");
        const base = data.keys.find((row) => row.name === "SearXNG")?.value || "http://127.0.0.1:8888";
        void import("@/lib/lifeos/sync").then(async ({ lookup, reverseImage }) => {
          const { logFeed } = await import("@/lib/lifeos/truth");
          if (kind === "image") {
            const reversed = await reverseImage({ data: { url: query } });
            setLive(reversed.hits);
            const summary = reversed.note || (reversed.hits.length ? `${reversed.hits.length} reverse-image hits.` : "No reverse-image hit came back.");
            setNote(summary);
            void logFeed("omnisearch", reversed.hits.length ? "action" : "error", "Reverse image", summary);
            return;
          }
          const result = await lookup({ data: { query, kind, key: data.keys.find((row) => row.name === "Dogpile")?.value || "", base } });
          setLive(result.hits);
          const summary = result.note || (result.hits.length ? `${result.hits.length} hits.` : "No live results.");
          setNote(summary);
          void logFeed("omnisearch", result.hits.length ? "action" : "error", `Search ${kind}`, summary);
        }).catch((error) => {
          const summary = error instanceof Error ? error.message : "Search did not answer.";
          setNote(summary);
          void import("@/lib/lifeos/truth").then(({ logFeed }) => logFeed("omnisearch", "error", `Search ${kind}`, summary));
        });
      }}>
        <input className={field} value={q} placeholder={kind === "image" ? "Image URL" : kind === "phone" ? "Phone" : kind === "email" ? "Email" : "Search"} onChange={(event) => setQ(kind === "phone" ? fmtPhone(event.target.value) : event.target.value)} />
        <button type="submit" className={`bg-blue ${note === "Searching…" ? "is-busy" : ""}`} aria-busy={note === "Searching…"} disabled={note === "Searching…"}>Search</button>
      </form>
      <div className="dock-bar mt-3 flex gap-3">
        {(["web", "phone", "email", "image"] as const).map((item) => <button key={item} type="button" className={kind === item ? "on" : ""} onClick={() => setKind(item)}>{item}</button>)}
      </div>
      <ul className="mt-3">{hits.map((row) => <li key={row} className="py-1 text-sm">{row}</li>)}</ul>
      <ul className="mt-2">{live.map((row) => <li key={row.url} className="py-1 text-sm"><a className="text-blue-2" href={row.url} target="_blank" rel="noreferrer">{row.title}</a>{row.snippet ? <span className="block text-xs text-white/45">{row.snippet}</span> : null}</li>)}</ul>
      {note ? <p className="mt-2 text-sm text-white/60">{note}</p> : null}
      {kind === "web" ? <div className="mt-3 flex flex-wrap gap-2">
        {links.map(([label, href]) => <a key={label} className="text-sm text-blue-2" href={href} target="_blank" rel="noreferrer">{label}</a>)}
      </div> : null}
      <p className="mt-3 text-xs text-white/40">SearXNG on port 8888. Brave is off. The dashboard already uses port 8080.</p>
    </Box>
  );
}

export { MapsDesk } from "./maps-desk";
export { OfficeDesk } from "./office-desk";
export { JournalDesk } from "./journal-desk";
export { MusicDesk } from "./music-desk";
export { MediaDesk } from "./media-desk";
export { ProjectsDesk } from "./projects-desk";
export { HubDesk } from "./ai-hub-desk";
export { TerminalDesk } from "./terminal-desk";
export { SimDesk } from "./sim-desk";
export { VaultDesk } from "./vault-desk";
