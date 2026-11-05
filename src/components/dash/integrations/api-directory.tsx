import { useEffect, useMemo, useState } from "react";
import { Button, Chip } from "./ui";

export type DirectoryEntry = { n: string; u: string; d: string; c: string; f: 0 | 1; s: "apis" | "ffd" };
type Payload = { sources: Record<string, string>; rows: DirectoryEntry[] };

const PAGE = 40;
let cache: Promise<Payload> | null = null;

function load() {
  cache ??= fetch("/api-directory.json", { headers: { Accept: "application/json" } }).then((response) => {
    if (!response.ok) throw new Error(`The directory did not load (HTTP ${response.status}).`);
    return response.json() as Promise<Payload>;
  });
  cache.catch(() => { cache = null; });
  return cache;
}

/** Only plain https links are rendered, so a bad entry can never become a javascript: link. */
function safeHref(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

/**
 * Searchable list of public APIs and free developer services, built from
 * tools-collection/apis-collection and ripienaar/free-for-dev (scripts/build-api-directory.py).
 * "Add card" puts the service on this page as a key card.
 */
export function ApiDirectory({ added, onAdd }: { added: Set<string>; onAdd: (entry: DirectoryEntry) => void }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    if (!open || data) return;
    load().then(setData).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "The directory did not load."));
  }, [open, data]);

  const categories = useMemo(() => [...new Set((data?.rows || []).map((row) => row.c))].sort(), [data]);
  const needle = query.trim().toLowerCase();
  const matches = useMemo(() => (data?.rows || []).filter((row) => {
    if (freeOnly && !row.f) return false;
    if (category && row.c !== category) return false;
    return !needle || `${row.n} ${row.d} ${row.c}`.toLowerCase().includes(needle);
  }), [data, needle, category, freeOnly]);

  useEffect(() => setShown(PAGE), [needle, category, freeOnly]);

  return (
    <details className="module-card p-4" onToggle={(event) => setOpen((event.target as HTMLDetailsElement).open)}>
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 text-sm font-medium text-white">
        <span>API Directory</span>
        <span className="text-xs font-normal text-white/50">{data ? `${data.rows.length.toLocaleString()} services` : "Public APIs and free developer tools"}</span>
      </summary>
      <div className="mt-3 space-y-3">
        <p className="text-xs text-white/55">
          Search public APIs and free tiers, then press Add card to put one on this page with its own key box and test.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="api-directory-search">Search the API directory</label>
          <input
            id="api-directory-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search: weather, SMS, email validation…"
            className="min-w-52 flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-sky-300"
          />
          <label className="sr-only" htmlFor="api-directory-category">Category</label>
          <select
            id="api-directory-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-sky-300"
          >
            <option value="">All categories</option>
            {categories.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <Chip active={freeOnly} onClick={() => setFreeOnly((value) => !value)}>Free only</Chip>
        </div>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {!data && !error ? <p className="text-sm text-white/55">Loading the directory…</p> : null}
        {data ? (
          <>
            <p className="text-xs text-white/50" aria-live="polite">{matches.length.toLocaleString()} match{matches.length === 1 ? "" : "es"}</p>
            <ul className="grid gap-2 md:grid-cols-2">
              {matches.slice(0, shown).map((row) => {
                const href = safeHref(row.u);
                const has = added.has(row.n.toLowerCase());
                return (
                  <li key={`${row.s}:${row.n}`} className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="hover:underline">{row.n}</a> : row.n}
                        </p>
                        <p className="text-xs text-white/50">{row.c}{row.f ? " · Free tier" : ""}</p>
                      </div>
                      <Button primary={!has} disabled={has} onClick={() => onAdd(row)} label={has ? `${row.n} is already a card` : `Add ${row.n} as a card`}>
                        {has ? "Added" : "Add card"}
                      </Button>
                    </div>
                    {row.d ? <p className="text-xs text-white/65">{row.d}</p> : null}
                  </li>
                );
              })}
            </ul>
            {matches.length > shown ? <Button onClick={() => setShown((value) => value + PAGE)}>Show {Math.min(PAGE, matches.length - shown)} more</Button> : null}
            <p className="text-xs text-white/40">
              Sources: <a className="underline" href={data.sources.apis} target="_blank" rel="noopener noreferrer">apis-collection</a> and{" "}
              <a className="underline" href={data.sources.ffd} target="_blank" rel="noopener noreferrer">free-for-dev</a>.
            </p>
          </>
        ) : null}
      </div>
    </details>
  );
}
