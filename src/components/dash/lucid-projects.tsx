import { useEffect, useState } from "react";
import { addBudgetLine, createProject, listProjects, type BudgetLine, type LiveProject } from "@/lib/lifeos/truth";

function money(cents: number | null) {
  return `$${((cents || 0) / 100).toFixed(2)}`;
}

export function LucidProjects() {
  const [projects, setProjects] = useState<LiveProject[]>([]);
  const [lines, setLines] = useState<BudgetLine[]>([]);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");
  const [note, setNote] = useState("");
  const [line, setLine] = useState({ project: "", label: "", amount: "", kind: "expense" as "expense" | "income" });

  function load() {
    void listProjects().then((result) => {
      setProjects(result.projects);
      setLines(result.lines);
      setError(result.error);
    });
  }

  useEffect(() => { load(); }, []);

  return (
    <section className="grid gap-3">
      <p className="text-sm text-white/50">Projects and budget lines are stored on your account. Amounts stay empty until you type them.</p>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <form className="flex flex-wrap gap-2" onSubmit={(event) => {
        event.preventDefault();
        const cents = Math.round(Number(budget || 0) * 100);
        if (!name.trim() || !Number.isFinite(cents)) return;
        void createProject(name.trim(), cents, note.trim()).then((result) => {
          setError(result.error || result.body.error || "");
          if (result.ok) { setName(""); setBudget(""); setNote(""); load(); }
        });
      }}>
        <input className="h-8 min-w-48 flex-1 rounded-full border border-line bg-black/40 px-3 text-sm" placeholder="Project" value={name} onChange={(event) => setName(event.target.value)} />
        <input className="h-8 w-28 rounded-full border border-line bg-black/40 px-3 text-sm" placeholder="Budget $" value={budget} onChange={(event) => setBudget(event.target.value.replace(/[^0-9.]/g, ""))} />
        <input className="h-8 min-w-40 flex-1 rounded-full border border-line bg-black/40 px-3 text-sm" placeholder="Note" value={note} onChange={(event) => setNote(event.target.value)} />
        <button type="submit" className="quiet is-on">Save project</button>
      </form>
      {!projects.length && !error ? <p className="text-sm text-white/40">No projects stored for this sign-in.</p> : null}
      {projects.map((project) => {
        const rows = lines.filter((item) => item.project_id === project.id);
        const spent = rows.filter((item) => item.kind !== "income").reduce((sum, item) => sum + item.amount_cents, 0);
        return (
          <article key={project.id} className="module-card p-3 text-sm">
            <h2 className="text-base">{project.name}</h2>
            <p className="text-white/50">{project.status} · budget {money(project.budget_cents)} · lines {money(spent)}</p>
            {project.description ? <p className="mt-1 text-white/70">{project.description}</p> : null}
            {rows.map((item) => <p key={item.id} className="mt-1">{item.kind} · {item.label} · {money(item.amount_cents)}</p>)}
          </article>
        );
      })}
      <form className="flex flex-wrap gap-2" onSubmit={(event) => {
        event.preventDefault();
        const cents = Math.round(Number(line.amount || 0) * 100);
        if (!line.project || !line.label.trim() || !Number.isFinite(cents)) return;
        void addBudgetLine(line.project, line.label.trim(), cents, line.kind).then((result) => {
          setError(result.error || result.body.error || "");
          if (result.ok) { setLine({ project: line.project, label: "", amount: "", kind: line.kind }); load(); }
        });
      }}>
        <select className="h-8 rounded-full border border-line bg-black/40 px-3 text-sm" value={line.project} onChange={(event) => setLine({ ...line, project: event.target.value })}>
          <option value="">Project</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
        <input className="h-8 min-w-32 flex-1 rounded-full border border-line bg-black/40 px-3 text-sm" placeholder="Line" value={line.label} onChange={(event) => setLine({ ...line, label: event.target.value })} />
        <input className="h-8 w-24 rounded-full border border-line bg-black/40 px-3 text-sm" placeholder="$" value={line.amount} onChange={(event) => setLine({ ...line, amount: event.target.value.replace(/[^0-9.]/g, "") })} />
        <select className="h-8 rounded-full border border-line bg-black/40 px-3 text-sm" value={line.kind} onChange={(event) => setLine({ ...line, kind: event.target.value === "income" ? "income" : "expense" })}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
        <button type="submit" className="quiet">Add line</button>
      </form>
    </section>
  );
}
