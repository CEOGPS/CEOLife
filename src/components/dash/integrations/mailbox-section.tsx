import { useState } from "react";
import type { MailboxView } from "@/lib/integrations/providers";
import { BOARD_EMAIL_LIST } from "./catalog";
import { timeAgo } from "./format";
import { Button, EmailText, StatusPill } from "./ui";
import { AppFields } from "./provider-card";

const LABEL: Record<string, string> = { icloud: "iCloud", google: "Google", microsoft: "Microsoft", imap: "IMAP" };

function BoxRow({ box, busy, onTest, onDisconnect, onReconnect }: {
  box: MailboxView;
  busy: boolean;
  onTest: () => Promise<string | void>;
  onDisconnect: () => void;
  onReconnect: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [detail, setDetail] = useState("");
  const good = box.status === "valid";
  return (
    <li className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white"><EmailText value={box.email} /></p>
          <p className="text-xs text-white/50">{LABEL[box.provider] || box.provider || "Mailbox"}{box.createdAt ? ` · added ${timeAgo(box.createdAt)}` : ""}</p>
        </div>
        <StatusPill tone={detail.startsWith("Checking") ? "warn" : detail && !good ? "error" : good ? "ok" : "error"}>{detail.startsWith("Checking") ? "Checking" : good ? "Listed" : "Not working"}</StatusPill>
      </div>
      {detail ? <p className={`mt-2 text-xs ${detail.startsWith("Checking") ? "text-amber-200" : /connected and valid/i.test(detail) ? "text-emerald-200" : "text-rose-300"}`}>{detail}</p> : <p className="mt-2 text-xs text-amber-200">Listed by Nylas. Press Test now to see if mail can actually be read.</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {good ? <Button busy={busy} onClick={() => { setDetail("Checking Nylas…"); void onTest().then((text) => setDetail(text || "Nylas did not say what happened.")); }} label="Test this mailbox">Test now</Button> : <Button primary busy={busy} onClick={onReconnect} label="Reconnect this mailbox">Reconnect</Button>}
        {confirm ? (
          <>
            <Button danger busy={busy} onClick={onDisconnect}>Yes, disconnect</Button>
            <Button onClick={() => setConfirm(false)}>Keep</Button>
          </>
        ) : (
          <Button danger onClick={() => setConfirm(true)} label="Disconnect this mailbox">Disconnect</Button>
        )}
      </div>
    </li>
  );
}

/** Mailboxes the Email desk reads and sends from. Live from Nylas, so it matches what the Email desk will really use. */
export function MailboxSection({ mailboxes, note, configured, expected, app, busy, onConnect, onTest, onDisconnect, onSaveApp }: {
  mailboxes: MailboxView[];
  note: string;
  configured: boolean;
  expected: string;
  app?: { clientId: string; hasSecret: boolean };
  busy: Record<string, boolean>;
  onConnect: (email: string) => void;
  onTest: (box: MailboxView) => Promise<string | void>;
  onDisconnect: (box: MailboxView) => void;
  onSaveApp: (clientId: string, clientSecret: string) => void;
}) {
  const [email, setEmail] = useState(expected);
  const have = new Set(mailboxes.map((row) => row.email));
  const suggestions = BOARD_EMAIL_LIST.filter((row) => !have.has(row));
  const connecting = Boolean(busy["connect:nylas"]);
  return (
    <section className="module-card space-y-3 p-4" aria-label="Mailboxes">
      <div>
        <h3 className="text-base font-semibold text-white">Mailboxes for the Email desk</h3>
        <p className="mt-1 text-xs text-white/55">iCloud and other mailboxes connect through Nylas. Each can be a different address from your logins above.</p>
      </div>
      {note ? <p className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-2 text-xs text-amber-200">{note}</p> : null}
      {mailboxes.length ? (
        <ul className="grid gap-2 md:grid-cols-2">
          {mailboxes.map((box) => (
            <BoxRow key={box.id} box={box} busy={Boolean(busy[box.id])} onTest={() => onTest(box)} onDisconnect={() => onDisconnect(box)} onReconnect={() => onConnect(box.email)} />
          ))}
        </ul>
      ) : !note ? <p className="text-sm text-white/55">No mailboxes are connected yet.</p> : null}
      <form className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3" onSubmit={(event) => { event.preventDefault(); onConnect(email.trim()); }}>
        <label htmlFor="mailbox-email" className="block text-xs text-white/60">Add a mailbox</label>
        <div className="flex flex-wrap gap-2">
          <input
            id="mailbox-email"
            type="email"
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="cagednreality@icloud.com"
            className="min-w-52 flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-sky-300"
          />
          <Button primary type="submit" disabled={!email.trim()} busy={connecting} label="Connect this mailbox">Connect mailbox</Button>
        </div>
        {suggestions.length ? (
          <div className="flex flex-wrap gap-1.5" aria-label="Your usual addresses">
            {suggestions.map((item) => <button key={item} type="button" className="int-chip" aria-pressed={email.toLowerCase() === item} onClick={() => setEmail(item)}><EmailText value={item} /></button>)}
          </div>
        ) : null}
        {!configured ? (
          <AppFields idLabel="Nylas application id" secretLabel="Nylas API key" clientId={app?.clientId || ""} hasSecret={Boolean(app?.hasSecret)} busy={Boolean(busy["app:nylas"])} onSave={onSaveApp} />
        ) : (
          <p className="text-xs text-white/45">iCloud asks for an app-specific password from appleid.apple.com. Nylas shows where to create it.</p>
        )}
      </form>
    </section>
  );
}
