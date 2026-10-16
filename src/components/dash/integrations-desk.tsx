import { useMemo, useState } from "react";
import type { Memory } from "./memory";
import { PROVIDERS, type Category } from "@/lib/integrations/providers";
import { CATEGORY_ORDER, EXTRA_FIELD } from "./integrations/catalog";
import { AccountsInUse } from "./integrations/accounts-in-use";
import { KeyRow } from "./integrations/key-row";
import { MailboxSection } from "./integrations/mailbox-section";
import { ProviderCard } from "./integrations/provider-card";
import { useIntegrations, type KeyRowModel, type Update } from "./integrations/use-integrations";
import { Button, Chip, StatusPill } from "./integrations/ui";

type Account = { provider: string; name: string; email: string };
type Filter = "all" | "working" | "attention" | "todo";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "working", label: "Working" },
  { id: "attention", label: "Needs attention" },
  { id: "todo", label: "Not set up" },
];

function keyMatches(row: KeyRowModel, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "working") return row.state === "ok";
  if (filter === "attention") return row.state === "error";
  return row.state === "empty" || row.state === "untested" || row.state === "saved";
}

export function IntegrationsDesk({ data, update, setAccounts, setNote }: {
  data: Memory;
  update: Update;
  accounts: Account[];
  setAccounts: (rows: Account[]) => void;
  note: string;
  setNote: (value: string) => void;
}) {
  const hub = useIntegrations({ data, update, setAccounts, setNote });
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [category, setCategory] = useState<Category | "All">("All");
  const [sheet, setSheet] = useState("");
  const [sheetNote, setSheetNote] = useState("");
  const needle = query.trim().toLowerCase();

  const providers = useMemo(() => PROVIDERS.filter((meta) => {
    const accounts = hub.byProvider.get(meta.id) || [];
    if (needle && !`${meta.name} ${meta.blurb} ${meta.category}`.toLowerCase().includes(needle)) return false;
    if (category !== "All" && meta.category !== category) return false;
    if (filter === "working") return accounts.some((row) => row.status === "ok");
    if (filter === "attention") return accounts.some((row) => row.status === "needs_reauth");
    if (filter === "todo") return accounts.length === 0;
    return true;
  }), [hub.byProvider, needle, category, filter]);

  const keysByCategory = useMemo(() => {
    const groups = new Map<Category, KeyRowModel[]>();
    for (const row of hub.keyRows) {
      if (needle && !row.name.toLowerCase().includes(needle)) continue;
      if (category !== "All" && row.category !== category) continue;
      if (!keyMatches(row, filter)) continue;
      groups.set(row.category, [...(groups.get(row.category) || []), row]);
    }
    return CATEGORY_ORDER.filter((name) => groups.has(name)).map((name) => ({ name, rows: groups.get(name) as KeyRowModel[] }));
  }, [hub.keyRows, needle, category, filter]);

  const keyTotal = keysByCategory.reduce((sum, group) => sum + group.rows.length, 0);
  const open = Boolean(needle) || filter !== "all" || category !== "All";
  const signedOut = hub.loadError?.status === 401;
  const categories: (Category | "All")[] = ["All", ...CATEGORY_ORDER.filter((name) => PROVIDERS.some((p) => p.category === name) || hub.keyRows.some((row) => row.category === name))];
  const extraSaved = (name: string) => {
    const field = EXTRA_FIELD[name];
    return field ? data.keys.find((row) => row.name === field.keyName)?.value || "" : "";
  };

  function saveAndTest(name: string, value: string, extras: Record<string, string>) {
    if (value) hub.saveKey(name, value);
    for (const [keyName, extra] of Object.entries(extras)) if (extra) hub.saveKey(keyName, extra);
    void hub.testKey(name, value || undefined, extras);
  }

  return (
    <section className="space-y-5" aria-label="Integrations">
      <header className="module-card space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">Integrations</h2>
            <p className="mt-1 max-w-2xl text-sm text-white/60">
              Connect an account in one click, or paste an API key. Every card shows the result of a real test, never a guess.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button primary busy={Boolean(hub.busy.all)} disabled={Boolean(hub.loadError)} onClick={() => void hub.testAll()}>Test everything</Button>
            <Button onClick={() => void hub.refresh()} label="Reload from the server">Reload</Button>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-3">
          {[
            { label: "Working", value: hub.stats.working, tone: "text-emerald-300" },
            { label: "Needs attention", value: hub.stats.attention, tone: hub.stats.attention ? "text-rose-300" : "text-white" },
            { label: "Saved, not verified", value: hub.stats.untested, tone: "text-amber-200" },
          ].map((tile) => (
            <div key={tile.label} className="rounded-xl border border-white/10 bg-black/20 p-3">
              <dt className="text-xs text-white/55">{tile.label}</dt>
              <dd className={`text-2xl font-semibold ${tile.tone}`}>{hub.loading ? "–" : tile.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div aria-live="polite" className="space-y-3">
        {hub.notice ? (
          <div role="status" className={`flex items-start justify-between gap-3 rounded-xl border p-3 text-sm ${hub.notice.tone === "error" ? "border-rose-400/40 bg-rose-400/10 text-rose-200" : hub.notice.tone === "ok" ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : "border-white/15 bg-white/5 text-white/80"}`}>
            <span>{hub.notice.text}</span>
            <button type="button" onClick={hub.dismiss} className="shrink-0 text-xs underline" aria-label="Dismiss message">Dismiss</button>
          </div>
        ) : null}
        {signedOut ? (
          <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-100">
            Press Connect. It leaves this page and opens that service so you can pick the account. The app id is already stored on the login service.
          </div>
        ) : hub.loadError ? (
          <div className="rounded-xl border border-rose-400/40 bg-rose-400/10 p-3 text-sm text-rose-200">
            Integrations could not be loaded: {hub.loadError.text}{" "}
            <button type="button" className="underline" onClick={() => void hub.refresh()}>Try again</button>
          </div>
        ) : null}
        {hub.payload && !hub.payload.encryptionReady ? (
          <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-100">
            One-time setup: set <code>INTEGRATIONS_ENCRYPTION_KEY</code> on the server (any long random string). Connections are blocked until it exists so no token is ever stored unencrypted.
          </div>
        ) : null}
      </div>

      <div className="module-card space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="sr-only" htmlFor="integration-search">Search integrations</label>
          <input
            id="integration-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Gmail, OpenAI, Stripe…"
            className="min-w-52 flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-sky-300"
          />
          <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1.5">
            {FILTERS.map((item) => (
              <Chip key={item.id} active={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</Chip>
            ))}
          </div>
        </div>
        <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-1.5">
          {categories.map((name) => (
            <Chip key={name} active={category === name} onClick={() => setCategory(name)}>{name}</Chip>
          ))}
        </div>
      </div>

      {!needle && filter === "all" && category === "All" && !hub.loadError ? (
        <AccountsInUse rows={hub.inUse.rows} misses={hub.inUse.misses} busy={Boolean(hub.busy.plan)} onApplyPlan={() => void hub.applyPlan()} onConnect={(email) => void hub.connect(email.toLowerCase().endsWith("@icloud.com") ? "nylas" : "google", email)} />
      ) : null}

      {providers.length ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white/60">One-click connections</h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {providers.map((meta) => (
              <ProviderCard
                key={meta.id}
                meta={meta}
                accounts={hub.byProvider.get(meta.id) || []}
                expected={hub.expected[meta.id] || ""}
                configured={Boolean(hub.payload?.configured[meta.id])}
                encryptionReady={Boolean(hub.payload?.encryptionReady)}
                app={hub.payload?.apps?.[meta.id]}
                busy={hub.busy}
                onConnect={() => void hub.connect(meta.id, meta.id === "google" ? "chrisgr33ninc@gmail.com" : hub.expected[meta.id])}
                onTest={(account) => void hub.testAccount(account)}
                onDisconnect={(account) => void hub.disconnect(account)}
                onMakePrimary={(account) => void hub.makePrimary(account)}
                onSaveExpected={(email) => void hub.setExpected(meta.id, email)}
                onSaveApp={(clientId, clientSecret) => void hub.saveApp(meta.id, clientId, clientSecret)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {!needle && filter === "all" && (category === "All" || category === "Mail & Calendar") && !hub.loadError ? (
        <MailboxSection
          mailboxes={hub.mailboxes}
          note={hub.payload?.mailboxNote || ""}
          configured={Boolean(hub.payload?.configured.nylas)}
          expected={hub.expected.nylas || ""}
          app={hub.payload?.apps?.nylas}
          busy={hub.busy}
          onConnect={(email) => void hub.connect("nylas", email)}
          onTest={(box) => void hub.testMailbox(box)}
          onDisconnect={(box) => void hub.disconnectMailbox(box)}
          onSaveApp={(clientId, clientSecret) => void hub.saveApp("nylas", clientId, clientSecret)}
        />
      ) : null}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white/60">API keys · {keyTotal}</h3>
          <StatusPill tone="idle">Keys stay in your account memory</StatusPill>
        </div>
        {keysByCategory.map((group) => {
          const failing = group.rows.filter((row) => row.state === "error").length;
          const saved = group.rows.filter((row) => row.value).length;
          return (
            <details key={`${group.name}-${open}-${failing > 0}`} open={open || failing > 0} className="module-card group p-4">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 text-sm font-medium text-white">
                <span>{group.name} <span className="font-normal text-white/50">· {group.rows.length}</span></span>
                <span className="text-xs font-normal text-white/50">
                  {saved ? `${saved} saved` : "none saved"}{failing ? ` · ${failing} failing` : ""}
                </span>
              </summary>
              <ul className="mt-3 grid gap-2 md:grid-cols-2">
                {group.rows.map((row) => (
                  <KeyRow
                    key={row.name}
                    row={row}
                    busy={Boolean(hub.busy[`key:${row.name}`])}
                    extraSaved={extraSaved(row.name)}
                    onSave={saveAndTest}
                    onTest={(name) => void hub.testKey(name)}
                    onRemove={(name) => void hub.removeKey(name)}
                  />
                ))}
              </ul>
            </details>
          );
        })}
        {!providers.length && !keysByCategory.length && !hub.loading ? (
          <p className="module-card p-4 text-sm text-white/60">Nothing matches that search. Clear the filters to see everything.</p>
        ) : null}
      </div>

      <details className="module-card p-4">
        <summary className="cursor-pointer text-sm font-medium text-white">Paste a whole key sheet</summary>
        <div className="mt-3 space-y-2">
          <p className="text-xs text-white/55">Two columns (name, value) or lines like <code>OPENAI_API_KEY=…</code>. Names are matched to cards automatically.</p>
          <textarea
            aria-label="Key sheet"
            value={sheet}
            onChange={(event) => setSheet(event.target.value)}
            rows={5}
            spellCheck={false}
            className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 font-mono text-xs text-white outline-none focus:border-sky-300"
          />
          <div className="flex items-center gap-3">
            <Button primary disabled={!sheet.trim()} onClick={() => { setSheetNote(hub.importSheet(sheet)); setSheet(""); }}>Fill the cards</Button>
            {sheetNote ? <p className="text-xs text-white/60">{sheetNote}</p> : null}
          </div>
        </div>
      </details>
    </section>
  );
}
