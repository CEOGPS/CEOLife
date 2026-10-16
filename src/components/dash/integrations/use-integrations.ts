import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { integrationsApi, IntegrationsApiError, peekIntegrationsCache } from "@/lib/integrations/client";
import { PROVIDERS, providerMeta, type AccountView, type CheckView, type IntegrationsPayload, type MailboxView, type ProviderId } from "@/lib/integrations/providers";
import { catchReturn, GMAIL_ACCOUNT, rememberAccounts, workerLinked } from "@/lib/lifeos/oauth";
import { sheetKeys } from "@/lib/lifeos/sheet-keys";
import { newId, type Memory } from "../memory";
import { ACCOUNT_SERVICES, BOARD_EMAIL_LIST, COVERED_BY_LOGIN, EXTRA_FIELD, GOOGLE_FAMILY, KEY_SERVICES, KEY_TWINS, NO_KEY_NEEDED, SERVER_HELD, recommendedPlan, type KeyService } from "./catalog";
import { paintChecked } from "@/lib/integrations/worker-account";

export type Update = (recipe: (prev: Memory) => Memory) => void;
export type Notice = { tone: "ok" | "error" | "info"; text: string } | null;
export type KeyState = "ok" | "error" | "saved" | "untested" | "empty";
export type KeyRowModel = KeyService & { value: string; check: CheckView | null; state: KeyState };

const SID_KEY = "lifeos.oauth.sid";

function tabId() {
  let sid = "";
  try { sid = sessionStorage.getItem(SID_KEY) || ""; } catch { sid = ""; }
  if (!sid) {
    sid = crypto.randomUUID();
    try { sessionStorage.setItem(SID_KEY, sid); } catch { /* this attempt still runs */ }
  }
  return sid;
}

const message = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);

