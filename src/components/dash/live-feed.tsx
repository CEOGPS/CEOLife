import { useEffect, useState } from "react";
import type { Memory } from "./memory";
import { listBriefs, listFeed, logFeed, saveBrief, type BriefRow, type FeedRow } from "@/lib/lifeos/truth";

const QUESTIONS: Record<string, string> = {
  money: "Give three money tips for today. No invented balances, account names, or returns. Under 80 words.",
  hacks: "Give three practical life hacks for today. No invented personal facts. Under 80 words.",
  insights: "Give three short operating insights for a founder today. No invented metrics. Under 80 words.",
};

const dayKey = () => new Date().toISOString().slice(0, 10);
let flight: Promise<{ briefs: BriefRow[]; error: string }> | null = null;

function loadBriefs() {
  if (!flight) flight = listBriefs().finally(() => { flight = null; });
  return flight;
}

export function DailyKind({ data, kind }: { data: Memory; kind: "money" | "hacks" | "insights" }) {
  const [text, setText] = useState("");
  const [source, setSource] = useState("");
  const [error, setError] = useState("");

  async function fill(refresh: boolean) {
    const saved = await loadBriefs();
    const row = saved.briefs.find((item) => item.kind === kind);
    if (row && !refresh) {
      setText(row.body);
      setSource(row.source);
      setError(saved.error);
      return;
    }
    if (!refresh && sessionStorage.getItem(`lifeos.daily.${dayKey()}.${kind}`)) {
      setText(row?.body || saved.error || "No brief is stored for today.");
      setError(saved.error);
      return;
    }
    sessionStorage.setItem(`lifeos.daily.${dayKey()}.${kind}`, "1");
    const endpoint = data.keys.find((item) => item.name === "Ollama (local)")?.value || "";
    const { chatOllama } = await import("@/lib/lifeos/ollama");
    const text = await chatOllama([
      { role: "system", content: "You are Erebus. Reason briefly. Do not invent balances, account names, or metrics." },
      { role: "user", content: QUESTIONS[kind] },
    ], endpoint);
    const body = text.trim() || "Ollama did not answer. No paid model was called.";
    const from = text.trim() ? "ollama" : "error";
    const stored = await saveBrief(kind, body, from);
    setText(body);
    setSource(from);
    setError(stored.error);
    if (!stored.error) void logFeed("daily", from, `Daily ${kind}`, body.slice(0, 180));
  }

  useEffect(() => { void fill(false); }, [kind]);

  return (
    <div>
      <p className="whitespace-pre-wrap text-sm">{text || "Asking for today's brief…"}</p>
      <p className="mt-1 text-[11px] text-white/40">{source ? `Source · ${source}` : ""}{error ? ` ${error}` : ""}</p>
      {kind === "money" ? <button type="button" className="quiet mt-2" onClick={() => { flight = null; void fill(true); }}>Refresh today</button> : null}
    </div>
  );
}

export function ActivityFeed() {
  const [events, setEvents] = useState<FeedRow[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    void listFeed().then((result) => {
      setEvents(result.events);
      setError(result.error);
    });
  }, []);
  return (
    <div>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {events.map((row) => (
        <p key={row.id} className="min-h-11 text-sm">
          {row.title} <span className="accent-purple">{row.source}</span>
          {row.body ? <span className="block text-xs text-white/45">{row.body}</span> : null}
        </p>
      ))}
      {!events.length && !error ? <p className="text-sm text-muted">No activity is stored yet.</p> : null}
    </div>
  );
}
