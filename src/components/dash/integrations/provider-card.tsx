import { useState } from "react";
import type { AccountView, ProviderMeta } from "@/lib/integrations/providers";
import { BOARD_EMAIL_LIST } from "./catalog";
import { timeAgo } from "./format";
import { Button, StatusPill } from "./ui";

const ACCENT: Record<string, string> = {
  google: "#4285f4", microsoft: "#00a4ef", github: "#8b949e", slack: "#e01e5a", notion: "#e5e5e5",
  spotify: "#1db954", discord: "#5865f2", facebook: "#1877f2", linkedin: "#0a66c2", twitter: "#9aa4b2",
};

/** "Which account should this service use?" Shows the choice and lets the owner change it. */
function ExpectedRow({ expected, busy, onSave, label }: { expected: string; busy: boolean; onSave: (email: string) => void; label: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(expected);
  const id = `expected-${label.replace(/[^a-z0-9]+/gi, "-")}`;
  if (!editing) {
    return (
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/60">
        <span>Account to use:</span>
        <strong className="font-medium text-white/85">{expected || "any account"}</strong>
        <button type="button" className="underline decoration-white/30 hover:text-white" onClick={() => { setValue(expected); setEditing(true); }} aria-label={`Change the account ${label} uses`}>
          {expected ? "Change" : "Choose"}
        </button>
      </p>
    );
  }
  return (
    <form className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-3" onSubmit={(event) => { event.preventDefault(); onSave(value.trim()); setEditing(false); }}>
      <label htmlFor={id} className="block text-xs text-white/60">Which email should {label} use?</label>
      <input
        id={id}
        type="email"
        autoComplete="off"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="name@example.com"
        className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-sky-300"
      />
      <div className="flex flex-wrap gap-1.5" aria-label="Your usual addresses">
        {BOARD_EMAIL_LIST.map((email) => (
          <button key={email} type="button" className="int-chip" aria-pressed={value.toLowerCase() === email} onClick={() => setValue(email)}>{email}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button primary type="submit" busy={busy}>Save</Button>
        {expected ? <Button onClick={() => { onSave(""); setEditing(false); }}>Use any account</Button> : null}
        <Button onClick={() => setEditing(false)}>Cancel</Button>
      </div>
    </form>
  );
}

function AccountRow({ account, expected, several, busy, onTest, onDisconnect, onMakePrimary }: {
  account: AccountView;
  expected: string;
  several: boolean;
  busy: boolean;
  onTest: () => void;
  onDisconnect: () => void;
  onMakePrimary: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const bad = account.status === "needs_reauth";
  const untested = account.id.startsWith("worker:") && !account.lastCheckedAt;
  const off = Boolean(expected) && Boolean(account.email) && account.email.toLowerCase() !== expected.toLowerCase();
  return (
    <li className="rounded-lg border border-white/10 bg-black/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{account.email || account.name || "Connected account"}</p>
          <p className="text-xs text-white/50">
            {untested ? "Not tested yet" : bad ? "Needs reconnecting" : `Checked ${timeAgo(account.lastCheckedAt)}`}
            {account.name && account.email ? ` · ${account.name}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {several && account.primary ? <StatusPill tone="ok">Primary</StatusPill> : null}
          <StatusPill tone={untested ? "idle" : bad ? "error" : "ok"}>{untested ? "Not tested" : bad ? "Needs attention" : "Working"}</StatusPill>
        </div>
      </div>
      {off ? <p className="mt-2 text-xs text-amber-200">This is not the expected account ({expected}). It is saved, but other desks may prefer a different one.</p> : null}
      {account.lastError ? <p className={`mt-2 text-xs ${bad ? "text-rose-300" : "text-emerald-200"}`}>{account.lastError}</p> : null}
      <div className="mt-2 flex flex-wrap gap-2">
        <Button busy={busy} onClick={onTest} label={`Test ${account.email || "account"}`}>Test now</Button>
        {several && !account.primary ? <Button busy={busy} onClick={onMakePrimary} label={`Make ${account.email || "account"} the primary account`}>Make primary</Button> : null}
        {confirm ? (
          <>
            <Button danger busy={busy} onClick={onDisconnect}>Yes, disconnect</Button>
            <Button onClick={() => setConfirm(false)}>Keep</Button>
          </>
        ) : (
          <Button danger onClick={() => setConfirm(true)} label={`Disconnect ${account.email || "account"}`}>Disconnect</Button>
        )}
      </div>
    </li>
  );
}

export function AppFields({ idLabel, secretLabel, clientId, hasSecret, busy, onSave }: {
  idLabel: string;
  secretLabel: string;
  clientId: string;
  hasSecret: boolean;
  busy: boolean;
  onSave: (clientId: string, clientSecret: string) => void;
}) {
  const [id, setId] = useState(clientId);
  const [secret, setSecret] = useState("");
  return (
    <form className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-3" onSubmit={(event) => { event.preventDefault(); onSave(id.trim(), secret.trim()); }}>
      <label className="block text-xs text-white/60">{idLabel}
        <input className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-sky-300" value={id} autoComplete="off" onChange={(event) => setId(event.target.value)} />
      </label>
      <label className="block text-xs text-white/60">{secretLabel}{hasSecret ? " (already saved — type a new one only to replace it)" : ""}
        <input className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-sky-300" type="password" value={secret} autoComplete="off" onChange={(event) => setSecret(event.target.value)} />
      </label>
      <Button primary type="submit" busy={busy}>Save</Button>
    </form>
  );
}

export function ProviderCard({ meta, accounts, expected, configured, encryptionReady, app, busy, onConnect, onTest, onDisconnect, onMakePrimary, onSaveExpected, onSaveApp }: {
  meta: ProviderMeta;
  accounts: AccountView[];
  expected: string;
  configured: boolean;
  encryptionReady: boolean;
  app?: { clientId: string; hasSecret: boolean };
  busy: Record<string, boolean>;
  onConnect: (clientId: string, clientSecret: string) => void;
  onTest: (account: AccountView) => void;
  onDisconnect: (account: AccountView) => void;
  onMakePrimary: (account: AccountView) => void;
  onSaveExpected: (email: string) => void;
  onSaveApp: (clientId: string, clientSecret: string) => void;
}) {
  const needs = accounts.filter((row) => row.status === "needs_reauth").length;
  const ok = accounts.length - needs;
  const tone = needs ? "error" : ok ? "ok" : "idle";
  const label = needs ? "Needs attention" : ok ? (ok > 1 ? `${ok} connected` : "Connected") : "Not connected";
  const [clientId, setClientId] = useState(app?.clientId || "");
  const [clientSecret, setClientSecret] = useState("");
  return (
    <article className="module-card flex flex-col gap-3 p-4" aria-label={`${meta.name} connection`}>
      <header className="flex items-start gap-3">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl text-base font-bold text-black" style={{ background: ACCENT[meta.id] || "#94a3b8" }}>
          {meta.name.slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-white">{meta.name}</h3>
          <p className="text-xs text-white/50">{meta.category}</p>
        </div>
        <StatusPill tone={tone}>{label}</StatusPill>
      </header>
      <p className="text-sm text-white/65">{meta.blurb}</p>
      <ExpectedRow expected={expected} busy={Boolean(busy[`expected:${meta.id}`])} onSave={onSaveExpected} label={meta.name} />
      {!accounts.length ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="What it unlocks">
          {meta.gives.map((item) => <li key={item} className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-white/60">{item}</li>)}
        </ul>
      ) : (
        <ul className="space-y-2">
          {accounts.map((account) => (
            <AccountRow
              key={account.id}
              account={account}
              expected={expected}
              several={accounts.length > 1}
              busy={Boolean(busy[account.id])}
              onTest={() => onTest(account)}
              onDisconnect={() => onDisconnect(account)}
              onMakePrimary={() => onMakePrimary(account)}
            />
          ))}
        </ul>
      )}
      <form className="mt-auto space-y-2 pt-1" onSubmit={(event) => { event.preventDefault(); onConnect(clientId.trim(), clientSecret.trim()); }}>
        {!configured ? (
          <>
            <label className="block text-xs text-white/60">Client ID
              <input className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-sky-300" value={clientId} autoComplete="off" onChange={(event) => setClientId(event.target.value)} />
            </label>
            <label className="block text-xs text-white/60">Client secret{app?.hasSecret ? " (saved — leave blank to keep it)" : ""}
              <input className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-sky-300" type="password" value={clientSecret} autoComplete="off" onChange={(event) => setClientSecret(event.target.value)} />
            </label>
          </>
        ) : null}
        <Button primary type="submit" busy={Boolean(busy[`connect:${meta.id}`])} label={`${needs ? "Reconnect" : accounts.length ? "Add another" : "Connect"} ${meta.name}`}>
          {needs ? "Reconnect" : accounts.length ? "Add another account" : `Connect ${meta.name}`}
        </Button>
      </form>
    </article>
  );
}