export function useIntegrations(args: {
  data: Memory;
  update: Update;
  setAccounts: (rows: { provider: string; name: string; email: string }[]) => void;
  setNote: (value: string) => void;
}) {
  const { update, setAccounts, setNote } = args;
  const dataRef = useRef(args.data);
  dataRef.current = args.data;

  const [payload, setPayload] = useState<IntegrationsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<{ status: number; text: string } | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState<Notice>(null);
  const checksRef = useRef<Record<string, CheckView>>({});

  const say = useCallback((tone: "ok" | "error" | "info", text: string) => {
    setNotice({ tone, text });
    setNote(text);
  }, [setNote]);

  const refresh = useCallback(async () => {
    let linked: { provider: ProviderId; email: string }[] = [];
    try {
      const [workerRows, next] = await Promise.all([
        workerLinked().catch(() => [] as { provider: ProviderId; email: string }[]),
        integrationsApi.list(),
      ]);
      linked = workerRows;
      setLoadError(null);
      const checks = { ...checksRef.current, ...next.checks };
      checksRef.current = checks;
      const paint = (row: AccountView) => paintChecked(row, checks[`account:${row.id}`]);
      const merged = linked.length ? {
        ...next,
        checks,
        configured: { ...next.configured, ...Object.fromEntries(linked.map((row) => [row.provider, true])) },
        accounts: [
          ...next.accounts.map(paint),
          ...linked.filter((row) => !next.accounts.some((item) => item.provider === row.provider && item.email === row.email)).map((row) => paint({
            id: `worker:${row.provider}:${row.email}`,
            provider: row.provider,
            email: row.email,
            name: "",
            primary: true,
            status: "ok" as const,
            scopes: [],
            expiresAt: null,
            lastCheckedAt: null,
            lastError: "",
          })),
        ],
      } : { ...next, checks, accounts: next.accounts.map(paint) };
      setPayload(merged);
      const live = merged.accounts.filter((row) => row.status === "ok").map((row) => ({ provider: row.provider, email: row.email, primary: row.primary }));
      rememberAccounts(live);
      setAccounts(live.map((row) => ({ provider: row.provider, name: providerMeta(row.provider).name, email: row.email })));
      if (next.mailboxesLoaded === false) {
        void integrationsApi.mailboxes().then((boxes) => {
          setPayload((prev) => prev ? { ...prev, mailboxes: boxes.mailboxes, mailboxNote: boxes.mailboxNote, mailboxesLoaded: true } : prev);
        }).catch(() => undefined);
      }
    } catch (error) {
      if (linked.length) {
        setLoadError(null);
        setAccounts(linked.map((row) => ({ provider: row.provider, name: providerMeta(row.provider).name, email: row.email })));
        rememberAccounts(linked.map((row) => ({ ...row, primary: true })));
      } else {
        setLoadError({ status: error instanceof IntegrationsApiError ? error.status : 0, text: message(error, "Integrations could not be loaded.") });
      }
    } finally {
      setLoading(false);
    }
  }, [setAccounts]);

  useEffect(() => {
    const cached = peekIntegrationsCache();
    if (cached) {
      setPayload(cached);
      setLoading(false);
    }
    const back = catchReturn();
    if (back.provider) say("ok", `${providerMeta(back.provider).name} is connected${back.account ? ` as ${back.account}` : ""}.`);
    else if (back.error) say("error", back.error);
    void refresh();
  }, [refresh, say]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; provider?: string; ok?: boolean; message?: string; sid?: string };
      if (!data || data.type !== "lifeos-oauth") return;
      if (data.sid && data.sid !== tabId()) return;
      say(data.ok ? "ok" : "error", data.message || (data.ok ? "Connected." : "The authorization did not finish."));
      void refresh();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [refresh, say]);

  const flag = (key: string, on: boolean) => setBusy((prev) => ({ ...prev, [key]: on }));
  const keyValue = (name: string) => (dataRef.current.keys.find((row) => row.name === name)?.value || "").trim();

  const accounts = useMemo(() => payload?.accounts ?? [], [payload]);
  const checks = useMemo(() => payload?.checks ?? {}, [payload]);
  const mailboxes = useMemo<MailboxView[]>(() => payload?.mailboxes ?? [], [payload]);
  const expected = useMemo(() => payload?.expected ?? {}, [payload]);
  // The primary Google account (listed first) is the one Google-family checks use.
  const googleEmail = accounts.find((row) => row.provider === "google" && row.status === "ok")?.email || "";

  const byProvider = useMemo(() => {
    const map = new Map<ProviderId, AccountView[]>();
    for (const row of accounts) map.set(row.provider, [...(map.get(row.provider) || []), row]);
    return map;
  }, [accounts]);

  const keyRows = useMemo<KeyRowModel[]>(() => {
    return KEY_SERVICES
      .map((svc) => {
        const value = (args.data.keys.find((row) => row.name === svc.name)?.value || "").trim();
        const check = checks[`key:${svc.name}`] || null;
        // A card with nothing pasted is "empty" even if it can be tested (server-held or Google-verified),
        // unless a real test result exists. Stale results for a removed key are ignored.
        const testableWithoutKey = SERVER_HELD.has(svc.name) || NO_KEY_NEEDED.has(svc.name);
        const mapped: KeyState | null = check ? (check.state === "ok" ? "ok" : check.state === "error" ? "error" : "saved") : null;
        const state: KeyState = value ? (mapped ?? "untested") : testableWithoutKey ? (mapped ?? "empty") : "empty";
        return { ...svc, value, check, state } as KeyRowModel;
      })
      .filter((row) => !COVERED_BY_LOGIN.has(row.name) || row.value);
  }, [args.data.keys, checks]);

  const stats = useMemo(() => {
    const working = accounts.filter((row) => row.status === "ok" && (!row.id.startsWith("worker:") || row.lastCheckedAt)).length + mailboxes.filter((row) => row.status === "valid").length + keyRows.filter((row) => row.state === "ok").length;
    const attention = accounts.filter((row) => row.status === "needs_reauth").length + mailboxes.filter((row) => row.status !== "valid").length + keyRows.filter((row) => row.state === "error").length;
    const untested = keyRows.filter((row) => row.state === "untested" || row.state === "saved").length;
    return { working, attention, untested, providers: PROVIDERS.length, keys: keyRows.length };
  }, [accounts, keyRows, mailboxes]);

  /** Every email the dashboard touches, with the services connected under it. */
  const inUse = useMemo(() => {
    type Item = { label: string; ok: boolean; primary: boolean };
    const map = new Map<string, Item[]>();
    const push = (email: string, item: Item) => map.set(email, [...(map.get(email) || []), item]);
    for (const row of accounts) {
      push(row.email || "Email not reported", { label: providerMeta(row.provider).name, ok: row.status === "ok", primary: row.primary });
    }
    for (const row of mailboxes) {
      push(row.email, { label: row.provider === "icloud" ? "iCloud Mail" : `${row.provider || "Mailbox"} mail`, ok: row.status === "valid", primary: false });
    }
    const emails = [...new Set([...BOARD_EMAIL_LIST, ...map.keys()])];
    const rows = emails.map((email) => ({ email, items: map.get(email) || [], board: BOARD_EMAIL_LIST.includes(email) }));
    const misses: string[] = [];
    for (const [provider, email] of Object.entries(expected) as [ProviderId, string][]) {
      if (!email) continue;
      const linked = provider === "nylas" ? mailboxes.some((row) => row.email === email) : accounts.some((row) => row.provider === provider && row.email === email);
      const any = provider === "nylas" ? mailboxes.length > 0 : accounts.some((row) => row.provider === provider);
      if (!linked && any) misses.push(`${providerMeta(provider).name} is set to use ${email}, but is connected with a different account.`);
    }
    return { rows, misses };
  }, [accounts, mailboxes, expected]);

  const connect = useCallback(async (provider: ProviderId, hint?: string, app?: { clientId?: string; clientSecret?: string }) => {
    if (provider !== "nylas") {
      flag(`connect:${provider}`, true);
      try {
        if (app?.clientId) await integrationsApi.saveApp(provider, app.clientId, app.clientSecret || "");
        const account = hint || (provider === "google" ? "chrisgr33ninc@gmail.com" : "");
        const url = new URL("/api/oauth/start", window.location.origin);
        url.searchParams.set("provider", provider);
        url.searchParams.set("sid", tabId());
        if (account) url.searchParams.set("account", account);
        const framed = window.self !== window.top;
        if (framed) {
          const popup = window.open(url.toString(), "lifeos-oauth", "width=540,height=740");
          if (popup) return;
        }
        window.location.assign(url.toString());
      } catch (error) {
        say("error", message(error, `${providerMeta(provider).name} could not start.`));
        flag(`connect:${provider}`, false);
      }
      return;
    }
    flag(`connect:${provider}`, true);
    try {
      const { url } = await integrationsApi.start(provider, hint, !hint, app);
      if (!url.startsWith("http")) throw new Error("The login page did not come back.");
      window.location.assign(url);
    } catch (error) {
      say("error", message(error, `${providerMeta(provider).name} could not start.`));
      flag(`connect:${provider}`, false);
    }
  }, [say]);

  const testAccount = useCallback(async (account: AccountView) => {
    flag(account.id, true);
    try {
      const result = await integrationsApi.testAccount(account.id);
      const checkedAt = new Date().toISOString();
      const check = { state: result.ok ? "ok" as const : "error" as const, text: result.text, checkedAt };
      checksRef.current = { ...checksRef.current, [`account:${account.id}`]: check };
      setPayload((prev) => prev ? {
        ...prev,
        checks: { ...prev.checks, [`account:${account.id}`]: check },
        accounts: prev.accounts.map((row) => row.id === account.id ? paintChecked({ ...row, lastCheckedAt: null, lastError: "" }, check) : row),
      } : prev);
      say(result.ok ? "ok" : "error", `${providerMeta(account.provider).name}${account.email ? ` (${account.email})` : ""}: ${result.text}`);
    } catch (error) {
      say("error", message(error, "The check could not run."));
    } finally {
      await refresh();
      flag(account.id, false);
    }
    return undefined;
  }, [refresh, say]);

  const disconnect = useCallback(async (account: AccountView) => {
    flag(account.id, true);
    try {
      await integrationsApi.disconnectAccount(account.id);
      say("info", `${providerMeta(account.provider).name}${account.email ? ` (${account.email})` : ""} was disconnected.`);
    } catch (error) {
      say("error", message(error, "Disconnecting failed."));
    } finally {
      await refresh();
      flag(account.id, false);
    }
  }, [refresh, say]);

  const setExpected = useCallback(async (provider: ProviderId, email: string) => {
    flag(`expected:${provider}`, true);
    try {
      await integrationsApi.setExpected(provider, email.trim());
      say("ok", email.trim() ? `${providerMeta(provider).name} will use ${email.trim().toLowerCase()}.` : `${providerMeta(provider).name} can use any account.`);
    } catch (error) {
      say("error", message(error, "That could not be saved."));
    } finally {
      await refresh();
      flag(`expected:${provider}`, false);
    }
  }, [refresh, say]);

  const applyPlan = useCallback(async () => {
    flag("plan", true);
    try {
      await integrationsApi.setExpectedMany(recommendedPlan());
      say("ok", "Account plan applied: Google → Gmail, the iCloud mailbox → iCloud, every other platform → your work address.");
    } catch (error) {
      say("error", message(error, "The plan could not be applied."));
    } finally {
      await refresh();
      flag("plan", false);
    }
  }, [refresh, say]);

  const makePrimary = useCallback(async (account: AccountView) => {
    flag(account.id, true);
    try {
      await integrationsApi.makePrimary(account.id);
      say("ok", `${account.email || providerMeta(account.provider).name} is now the primary ${providerMeta(account.provider).name} account.`);
    } catch (error) {
      say("error", message(error, "That could not be changed."));
    } finally {
      await refresh();
      flag(account.id, false);
    }
  }, [refresh, say]);

  const testMailbox = useCallback(async (box: MailboxView) => {
    flag(box.id, true);
    try {
      const result = await integrationsApi.testMailbox(box.id);
      say(result.ok ? "ok" : "error", result.text);
    } catch (error) {
      say("error", message(error, "The check could not run."));
    } finally {
      await refresh();
      flag(box.id, false);
    }
  }, [refresh, say]);

  const disconnectMailbox = useCallback(async (box: MailboxView) => {
    flag(box.id, true);
    try {
      await integrationsApi.disconnectMailbox(box.id);
      say("info", `${box.email} was disconnected.`);
    } catch (error) {
      say("error", message(error, "Disconnecting failed."));
    } finally {
      await refresh();
      flag(box.id, false);
    }
  }, [refresh, say]);

  const saveKey = useCallback((name: string, value: string) => {
    const names = KEY_TWINS[name] || [name];
    update((prev) => ({ ...prev, keys: [...names.map((item) => ({ id: newId(), name: item, value })), ...prev.keys.filter((item) => !names.includes(item.name))] }));
  }, [update]);

  const removeKey = useCallback(async (name: string) => {
    const names = KEY_TWINS[name] || [name];
    update((prev) => ({ ...prev, keys: prev.keys.filter((item) => !names.includes(item.name)) }));
    await integrationsApi.forgetKey(name).catch(() => undefined);
    await refresh();
    say("info", `${name}: key removed.`);
  }, [refresh, say, update]);

  /** Tests a card. `value` and `extras` let the form test what was typed before it is saved. */
  const testKey = useCallback(async (name: string, value?: string, extras: Record<string, string> = {}) => {
    flag(`key:${name}`, true);
    try {
      const kind = ACCOUNT_SERVICES[name];
      if (kind) {
        const extra = EXTRA_FIELD[name];
        const key = (value ?? keyValue(name)).trim();
        const extraValue = extra ? (extras[extra.keyName] ?? keyValue(extra.keyName)).trim() : "";
        const result = await integrationsApi.testAccountService(name, kind, {
          key,
          secret: kind === "godaddy" ? extraValue : "",
          site: kind === "brilliant" ? extraValue : "",
          email: kind === "search-console" || kind === "google-analytics" ? "chris@ceogps.com" : googleEmail,
        });
        if (result.ok) {
          if (kind === "search-console" && result.site) saveKey("Search Console", result.site);
          if (kind === "google-analytics" && result.site) saveKey("Google Analytics", result.site);
          if (kind === "godaddy") { if (key) saveKey("GoDaddy", key); if (extraValue) saveKey("GoDaddy Secret", extraValue); }
          if (kind === "brilliant") { if (key) saveKey("Brilliant Directories", key); if (extraValue) saveKey("Brilliant Site", extraValue); }
        }
        say(result.ok ? "ok" : "error", `${name}: ${result.text}`);
        return result.ok ? "ok" as const : "error" as const;
      }
      const twin = (KEY_TWINS[name] || []).map(keyValue).find(Boolean) || "";
      const key = (value ?? keyValue(name)).trim() || twin;
      if (!key && !SERVER_HELD.has(name)) {
        say("error", `${name}: add a key first.`);
        return "error" as const;
      }
      const aux = GOOGLE_FAMILY.test(name) ? googleEmail || GMAIL_ACCOUNT
        : name === "grok2api" ? keyValue("grok2api URL")
        : name === "grok2api URL" ? keyValue("grok2api")
        : name === "Grok (xAI)" || name === "xAI" ? "chris@ceogps.com" : "";
      const result = await integrationsApi.testKey(name, key, aux);
      say(result.ok ? "ok" : result.checked === false ? "info" : "error", `${name}: ${result.text}`);
      return result.checked === false ? "saved" as const : result.ok ? "ok" as const : "error" as const;
    } catch (error) {
      say("error", `${name}: ${message(error, "The check could not run.")}`);
      return "error" as const;
    } finally {
      await refresh();
      flag(`key:${name}`, false);
    }
  }, [googleEmail, refresh, say, saveKey]);

  const testAll = useCallback(async () => {
    flag("all", true);
    let ok = 0;
    let bad = 0;
    try {
      const jobs: (() => Promise<boolean>)[] = [
        ...accounts.map((row) => async () => (await integrationsApi.testAccount(row.id).catch(() => ({ ok: false }))).ok),
        ...keyRows.filter((row) => row.value && !ACCOUNT_SERVICES[row.name]).map((row) => async () => {
          const result = await integrationsApi.testKey(row.name, row.value).catch(() => null);
          return Boolean(result?.ok || result?.checked === false);
        }),
      ];
      if (!jobs.length) { say("info", "Nothing is connected yet, so there is nothing to test."); return; }
      for (let index = 0; index < jobs.length; index += 4) {
        say("info", `Testing ${Math.min(index + 4, jobs.length)} of ${jobs.length}…`);
        const results = await Promise.all(jobs.slice(index, index + 4).map((job) => job()));
        for (const passed of results) { if (passed) ok += 1; else bad += 1; }
      }
      say(bad ? "error" : "ok", `${jobs.length} checked · ${ok} working${bad ? ` · ${bad} need attention` : ""}.`);
    } finally {
      await refresh();
      flag("all", false);
    }
  }, [accounts, keyRows, refresh, say]);

  const importSheet = useCallback((text: string) => {
    const found = sheetKeys(text, KEY_SERVICES.map((row) => row.name));
    if (!found.length) return "Nothing matched a service. Paste two columns (name, value) or lines like OPENAI_API_KEY=…";
    update((prev) => ({
      ...prev,
      keys: [
        ...found.map((row) => ({ id: newId(), name: row.name, value: row.value })),
        ...prev.keys.filter((row) => !found.some((item) => item.name === row.name)),
      ],
    }));
    const done = `Saved ${found.length} keys: ${found.map((row) => row.name).slice(0, 10).join(", ")}${found.length > 10 ? "…" : ""}. Press “Test everything” to verify them.`;
    say("ok", done);
    return done;
  }, [say, update]);

  const saveApp = useCallback(async (provider: ProviderId, clientId: string, clientSecret: string) => {
    flag(`app:${provider}`, true);
    try {
      await integrationsApi.saveApp(provider, clientId, clientSecret);
      say("ok", `${providerMeta(provider).name} app saved. Press Connect and pick the account on the next page.`);
    } catch (error) {
      say("error", message(error, "The app id and secret could not be saved."));
    } finally {
      await refresh();
      flag(`app:${provider}`, false);
    }
  }, [refresh, say]);

  return {
    payload, loading, loadError, busy, notice, dismiss: () => setNotice(null),
    byProvider, keyRows, stats, googleEmail,
    mailboxes, expected, inUse, setExpected, applyPlan, makePrimary, testMailbox, disconnectMailbox,
    refresh, connect, testAccount, disconnect, saveKey, removeKey, testKey, testAll, importSheet, saveApp,
  };
}
