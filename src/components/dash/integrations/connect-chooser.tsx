import { useState } from "react";
import { Button, StatusPill } from "./ui";

export type ConnectChoice = { mode: "choose" } | { mode: "email"; email: string };
export type ChooserOption = { email: string; tag: string };

const CHOOSE = "__choose__";
const OTHER = "__other__";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * "Which account do you want to connect?" Shown before the provider's own sign-in page.
 * A named address is preselected there and any other login is refused; "choose on the provider's page"
 * lets the person pick there and accepts whatever they pick.
 */
export function ConnectChooser({ provider, options, initial, busy, onContinue, onCancel }: {
  provider: string;
  options: ChooserOption[];
  initial: string;
  busy: boolean;
  onContinue: (choice: ConnectChoice) => void;
  onCancel: () => void;
}) {
  const start = initial && options.some((row) => row.email === initial) ? initial : CHOOSE;
  const [picked, setPicked] = useState(start);
  const [other, setOther] = useState("");
  const name = `connect-${provider.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  const typed = other.trim().toLowerCase();
  const invalid = picked === OTHER && !EMAIL.test(typed);

  function submit() {
    if (picked === CHOOSE) return onContinue({ mode: "choose" });
    if (picked === OTHER) return onContinue({ mode: "email", email: typed });
    return onContinue({ mode: "email", email: picked });
  }

  return (
    <form
      className="space-y-3 rounded-xl border border-sky-300/30 bg-sky-400/5 p-3"
      aria-label={`Choose the ${provider} account to connect`}
      onSubmit={(event) => { event.preventDefault(); if (!invalid) submit(); }}
    >
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-white">Which {provider} account?</legend>
        {options.map((row) => (
          <label key={row.email} className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/90 has-[:checked]:border-sky-300/60">
            <input type="radio" name={name} value={row.email} checked={picked === row.email} onChange={() => setPicked(row.email)} />
            <span className="min-w-0 flex-1 truncate">{row.email}</span>
            {row.tag ? <StatusPill tone="idle">{row.tag}</StatusPill> : null}
          </label>
        ))}
        <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/90 has-[:checked]:border-sky-300/60">
          <input className="mt-1" type="radio" name={name} value={CHOOSE} checked={picked === CHOOSE} onChange={() => setPicked(CHOOSE)} />
          <span>
            Let me choose on {provider}’s page
            <span className="block text-xs text-white/50">You pick the account there. Whatever you pick is accepted.</span>
          </span>
        </label>
        <label className="flex cursor-pointer flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/90 has-[:checked]:border-sky-300/60">
          <input type="radio" name={name} value={OTHER} checked={picked === OTHER} onChange={() => setPicked(OTHER)} />
          <span>A different email</span>
          <input
            type="email"
            aria-label="Email address to connect"
            autoComplete="off"
            value={other}
            onFocus={() => setPicked(OTHER)}
            onChange={(event) => { setOther(event.target.value); setPicked(OTHER); }}
            placeholder="name@example.com"
            className="min-w-40 flex-1 rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-sm text-white outline-none focus:border-sky-300"
          />
        </label>
      </fieldset>
      {picked !== CHOOSE ? (
        <p className="text-xs text-white/50">{provider} will be asked to use this address. If a different account signs in, nothing is saved.</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button primary type="submit" busy={busy} disabled={invalid} label={`Continue to ${provider}`}>Continue to {provider}</Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
