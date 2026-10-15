import { useEffect, useMemo, useRef, useState } from "react";
import { newId, type Memory } from "./memory";
import { CATALOG, CATEGORY_LABEL, oauthProviderId, type IntegrationCategory } from "@/lib/integrations/catalog";
import { sheetKeys } from "@/lib/lifeos/sheet-keys";
import { BOARD_EMAILS, confirmSignIn, pullWorkerLinks, requestSignIn, sessionAuthHeaders, sessionToken, signOutSession } from "@/lib/lifeos/oauth";
import { ProviderCard, type Mark } from "./integrations/provider-card";
import { readReturn, sameAttempt, useIntegrations, type Connection } from "./integrations/use-integrations";

/**
 * Integrations — the connection centre.
 *
 * Every card states what it can really do: authorize with the provider, take an
 * API key, or nothing at all. Status comes from the server (a stored connection
 * that passed a live provider check), never from an optimistic click.
 */

const MARKS = "lifeos.integration.marks";
type Filter = "all" | "connected" | "todo" | "keys" | "none";
type Update = (recipe: (prev: Memory) => Memory) => void;

const KEY_METHODS = new Set(["apikey", "local"]);

function readMarks(): Record<string, Mark> {
  try {
    const parsed = JSON.parse(localStorage.getItem(MARKS) || "{}") as Record<string, Mark>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function mask(value: string) {
  const clean = value.trim();
  if (clean.length <= 8) return "saved";
  return `${clean.slice(0, 3)}····${clean.slice(-4)}`;
}

export function IntegrationsDesk({ data, update }: { data: Memory; update: Update }) {
  const { status, loading, message, setMessage, pending, refresh, connect, verify, disconnect } = useIntegrations();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<IntegrationCategory | "all">("all");
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [checked, setChecked] = useState<Record<string, string>>({});
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [sheet, setSheet] = useState("");
  const [sheetNote, setSheetNote] = useState("");
  const [sweeping, setSweeping] = useState(false);
  const [signed, setSigned] = useState(() => Boolean(sessionToken()));
  const [inbox, setInbox] = useState<(typeof BOARD_EMAILS)[number]>("chris@ceogps.com");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const booted = useRef(false);

  const connections = useMemo(() => {
    const map = new Map<string, Connection>();
    for (const row of status?.connections || []) map.set(row.provider, row);
    return map;
  }, [status]);

  useEffect(() => { setMarks(readMarks()); }, []);

  useEffect(() => {
    const back = readReturn();
    if (back.error) setMessage(back.error);
    else if (back.provider && sameAttempt(back.sid)) setMessage(`${back.provider} returned to the app.`);
    void refresh();
    void pullWorkerLinks().catch(() => undefined);
  }, [refresh, setMessage]);

  // Mirror the check results through the cloud copy the board already uses.
  useEffect(() => {
    void import("@/lib/lifeos/board-store").then(({ pullMarks }) => pullMarks()).then((saved) => {
      if (!Object.keys(saved).length) return;
      setMarks((prev) => ({ ...prev, ...saved }));
    }).catch(() => undefined);
  }, []);

  function stamp(name: string, state: Mark["state"], text: string) {
    setMarks((prev) => {
      const next = { ...prev, [name]: { state, text } };
      try { localStorage.setItem(MARKS, JSON.stringify(next)); } catch { /* the in-memory mark still shows */ }
      void import("@/lib/lifeos/board-store").then(({ pushMarks }) => pushMarks(next)).catch(() => undefined);
      return next;
    });
  }

  function savedKey(name: string) {
    return data.keys.find((row) => row.name === name)?.value || "";
  }

  function putKey(name: string, value: string) {
    const names = name === "xAI" || name === "Grok (xAI)" ? ["xAI", "Grok (xAI)"] : [name];
    update((prev) => ({
      ...prev,
      keys: [...names.map((item) => ({ id: newId(), name: item, value })), ...prev.keys.filter((item) => !names.includes(item.name))],
    }));
  }

  async function testKey(name: string, value: string, email = "") {
    const key = value.trim();
    if (!key) {
      stamp(name, "error", "No key is saved on this card.");
      setMessage(`${name}: no key is saved.`);
      return false;
    }
    setBusy((prev) => ({ ...prev, [name]: true }));
    try {
      const response = await fetch("/api/keys/check", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...(await sessionAuthHeaders()) },
        body: JSON.stringify({ name, key, email }),
      });
      const row = (await response.json().catch(() => ({}))) as { ok?: boolean; checked?: boolean; text?: string; reason?: string; error?: string; host?: string };
      const text = String(row.text || row.reason || row.error || `The check returned HTTP ${response.status}.`);
      if (row.checked === false) {
        stamp(name, "saved", text);
        setChecked((prev) => ({ ...prev, [name]: text }));
        setMessage(`${name}: ${text}`);
        return false;
      }
      if (row.ok) {
        if (name === "Ollama (local)" && row.host && !savedKey(name)) putKey(name, row.host);
        stamp(name, "connected", text);
        setChecked((prev) => ({ ...prev, [name]: text }));
        setMessage(`${name}: ${text}`);
        return true;
      }
      stamp(name, "error", text);
      setChecked((prev) => ({ ...prev, [name]: text }));
      setMessage(`${name}: ${text}`);
      return false;
    } catch (error) {
      const text = error instanceof Error ? error.message : "The check failed.";
      stamp(name, "error", text);
      setChecked((prev) => ({ ...prev, [name]: text }));
      setMessage(`${name}: ${text}`);
      return false;
    } finally {
      setBusy((prev) => ({ ...prev, [name]: false }));
    }
  }

  async function accountCheck(service: NonNullable<(typeof CATALOG)[number]["account"]>, values: { key?: string; secret?: string; site?: string }) {
    const label = service === "search-console" ? "Search Console" : service === "google-analytics" ? "Google Analytics" : service === "godaddy" ? "GoDaddy" : "Brilliant Directories";
    setBusy((prev) => ({ ...prev, [label]: true }));
    try {
      const response = await fetch("/api/keys/account", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...(await sessionAuthHeaders()) },
        body: JSON.stringify({ service, key: values.key || "", secret: values.secret || "", site: values.site || "" }),
      });
      const row = (await response.json().catch(() => ({}))) as { ok?: boolean; text?: string; site?: string };
      const text = String(row.text || `The check returned HTTP ${response.status}.`);
      if (row.ok && row.site && service === "search-console" && row.site !== savedKey("Search Console")) putKey("Search Console", row.site);
      if (row.ok && row.site && service === "google-analytics" && row.site !== savedKey("Google Analytics")) putKey("Google Analytics", row.site);
      if (row.ok && service === "godaddy") {
        if (values.key) putKey("GoDaddy", values.key);
        if (values.secret) putKey("GoDaddy Secret", values.secret);
      }
      if (row.ok && service === "brilliant") {
        if (values.key) putKey("Brilliant Directories", values.key);
        if (values.site) putKey("Brilliant Site", values.site);
      }
      stamp(label, row.ok ? "connected" : "error", text);
      setChecked((prev) => ({ ...prev, [label]: text }));
      setMessage(`${label}: ${text}`);
    } catch (error) {
      const text = error instanceof Error ? error.message : "The check failed.";
      stamp(label, "error", text);
      setMessage(`${label}: ${text}`);
    } finally {
      setBusy((prev) => ({ ...prev, [label]: false }));
    }
  }

  async function testAllConnections() {
    const rows = status?.connections || [];
    if (!rows.length) {
      setMessage("Nothing is connected yet.");
      return;
    }
    setSweeping(true);
    let ok = 0;
    for (const row of rows) {
      setMessage(`Testing ${row.provider}…`);
      if (await verify(row.provider)) ok += 1;
    }
    setSweeping(false);
    setMessage(`Tested ${rows.length} connections. ${ok} answered, ${rows.length - ok} failed.`);
  }

  async function testAllKeys() {
    const names = [...new Set(data.keys.filter((row) => row.value.trim()).map((row) => row.name))]
      .filter((name) => CATALOG.some((entry) => entry.name === name && entry.probe));
    if (!names.length) {
      setMessage("No saved keys are testable yet.");
      return;
    }
    setSweeping(true);
    let ok = 0;
    for (const name of names) {
      setMessage(`Testing ${name}…`);
      if (await testKey(name, savedKey(name))) ok += 1;
    }
    setSweeping(false);
    setMessage(`Tested ${names.length} saved keys. ${ok} answered, ${names.length - ok} failed.`);
  }

  function applySheet(text: string) {
    try {
      const names = CATALOG.filter((entry) => entry.methods.some((method) => KEY_METHODS.has(method))).map((entry) => entry.name);
      const found = sheetKeys(text, names);
      if (!found.length) {
        setSheetNote("Nothing matched a card. Paste two columns, name and value, or lines like OPENAI_API_KEY=...");
        return;
      }
      update((prev) => ({
        ...prev,
        keys: [
          ...found.map((row) => ({ id: newId(), name: row.name, value: row.value })),
          ...prev.keys.filter((row) => !found.some((item) => item.name === row.name)),
        ],
      }));
      const message = `Filled ${found.length} keys: ${found.map((row) => row.name).slice(0, 14).join(", ")}${found.length > 14 ? "…" : ""}.`;
      setSheetNote(message);
      setMessage(message);
      for (const row of found) stamp(row.name, "saved", mask(row.value));
    } catch (error) {
      setSheetNote(error instanceof Error ? error.message : "That paste could not be read.");
    }
  }

  // The local daemon is the one service worth a first look when the panel opens.
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const value = savedKey("Ollama (local)") || "http://127.0.0.1:11434";
    void testKey("Ollama (local)", value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const keyedNames = new Set(data.keys.filter((row) => row.value.trim()).map((row) => row.name));

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rank = (entry: (typeof CATALOG)[number]) => {
      const provider = oauthProviderId(entry);
      if (provider && connections.get(provider)?.status === "connected") return 0;
      if (provider) return 1;
      if (keyedNames.has(entry.name)) return 2;
      return 3;
    };
    return CATALOG.filter((entry) => {
      if (category !== "all" && entry.category !== category) return false;
      const provider = oauthProviderId(entry);
      const connected = provider ? connections.get(provider)?.status === "connected" || marks[entry.name]?.state === "connected" : marks[entry.name]?.state === "connected";
      if (filter === "connected" && !connected) return false;
      if (filter === "todo" && (connected || !provider)) return false;
      if (filter === "keys" && !entry.methods.some((method) => KEY_METHODS.has(method))) return false;
      if (filter === "none" && !entry.methods.includes("none")) return false;
      if (!needle) return true;
      return `${entry.name} ${entry.summary} ${CATEGORY_LABEL[entry.category]} ${entry.dependents.join(" ")}`.toLowerCase().includes(needle);
    }).sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, category, filter, connections, marks, data.keys]);

  const counts = useMemo(() => {
    const connected = CATALOG.filter((entry) => {
      const provider = oauthProviderId(entry);
      if (provider) return connections.get(provider)?.status === "connected";
      return marks[entry.name]?.state === "connected";
    }).length;
    const todo = CATALOG.filter((entry) => oauthProviderId(entry) && connections.get(oauthProviderId(entry) as string)?.status !== "connected").length;
    const keys = CATALOG.filter((entry) => entry.methods.some((method) => KEY_METHODS.has(method))).length;
    const none = CATALOG.filter((entry) => entry.methods.includes("none")).length;
    return { connected, todo, keys, none, saved: keyedNames.size };
  }, [connections, marks, keyedNames]);

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "All", count: CATALOG.length },
    { id: "connected", label: "Connected", count: counts.connected },
    { id: "todo", label: "Connect now", count: counts.todo },
    { id: "keys", label: "API keys", count: counts.keys },
    { id: "none", label: "No public API", count: counts.none },
  ];

  const categories = useMemo(() => {
    const seen = new Map<IntegrationCategory, number>();
    for (const entry of CATALOG) seen.set(entry.category, (seen.get(entry.category) || 0) + 1);
    return [...seen.entries()];
  }, []);

  return (
    <div>
      <div className="module-card mb-4 grid gap-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl">Integrations</h1>
            <p className="text-sm text-white/55">
              {loading
                ? "Reading connections…"
                : `${counts.connected} connected · ${counts.todo} connectable with a provider login · ${counts.saved} keys on file`}
              {status && !status.signedIn ? " · preview owner" : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="quiet is-on" disabled={sweeping} onClick={() => void testAllConnections()}>{sweeping ? "Testing" : "Test connections"}</button>
            <button type="button" className="quiet" disabled={sweeping} onClick={() => void testAllKeys()}>Test saved keys</button>
            <button type="button" className="quiet" onClick={() => void refresh()}>Refresh</button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            className="h-9 min-w-64 flex-1 rounded-full border border-line bg-black/40 px-4 text-sm"
            placeholder="Search services, capabilities or dependents"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select className="h-9 rounded-full border border-line bg-black/40 px-3 text-sm" value={category} onChange={(event) => setCategory(event.target.value as IntegrationCategory | "all")}>
            <option value="all">Every category</option>
            {categories.map(([id, count]) => (
              <option key={id} value={id}>{CATEGORY_LABEL[id]} ({count})</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`quiet ${filter === item.id ? "is-on" : ""}`}
              onClick={() => setFilter(item.id)}
            >
              {item.label} · {item.count}
            </button>
          ))}
        </div>

        {message ? <p className="text-sm leading-5 text-white/70">{message}</p> : null}
      </div>

      <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((entry) => {
          const providerId = oauthProviderId(entry);
          const provider = providerId ? status?.providers[providerId] : undefined;
          return (
            <ProviderCard
              key={entry.id}
              entry={entry}
              oauthId={providerId}
              provider={provider}
              connection={providerId ? connections.get(providerId) : undefined}
              savedKey={savedKey(entry.name)}
              mark={marks[entry.name]}
              checked={checked[entry.name]}
              accountValue={entry.account ? savedKey(entry.name) : undefined}
              busy={Boolean(busy[entry.name]) || sweeping}
              pending={Boolean(providerId && pending === providerId)}
              onConnect={() => {
                if (!providerId) return;
                setMessage("");
                connect(providerId, window.location.pathname, providerId === "google" || providerId === "microsoft" ? inbox : "");
              }}
              onVerify={() => {
                if (!providerId) return;
                setBusy((prev) => ({ ...prev, [entry.name]: true }));
                void verify(providerId).finally(() => setBusy((prev) => ({ ...prev, [entry.name]: false })));
              }}
              onDisconnect={() => {
                if (!providerId) return;
                setBusy((prev) => ({ ...prev, [entry.name]: true }));
                void disconnect(providerId).finally(() => setBusy((prev) => ({ ...prev, [entry.name]: false })));
              }}
              onSaveKey={(value) => {
                putKey(entry.name, value);
                void testKey(entry.name, value, /^(Google|Gmail|YouTube|Search Console|Firebase)/.test(entry.name) ? "chrisgr33ninc@gmail.com" : "");
              }}
              onTestKey={(value) => void testKey(entry.name, value ?? savedKey(entry.name), /^(Google|Gmail|YouTube|Search Console|Firebase)/.test(entry.name) ? "chrisgr33ninc@gmail.com" : "")}
              onAccount={(values) => {
                if (entry.account) void accountCheck(entry.account, values.key ? values : { ...values, key: savedKey(entry.name) });
              }}
            />
          );
        })}
      </div>

      {!rows.length ? <p className="mt-4 text-sm text-white/55">Nothing matches that search yet.</p> : null}

      <div className="module-card mt-6 grid gap-2 p-4">
        <h2 className="text-lg">Key sheet</h2>
        <p className="text-sm text-white/55">Paste or upload a sheet of keys to fill {counts.keys} cards at once. Names are matched to the cards above.</p>
        <textarea className="min-h-24 rounded-2xl border border-line bg-black/40 px-3 py-2 font-mono text-sm" placeholder={"name\tvalue\nOpenAI\tsk-...\nElevenLabs\tsk_..."} value={sheet} onChange={(event) => setSheet(event.target.value)} />
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="quiet is-on" disabled={!sheet.trim()} onClick={() => applySheet(sheet)}>Import pasted keys</button>
          <label className="quiet">Upload key sheet
            <input className="hidden" type="file" accept=".env,.txt,.csv,.json,.toml,.vars,text/plain" onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              void file.text().then((text) => applySheet(text));
            }} />
          </label>
          <button type="button" className="quiet" onClick={() => {
            const names = CATALOG.filter((entry) => entry.methods.some((method) => KEY_METHODS.has(method))).map((entry) => entry.name);
            const csv = `name,value\n${names.map((name) => `${name},`).join("\n")}\n`;
            const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
            const link = document.createElement("a");
            link.href = url;
            link.download = "lifeos-api-keys.csv";
            link.click();
            URL.revokeObjectURL(url);
          }}>Download sheet template</button>
          {sheetNote ? <p className="text-sm text-white/70">{sheetNote}</p> : null}
        </div>
      </div>

      <details className="module-card mt-4 p-4">
        <summary className="cursor-pointer text-sm text-white/70">Cloud sync (optional)</summary>
        <p className="mt-2 text-sm text-white/55">
          Connections above are stored on this app's own server and need no sign-in. This cloud sign-in is only for the board's shared Supabase copy.
        </p>
        {signed ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-sm text-white/70">Signed in to the cloud copy.</p>
            <button type="button" className="quiet" onClick={() => { signOutSession(); setSigned(false); setMessage("Signed out of the cloud copy."); }}>Sign out</button>
          </div>
        ) : (
          <form className="mt-3 flex flex-wrap items-center gap-2" onSubmit={(event) => {
            event.preventDefault();
            if (!codeSent) {
              void requestSignIn(inbox)
                .then(() => { setCodeSent(true); setMessage(`Code sent to ${inbox}.`); })
                .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Supabase did not send a code."));
              return;
            }
            void confirmSignIn(inbox, code)
              .then(() => { setSigned(true); setCode(""); setMessage("Signed in to the cloud copy."); })
              .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "That code was refused."));
          }}>
            <select className="h-9 rounded-full border border-line bg-black/40 px-3 text-sm" value={inbox} onChange={(event) => setInbox(event.target.value as (typeof BOARD_EMAILS)[number])}>
              {BOARD_EMAILS.map((email) => <option key={email} value={email}>{email}</option>)}
            </select>
            {codeSent ? <input className="h-9 rounded-full border border-line bg-black/40 px-3 text-sm" inputMode="numeric" autoComplete="one-time-code" placeholder="Email code" value={code} onChange={(event) => setCode(event.target.value)} /> : null}
            <button type="submit" className="quiet is-on">{codeSent ? "Sign in" : "Email me a code"}</button>
          </form>
        )}
      </details>
    </div>
  );
}
