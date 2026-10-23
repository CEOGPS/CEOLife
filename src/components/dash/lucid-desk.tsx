import { useEffect, useState } from "react";
import { EngineBar } from "./engine-bar";
import { LucidProjects } from "./lucid-projects";
import { newId, type Memory } from "./memory";

type Update = (recipe: (prev: Memory) => Memory) => void;
type ToolId = "content" | "email" | "listings" | "social" | "leads" | "assets";
type Tab = "find" | "runs" | "tools" | "accounts" | "log" | "projects";
type Step = { id: string; label: string; owner: "lucid" | "you"; done: boolean; output: string };
type Idea = { id: string; name: string; summary: string; effort: string; range: string; tools: ToolId[]; account: string; risks: string; steps: Step[] };
type Run = { id: string; name: string; status: "needs accounts" | "running" | "waiting" | "paused" | "stopped" | "done"; steps: Step[]; earned: string; updated: string };
type Account = { id: string; runId: string; runName: string; emailReady: boolean; depositReady: boolean };
type Entry = { id: string; at: string; text: string };
type Store = { tools: ToolId[]; ideas: Idea[]; runs: Run[]; accounts: Account[]; log: Entry[] };

const KEY = "lifeos.lucid.desk";
const TOOLS: { id: ToolId; label: string; does: string }[] = [
  { id: "content", label: "Content", does: "Writes the product, page, or script" },
  { id: "email", label: "Email", does: "Writes mail. It does not send it" },
  { id: "listings", label: "Listings", does: "Writes the shop or profile text" },
  { id: "social", label: "Social", does: "Writes posts. It does not publish them" },
  { id: "leads", label: "Leads", does: "Builds the searches and the reply" },
  { id: "assets", label: "Files", does: "Turns one file into a listing" },
];
const TABS: [Tab, string][] = [["find", "Find"], ["projects", "Projects"], ["runs", "Runs"], ["tools", "Tool access"], ["accounts", "Accounts"], ["log", "Activity"]];

function empty(): Store {
  return { tools: [], ideas: [], runs: [], accounts: [], log: [] };
}

function load(board: Memory["ideas"]): Store {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null") as Store | null;
    if (raw && (raw.ideas?.length || raw.runs?.length || raw.log?.length || raw.tools?.length)) return { ...empty(), ...raw };
  } catch { /* seed from the board */ }
  return {
    ...empty(),
    ideas: board.filter((row) => row.status === "new").map((row) => ({
      id: row.id, name: row.title, summary: row.note || "Saved on the board.", effort: row.effort || "Low", range: "Only the amount you type in later.", tools: ["content"], account: row.source || "An email and a deposit account you set up", risks: row.log || "Do not start until both accounts are ready.",
      steps: [{ id: "write", label: "Write the offer", owner: "lucid", done: false, output: row.note || row.title }, { id: "you", label: "Set up the email and the deposit account", owner: "you", done: false, output: "" }],
    })),
  };
}

