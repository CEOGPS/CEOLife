import { useState } from "react";
import { EXTRA_FIELD, KEY_LABEL, NO_KEY_NEEDED, SERVER_HELD } from "./catalog";
import type { KeyRowModel } from "./use-integrations";
import { mask, timeAgo, type Tone } from "./format";
import { Button, StatusPill } from "./ui";

const LOOK: Record<KeyRowModel["state"], { tone: Tone; label: string }> = {
  ok: { tone: "ok", label: "Verified" },
  error: { tone: "error", label: "Failed" },
  saved: { tone: "warn", label: "Saved · can't verify" },
  untested: { tone: "warn", label: "Saved · not tested" },
  empty: { tone: "idle", label: "Not added" },
};

const PLAIN_TEXT = new Set(["grok2api URL", "Google Analytics"]);

export function KeyRow({ row, busy, extraSaved, onSave, onTest, onRemove, onConnectWork }: {
  row: KeyRowModel;
  busy: boolean;
  extraSaved: string;
  onSave: (name: string, value: string, extras: Record<string, string>) => void;
  onTest: (name: string) => void;
  onRemove: (name: string) => void;
  onConnectWork?: () => void;
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
    <li className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{row.name}</p>
          <p className="text-xs text-white/50">
            {row.value && !loginOnly ? mask(row.value) : workGoogle ? "Uses chris@ceogps.com" : loginOnly ? "Uses your connected Google login" : SERVER_HELD.has(row.name) ? "Uses the server's credential, or add your own" : "No key yet"}
            {row.check ? ` · checked ${timeAgo(row.check.checkedAt)}` : ""}
          </p>
        </div>
        <StatusPill tone={look.tone}>{look.label}</StatusPill>
      </div>
      {row.check?.text ? <p className={`mt-1.5 text-xs ${row.state === "error" ? "text-rose-300" : "text-white/55"}`}>{row.check.text}</p> : null}

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
          {workGoogle && onConnectWork ? <Button primary onClick={onConnectWork}>Connect chris@ceogps.com</Button> : null}
          {loginOnly ? (
            <Button busy={busy} onClick={() => onTest(row.name)}>Test with Google</Button>
          ) : row.state === "empty" ? (
            <>
              {SERVER_HELD.has(row.name) ? <Button primary busy={busy} onClick={() => onTest(row.name)} label={`Test ${row.name}`}>Test</Button> : null}
              <Button primary={!SERVER_HELD.has(row.name)} onClick={open}>Add key</Button>
            </>
          ) : (
            <>
              <Button primary busy={busy} onClick={() => onTest(row.name)} label={`Test ${row.name}`}>Test</Button>
              <Button onClick={open} label={`Edit ${row.name}`}>Edit</Button>
              {confirm ? (
                <>
                  <Button danger onClick={() => { setConfirm(false); onRemove(row.name); }}>Yes, remove</Button>
                  <Button onClick={() => setConfirm(false)}>Keep</Button>
                </>
              ) : (
                <Button danger onClick={() => setConfirm(true)} label={`Remove ${row.name}`}>Remove</Button>
              )}
            </>
          )}
        </div>
      )}
    </li>
  );
}
