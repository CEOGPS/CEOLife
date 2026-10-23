import { useState } from "react";
import { oauthStartHref } from "./catalog";
import { Button, EmailText, StatusPill } from "./ui";

type Row = { email: string; board: boolean; items: { label: string; ok: boolean; primary: boolean }[] };

/** Every email the dashboard uses, and which services are connected under it. */
export function AccountsInUse({ rows, misses, busy, removing, onApplyPlan, onConnect, onRemove, onAdd }: {
  rows: Row[];
  misses: string[];
  busy: boolean;
  removing: string;
  onApplyPlan: () => void;
  onConnect: (email: string) => void;
  onRemove: (email: string) => void;
  onAdd: (email: string) => void;
}) {
  const [confirm, setConfirm] = useState("");
  const [draft, setDraft] = useState("");
  return (
    <section className="module-card space-y-3 p-4" aria-label="Accounts in use">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">Accounts in use</h3>
          <p className="mt-1 max-w-2xl text-xs text-white/55">
            These addresses sit above the mailboxes. Remove one to free it, then add the email you want to connect.
          </p>
        </div>
        <Button busy={busy} onClick={onApplyPlan} label="Apply my usual account plan">Apply my usual setup</Button>
      </div>
      {rows.length ? (
      <ul className="grid gap-2 md:grid-cols-3">
        {rows.map((row) => {
          const key = row.email.toLowerCase();
          const google = key === "chrisgr33ninc@gmail.com" || key === "chris@ceogps.com";
          const href = google ? oauthStartHref("google", row.email) : "";
          const services = row.items.map((item) => item.label).join(", ");
          const pending = removing === row.email.toLowerCase();
          return (
          <li key={row.email} className="rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="truncate text-sm font-medium text-white"><EmailText value={row.email} /></p>
            {href ? (
              <a className="mt-2 inline-block text-xs text-sky-300 underline" href={href} target="_top" rel="noopener">Connect this address</a>
            ) : (
              <button type="button" className="mt-2 text-xs text-sky-300 underline" onClick={() => onConnect(row.email)}>Connect this address</button>
            )}
            {row.items.length ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {row.items.map((item, index) => (
                  <li key={`${item.label}-${index}`}><StatusPill tone={item.ok ? "ok" : "error"}>{item.label}</StatusPill></li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-white/45">{row.board ? "Nothing connected yet" : "No services"}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {confirm === row.email ? (
                <>
                  <p className="w-full text-xs text-white/70">{services ? `Remove ${row.email} and disconnect ${services}?` : `Remove ${row.email} from this list?`}</p>
                  <Button danger busy={pending} onClick={() => onRemove(row.email)} label={`Remove ${row.email}`}>Yes, remove</Button>
                  <Button onClick={() => setConfirm("")}>Keep</Button>
                </>
              ) : (
                <Button danger onClick={() => setConfirm(row.email)} label={`Remove ${row.email}`}>Remove</Button>
              )}
            </div>
          </li>
          );
        })}
      </ul>
      ) : <p className="text-sm text-white/55">No emails on this list. Add the address you want to use.</p>}
      <form className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3" onSubmit={(event) => { event.preventDefault(); const email = draft.trim(); if (!email.includes("@")) return; onAdd(email); setDraft(""); }}>
        <label htmlFor="account-in-use-email" className="block text-xs text-white/60">Add an email</label>
        <div className="flex flex-wrap gap-2">
          <input
            id="account-in-use-email"
            type="email"
            autoComplete="off"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="name@example.com"
            className="min-w-52 flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-sky-300"
          />
          <Button primary type="submit" disabled={!draft.trim()} label="Add this email to the list">Add email</Button>
        </div>
      </form>
      {misses.length ? (
        <ul className="space-y-1 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-xs text-amber-200">
          {misses.map((text) => <li key={text}>{text}</li>)}
        </ul>
      ) : null}
      <p className="text-xs text-white/45">
        Usual setup puts your Gmail address, your iCloud address, and your work address back on this list. Google uses the Gmail address, the iCloud mailbox uses the iCloud address, and every other platform uses the work address. It does not disconnect a login.
      </p>
    </section>
  );
}