export function LucidDesk({ data, update }: { data: Memory; update: Update }) {
  const [tab, setTab] = useState<Tab>("find");
  const [store, setStore] = useState<Store>(() => load(data.ideas));
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [searching, setSearching] = useState(false);
  const [note, setNote] = useState("");
  const logged = store.runs.reduce((sum, run) => sum + (Number(String(run.earned).replace(/[^0-9.]/g, "")) || 0), 0);

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(store)); }, [store]);

  const set = (key: string, value: string) => setDraft((prev) => ({ ...prev, [key]: value }));
  const missing = (tools: ToolId[]) => tools.filter((tool) => !store.tools.includes(tool));

  async function find() {
    if (searching) return;
    setSearching(true);
    const subject = (draft.niche || "").trim().toLowerCase();
    try {
      const { findIdeas } = await import("@/lib/lifeos/sync");
      const { logFeed } = await import("@/lib/lifeos/truth");
      const result = await findIdeas();
      const found = (result.ideas || []).filter((row) => !subject || `${row.title} ${row.source}`.toLowerCase().includes(subject));
      const ideas: Idea[] = found.map((row) => ({
        id: newId(),
        name: row.title,
        summary: `Public post from ${row.source}.`,
        effort: row.effort === "low" ? "Low" : "Medium",
        range: "No payout is known until you read the post.",
        tools: ["leads"],
        account: row.url,
        risks: "This is someone else's post. It is not an offer and it is not income.",
        steps: [
          { id: "read", label: "Open the post and read it", owner: "you", done: false, output: "" },
          { id: "decide", label: "Decide whether it fits", owner: "you", done: false, output: "" },
        ],
      }));
      const summary = ideas.length ? `${ideas.length} public posts.` : subject ? `No public posts matched ${draft.niche}.` : "The public sources returned no posts.";
      setNote(summary);
      setStore((current) => ({ ...current, ideas, log: [{ id: newId(), at: new Date().toISOString(), text: summary }, ...current.log].slice(0, 80) }));
      void logFeed("lucid", ideas.length ? "action" : "error", "Lucid search", summary);
    } catch (error) {
      const summary = error instanceof Error ? error.message : "Lucid search did not answer.";
      setNote(summary);
      setStore((current) => ({ ...current, ideas: [], log: [{ id: newId(), at: new Date().toISOString(), text: summary }, ...current.log].slice(0, 80) }));
      void import("@/lib/lifeos/truth").then(({ logFeed }) => logFeed("lucid", "error", "Lucid search", summary));
    } finally {
      setSearching(false);
    }
  }

  function approve(idea: Idea) {
    if (missing(idea.tools).length) return;
    const runId = newId();
    setStore((current) => ({
      ...current,
      ideas: current.ideas.filter((item) => item.id !== idea.id),
      runs: [{ id: runId, name: idea.name, status: "needs accounts", steps: idea.steps.map((step) => ({ ...step })), earned: "", updated: new Date().toISOString() }, ...current.runs],
      accounts: [{ id: newId(), runId, runName: idea.name, emailReady: false, depositReady: false }, ...current.accounts],
      log: [{ id: newId(), at: new Date().toISOString(), text: `You approved “${idea.name}”. Set up the email and deposit account, then Lucid will run it.` }, ...current.log],
    }));
    update((prev) => ({
      ...prev,
      ideas: [{ id: runId, title: idea.name, note: idea.summary, approved: true, status: "approved", source: idea.account, effort: "low", email: "", funding: "", log: idea.risks }, ...prev.ideas.filter((row) => row.title !== idea.name)],
      notifs: [{ id: newId(), text: `Set up accounts for ${idea.name}`, source: "Lucid", seen: false }, ...prev.notifs],
    }));
    setTab("accounts");
  }

  return (
    <div className="grid gap-3">
      <p className="max-w-3xl text-sm text-white/50">Find lists public posts from Hacker News and Reddit. Projects and budget lines are the ones stored for this account. Nothing here is a generated offer.</p>
      <EngineBar panel="Lucid" data={data} update={update} />
      <div className="flex flex-wrap gap-3">
        {TABS.map(([id, label]) => <button key={id} type="button" className={`quiet ${tab === id ? "is-on" : ""}`} onClick={() => setTab(id)}>{label}</button>)}
      </div>
      {tab === "projects" ? <LucidProjects /> : null}
      {tab === "find" ? (
        <section className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <input className="h-8 min-w-56 flex-1 rounded-full border border-line bg-black/40 px-3 text-sm" placeholder="Filter the public posts" value={draft.niche || ""} onChange={(event) => set("niche", event.target.value)} />
            <button type="button" className="quiet is-on" disabled={searching} onClick={() => void find()}>{searching ? "Searching" : "Find posts"}</button>
          </div>
          {note ? <p className="text-sm text-white/60">{note}</p> : null}
          <div className="grid gap-3 md:grid-cols-2">
            {store.ideas.map((idea) => {
              const need = missing(idea.tools);
              return (
                <article key={idea.id} className="module-card p-3 text-sm">
                  <h2 className="text-base">{idea.name}</h2>
                  <p className="mt-1 text-white/70">{idea.summary}</p>
                  <p className="mt-2 text-white/45">{idea.effort}</p>
                  <p className="text-white/45">{idea.range}</p>
                  <p className="mt-2">{idea.account.startsWith("http") ? <a className="text-blue-2" href={idea.account} target="_blank" rel="noreferrer">Open the post</a> : idea.account}</p>
                  <p>Tools: {idea.tools.join(", ")}</p>
                  <p className="text-orange-200/80">Risk: {idea.risks}</p>
                  {need.length ? <p className="mt-2 text-orange-200">Turn on {need.join(", ")} in Tool access first.</p> : null}
                  <div className="mt-3 flex gap-3">
                    <button type="button" className="quiet is-on" disabled={need.length > 0} onClick={() => approve(idea)}>Approve</button>
                    <button type="button" className="link-remove" onClick={() => setStore((current) => ({ ...current, ideas: current.ideas.filter((item) => item.id !== idea.id) }))}>Pass</button>
                  </div>
                </article>
              );
            })}
          </div>
          {!store.ideas.length && !note ? <p className="text-sm text-white/40">No public posts on screen. Run a search.</p> : null}
        </section>
      ) : null}
      {tab === "runs" ? (
        <section className="grid gap-3 text-sm">
          <p className="text-white/50">Paid amount you have typed in: ${logged.toFixed(2)}.</p>
          {store.runs.map((run) => (
            <article key={run.id} className="module-card p-3">
              <div className="flex justify-between gap-2"><h2 className="text-base">{run.name}</h2><span className="text-white/45">{run.status === "needs accounts" ? "Waiting on your email and deposit setup" : run.status}</span></div>
              {run.steps.map((step) => (
                <div key={step.id} className="mt-2 rounded-lg border border-white/10 p-2">
                  <div>{step.done ? "Done" : "Open"} · {step.owner === "lucid" ? "Lucid" : "You"} · {step.label}</div>
                  {step.done && step.output ? <pre className="mt-1 whitespace-pre-wrap text-white/70">{step.output}</pre> : null}
                  {!step.done && step.owner === "you" && run.status !== "stopped" ? (
                    <button type="button" className="quiet is-on mt-2" onClick={() => setStore((current) => ({
                      ...current,
                      runs: current.runs.map((item) => {
                        if (item.id !== run.id) return item;
                        const steps = item.steps.map((row) => row.id === step.id ? { ...row, done: true } : row);
                        const lucidLeft = steps.some((row) => !row.done && row.owner === "lucid");
                        const youLeft = steps.some((row) => !row.done && row.owner === "you");
                        return { ...item, steps, status: lucidLeft ? "running" : youLeft ? "waiting" : "done", updated: new Date().toISOString() };
                      }),
                      log: [{ id: newId(), at: new Date().toISOString(), text: `You finished “${step.label}”` }, ...current.log],
                    }))}>I did this</button>
                  ) : null}
                </div>
              ))}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" className="quiet" onClick={() => setStore((current) => ({ ...current, runs: current.runs.map((item) => item.id === run.id ? { ...item, status: item.status === "paused" || item.status === "stopped" ? "running" : "paused" } : item) }))}>{run.status === "paused" || run.status === "stopped" ? "Resume" : "Pause"}</button>
                <button type="button" className="link-remove" onClick={() => setStore((current) => ({ ...current, runs: current.runs.map((item) => item.id === run.id ? { ...item, status: "stopped" } : item) }))}>Stop</button>
                <input className="h-8 rounded-full border border-line bg-black/40 px-3 text-sm" placeholder="What got paid" value={draft[`earn-${run.id}`] ?? run.earned} onChange={(event) => set(`earn-${run.id}`, event.target.value)} />
                <button type="button" className="quiet is-on" onClick={() => setStore((current) => ({ ...current, runs: current.runs.map((item) => item.id === run.id ? { ...item, earned: draft[`earn-${run.id}`] ?? item.earned } : item) }))}>Save amount</button>
              </div>
            </article>
          ))}
          {!store.runs.length ? <p className="text-white/40">Approve a found idea and it will show up here.</p> : null}
        </section>
      ) : null}
      {tab === "tools" ? (
        <section className="grid gap-2 text-sm">
          {TOOLS.map((tool) => (
            <label key={tool.id} className="module-card flex items-center gap-3 p-3">
              <input type="checkbox" checked={store.tools.includes(tool.id)} onChange={(event) => setStore((current) => ({ ...current, tools: event.target.checked ? [...current.tools, tool.id] : current.tools.filter((id) => id !== tool.id) }))} />
              <span><span className="block">{tool.label}</span><span className="block text-white/45">{tool.does}</span></span>
            </label>
          ))}
        </section>
      ) : null}
      {tab === "accounts" ? (
        <section className="grid gap-2 text-sm">
          <p className="text-white/50">After you approve an idea, mark the email and the deposit account here. Lucid does not start until both are ready.</p>
          {store.accounts.map((account) => {
            const ready = account.emailReady && account.depositReady;
            return (
              <article key={account.id} className="module-card p-3">
                <div>{account.runName}</div>
                <label className="mt-2 flex gap-2"><input type="checkbox" checked={account.emailReady} onChange={(event) => setStore((current) => ({ ...current, accounts: current.accounts.map((item) => item.id === account.id ? { ...item, emailReady: event.target.checked } : item) }))} /> Email account is set up</label>
                <label className="mt-1 flex gap-2"><input type="checkbox" checked={account.depositReady} onChange={(event) => setStore((current) => ({ ...current, accounts: current.accounts.map((item) => item.id === account.id ? { ...item, depositReady: event.target.checked } : item) }))} /> Deposit account is set up</label>
                <button type="button" className="quiet is-on mt-3" disabled={!ready} onClick={() => {
                  setStore((current) => ({ ...current, runs: current.runs.map((run) => run.id === account.runId ? { ...run, status: "running", updated: new Date().toISOString() } : run), log: [{ id: newId(), at: new Date().toISOString(), text: `Accounts are ready. Lucid is running “${account.runName}”.` }, ...current.log] }));
                  update((prev) => ({ ...prev, ideas: prev.ideas.map((row) => row.id === account.runId ? { ...row, status: "running", approved: true } : row) }));
                  setTab("runs");
                }}>Let Lucid run</button>
              </article>
            );
          })}
          {!store.accounts.length ? <p className="text-white/40">None yet. Approve an idea and Lucid adds the account that idea needs.</p> : null}
        </section>
      ) : null}
      {tab === "log" ? (
        <section className="grid gap-2 text-sm">
          {store.log.map((entry) => <div key={entry.id} className="module-card p-2"><div className="text-[11px] text-white/35">{new Date(entry.at).toLocaleString()}</div>{entry.text}</div>)}
          {!store.log.length ? <p className="text-white/40">Nothing yet.</p> : null}
        </section>
      ) : null}
    </div>
  );
}
