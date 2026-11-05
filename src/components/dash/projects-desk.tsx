import { useState } from "react";
import { newId, type Memory } from "./memory";

type Update = (recipe: (prev: Memory) => Memory) => void;
type Status = "To do" | "Doing" | "Done";
type Task = { id: string; title: string; done: boolean };
type Project = { status: Status; notes: string; due: string; tasks: Task[] };

const STATUSES: Status[] = ["To do", "Doing", "Done"];

function read(body: string): Project {
  if (body === "To do" || body === "Doing" || body === "Done") return { status: body, notes: "", due: "", tasks: [] };
  try {
    const raw = JSON.parse(body) as Partial<Project>;
    const status = STATUSES.includes(raw.status as Status) ? raw.status as Status : "To do";
    const tasks = Array.isArray(raw.tasks) ? raw.tasks.filter((row) => row && row.title).map((row) => ({ id: String(row.id || newId()), title: String(row.title), done: Boolean(row.done) })) : [];
    return { status, notes: String(raw.notes || ""), due: String(raw.due || ""), tasks };
  } catch {
    return { status: "To do", notes: body, due: "", tasks: [] };
  }
}

export function ProjectsDesk({ data, update }: { data: Memory; update: Update }) {
  const [name, setName] = useState("");
  const [brief, setBrief] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Status | "All">("All");
  const [openId, setOpenId] = useState<string | null>(null);
  const [task, setTask] = useState("");
  const [adding, setAdding] = useState(false);
  const open = data.projects.find((row) => row.id === openId) || null;
  const detail = open ? read(open.body) : null;
  const q = search.trim().toLowerCase();
  const matches = data.projects.filter((row) => !q || row.title.toLowerCase().includes(q) || read(row.body).notes.toLowerCase().includes(q));
  const shown = filter === "All" ? matches : matches.filter((row) => read(row.body).status === filter);
  const counts = { "To do": 0, Doing: 0, Done: 0 } as Record<Status, number>;
  for (const row of data.projects) counts[read(row.body).status]++;

  function write(id: string, next: Partial<Project> & { title?: string }) {
    update((prev) => ({
      ...prev,
      projects: prev.projects.map((row) => {
        if (row.id !== id) return row;
        const current = read(row.body);
        return { ...row, title: next.title ?? row.title, body: JSON.stringify({ ...current, ...next, title: undefined }) };
      }),
    }));
  }

  return (
    <div className="min-h-[36rem]">
      <div className="module-card flex flex-wrap items-center gap-3 p-3">
        <p className="text-sm">Projects</p>
        <span className="text-[11px] text-white/35">{data.projects.length} total</span>
        <input
          className="h-8 min-w-0 flex-1 rounded-full border border-line bg-black/40 px-3 text-sm md:max-w-xs"
          placeholder="Search projects"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="flex gap-2">
          {(["All", ...STATUSES] as const).map((item) => (
            <button key={item} type="button" className={`quiet ${filter === item ? "is-on" : ""}`} onClick={() => setFilter(item)}>
              {item}{item !== "All" ? ` (${counts[item]})` : ""}
            </button>
          ))}
        </div>
        <button type="button" className="bg-blue ml-auto" onClick={() => setAdding((value) => !value)}>{adding ? "Cancel" : "New project"}</button>
      </div>

      {adding ? (
        <form
          className="module-card mt-3 grid gap-2 p-3 md:grid-cols-[1fr_1fr_auto] md:items-start"
          onSubmit={(event) => {
            event.preventDefault();
            const title = name.trim();
            if (!title) return;
            const id = newId();
            update((prev) => ({ ...prev, projects: [{ id, title, body: JSON.stringify({ status: "To do", notes: brief.trim(), due: "", tasks: [] }), at: new Date().toISOString() }, ...prev.projects] }));
            setOpenId(id);
            setName("");
            setBrief("");
            setAdding(false);
          }}
        >
          <input className="h-8 min-w-0 rounded-full border border-line bg-black/40 px-3 text-sm" value={name} placeholder="Project name" autoFocus onChange={(event) => setName(event.target.value)} />
          <input className="h-8 min-w-0 rounded-full border border-line bg-black/40 px-3 text-sm" value={brief} placeholder="Brief, optional" onChange={(event) => setBrief(event.target.value)} />
          <button type="submit" className="bg-blue h-8">Add</button>
        </form>
      ) : null}

      {shown.length ? (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {shown.map((row) => {
            const card = read(row.body);
            const done = card.tasks.filter((item) => item.done).length;
            return (
              <button
                key={row.id}
                type="button"
                className="module-card flex h-full flex-col rounded-2xl border border-white/10 bg-black/20 p-3 text-left transition hover:border-white/30 hover:bg-white/5"
                onClick={() => setOpenId(row.id)}
              >
                <p className="truncate text-sm font-medium">{row.title}</p>
                <p className="mt-1 text-[11px] text-white/40">
                  <span className={card.status === "Done" ? "text-emerald-300" : card.status === "Doing" ? "text-amber-300" : "text-white/40"}>{card.status}</span>
                  {card.due ? ` · due ${card.due}` : ""}
                </p>
                {card.notes ? <p className="mt-2 line-clamp-2 text-[11px] text-white/35">{card.notes}</p> : null}
                {card.tasks.length ? (
                  <div className="mt-auto pt-2">
                    <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                      <div className="h-full bg-emerald-400/70" style={{ width: `${Math.round((done / card.tasks.length) * 100)}%` }} />
                    </div>
                    <p className="mt-1 text-[10px] text-white/30">{done}/{card.tasks.length} tasks</p>
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="module-card mt-3 p-6 text-center text-[11px] text-white/35">
          {data.projects.length ? "No projects match this filter." : "No projects yet. Add one above."}
        </p>
      )}

      {data.tasks.length ? (
        <div className="module-card mt-3 p-3">
          <p className="mb-1 text-[10px] tracking-widest text-white/35">BOARD TASKS</p>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.tasks.map((row) => (
              <button key={row.id} type="button" className={`menu ${row.done ? "text-white/35" : ""}`} onClick={() => update((prev) => ({ ...prev, tasks: prev.tasks.map((item) => item.id === row.id ? { ...item, done: !item.done } : item) }))}>{row.done ? "Done" : "Open"} · {row.title}</button>
            ))}
          </div>
        </div>
      ) : null}

      {open && detail ? (
        <div className="fixed inset-0 z-[1500] grid place-items-center bg-black/70 p-4" onClick={() => setOpenId(null)}>
          <div className="module-card max-h-[85dvh] w-full max-w-xl overflow-y-auto p-4" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start gap-2">
              <input className="h-8 w-full rounded-full border border-line bg-black/40 px-3 text-sm" value={open.title} onChange={(event) => write(open.id, { title: event.target.value })} />
              <button type="button" className="quiet" onClick={() => setOpenId(null)}>Close</button>
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              {STATUSES.map((status) => <button key={status} type="button" className={`quiet ${detail.status === status ? "is-on" : ""}`} onClick={() => write(open.id, { status })}>{status}</button>)}
            </div>
            <label className="mt-3 block text-[11px] uppercase tracking-wider text-white/40">Due
              <input className="mt-1 h-8 w-full rounded-full border border-line bg-black/40 px-3 text-sm normal-case" placeholder="MM/DD/YYYY" value={detail.due} onChange={(event) => write(open.id, { due: event.target.value })} />
            </label>
            <label className="mt-3 block text-[11px] uppercase tracking-wider text-white/40">Notes
              <textarea className="mt-1 min-h-24 w-full rounded-2xl border border-line bg-black/40 px-3 py-2 text-sm normal-case" value={detail.notes} onChange={(event) => write(open.id, { notes: event.target.value })} />
            </label>
            <p className="mb-1 mt-4 text-[10px] tracking-widest text-white/35">TASKS</p>
            {detail.tasks.map((row) => (
              <div key={row.id} className="flex items-center gap-3 border-b border-white/10 py-2 text-sm">
                <button type="button" className={`quiet ${row.done ? "is-on" : ""}`} onClick={() => write(open.id, { tasks: detail.tasks.map((item) => item.id === row.id ? { ...item, done: !item.done } : item) })}>{row.done ? "Done" : "Open"}</button>
                <span className={row.done ? "text-white/35 line-through" : ""}>{row.title}</span>
                <button type="button" className="link-remove ml-auto" onClick={() => write(open.id, { tasks: detail.tasks.filter((item) => item.id !== row.id) })}>Remove</button>
              </div>
            ))}
            <form className="mt-3 flex gap-2" onSubmit={(event) => {
              event.preventDefault();
              if (!task.trim()) return;
              write(open.id, { tasks: [...detail.tasks, { id: newId(), title: task.trim(), done: false }] });
              setTask("");
            }}>
              <input className="h-8 min-w-0 flex-1 rounded-full border border-line bg-black/40 px-3 text-sm" value={task} placeholder="Add a task" onChange={(event) => setTask(event.target.value)} />
              <button type="submit" className="quiet is-on">Add task</button>
            </form>
            <button type="button" className="link-remove mt-4" onClick={() => { update((prev) => ({ ...prev, projects: prev.projects.filter((row) => row.id !== open.id) })); setOpenId(null); }}>Remove project</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
