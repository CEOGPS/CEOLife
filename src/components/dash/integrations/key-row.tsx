import { useState } from "react";
import { EXTRA_FIELD, KEY_LABEL, NO_KEY_NEEDED, PUBLIC_TEST, SERVER_HELD, oauthStartHref } from "./catalog";
import type { KeyRowModel } from "./use-integrations";
import { mask, timeAgo, type Tone } from "./format";
import { Button, EmailText, StatusPill } from "./ui";
import { UsedBy, usedByKey } from "./used-by";

const LOOK: Record<KeyRowModel["state"], { tone: Tone; label: string }> = {
  ok: { tone: "ok", label: "Working" },
  error: { tone: "error", label: "Not working" },
  saved: { tone: "idle", label: "Stored only" },
  untested: { tone: "warn", label: "Not tested" },
  empty: { tone: "idle", label: "Not added" },
};

const PLAIN_TEXT = new Set(["grok2api URL", "Google Analytics"]);

export function KeyRow({ row, busy, extraSaved, onSave, onTest, onRemove, onRemoveCard }: {
  row: KeyRowModel;
  busy: boolean;
  extraSaved: string;
  onSave: (name: string, value: string, extras: Record<string, string>) => void;
  onTest: (name: string) => void;
  onRemove: (name: string) => void;
  onRemoveCard?: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [value, setValue] = useState("");
  const [extra, setExtra] = useState("");
  const look = LOOK[row.state];
  const extraField = EXTRA_FIELD[row.name];
  const loginOnly = NO_KEY_NEEDED.has(row.name);
  const label = row.name in KEY_LABEL ? KEY_LABEL[row.name] : "API key";
  const workGoogle = row.name === "Search Console" || row.name === "Google Analytics";
  const optional = row.name === "Google Analytics";
  const id = `key-${row.name.replace(/[^a-z0-9]+/gi, "-")}`;

  function open() {
    setValue(row.value);
    setExtra(extraSaved);
    setEditing(true);
  }

  function submit() {
    const extras = extraField ? { [extraField.keyName]: extra.trim() } : {};
    onSave(row.name, value.trim(), extras);
    setEditing(false);
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">
            {row.custom && row.url && /^https?:\/\//i.test(row.url) ? <a href={row.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{row.name}</a> : row.name}
          </p>
          <p className="text-xs text-white/50">
            {row.value && !loginOnly ? mask(row.value) : workGoogle ? "Uses your connected Google accounts" : loginOnly ? "Uses your connected Google login" : SERVER_HELD.has(row.name) ? "Uses the server's credential, or add your own" : PUBLIC_TEST.has(row.name) ? "Public endpoint. Not your account." : "No key yet"}
            {row.check ? ` · checked ${timeAgo(row.check.checkedAt)}` : ""}
          </p>
        </div>
        <StatusPill tone={look.tone}>{look.label}</StatusPill>
      </div>
      {row.check?.text ? <p className={`mt-1.5 text-xs ${row.state === "error" ? "text-rose-300" : row.state === "ok" ? "text-emerald-200" : "text-amber-200"}`}>{row.check.text}</p> : null}

      {editing ? (
        <form className="mt-3 space-y-2" onSubmit={(event) => { event.preventDefault(); submit(); }}>
          <label htmlFor={id} className="block text-xs text-white/60">{label}</label>
          <input
            id={id}
            autoFocus
            type={PLAIN_TEXT.has(row.name) ? "text" : "password"}
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={optional ? "Optional" : "Paste it here"}
            className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-sky-300"
          />
          {extraField ? (
            <>
              <label htmlFor={`${id}-extra`} className="block text-xs text-white/60">{extraField.label}</label>
              <input
                id={`${id}-extra`}
                type={extraField.secret ? "password" : "text"}
                autoComplete="off"
                spellCheck={false}
                value={extra}
                onChange={(event) => setExtra(event.target.value)}
                placeholder={extraField.placeholder}
                className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-sky-300"
              />
            </>
          ) : null}
          <div className="flex gap-2">
            <Button primary type="submit" disabled={!optional && !value.trim()}>Save &amp; test</Button>
            <Button onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </form>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {workGoogle && row.state !== "ok" ? <a className="int-btn" href={oauthStartHref("google", "ceogps.marketinggod@gmail.com")} target="_top" rel="noopener">Connect Google</a> : null}
          {loginOnly ? (
            <Button busy={busy} onClick={() => onTest(row.name)}>Test with Google</Button>
          ) : row.state === "empty" ? (
            <>
              {SERVER_HELD.has(row.name) || PUBLIC_TEST.has(row.name) ? <Button primary busy={busy} onClick={() => onTest(row.name)} label={`Test ${row.name}`}>Test</Button> : null}
              <Button primary={!SERVER_HELD.has(row.name) && !PUBLIC_TEST.has(row.name)} onClick={open}>Add key</Button>
              {row.custom && onRemoveCard ? <Button danger onClick={() => onRemoveCard(row.name)} label={`Remove the ${row.name} card`}>Remove card</Button> : null}
            </>
          ) : (
            <>
              <Button primary busy={busy} onClick={() => onTest(row.name)} label={`Test ${row.name}`}>Test</Button>
              <Button onClick={open} label={`Edit ${row.name}`}>Edit</Button>
              {confirm ? (
                <>
                  <Button danger onClick={() => { setConfirm(false); if (row.custom && onRemoveCard) onRemoveCard(row.name); else onRemove(row.name); }}>Yes, remove</Button>
                  <Button onClick={() => setConfirm(false)}>Keep</Button>
                </>
              ) : (
                <Button danger onClick={() => setConfirm(true)} label={`Remove ${row.name}`}>Remove</Button>
              )}
            </>
          )}
        </div>
      )}
      <UsedBy places={usedByKey(row.name)} />
    </li>
  );
}
