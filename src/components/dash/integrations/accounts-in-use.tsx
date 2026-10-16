import { Button, StatusPill } from "./ui";

type Row = { email: string; board: boolean; items: { label: string; ok: boolean; primary: boolean }[] };

/** Every email the dashboard uses, and which services are connected under it. */
export function AccountsInUse({ rows, misses, busy, onApplyPlan, onConnect }: {
  rows: Row[];
  misses: string[];
  busy: boolean;
  onApplyPlan: () => void;
  onConnect: (email: string) => void;
}) {
  return (
    <section className="module-card space-y-3 p-4" aria-label="Accounts in use">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">Accounts in use</h3>
          <p className="mt-1 max-w-2xl text-xs text-white/55">
            Different platforms can use different emails. Each connection keeps its own address, and this shows what is linked under each one.
          </p>
        </div>
        <Button busy={busy} onClick={onApplyPlan} label="Apply my usual account plan">Apply my usual setup</Button>
      </div>
      <ul className="grid gap-2 md:grid-cols-3">
        {rows.map((row) => (
          <li key={row.email} className="rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="truncate text-sm font-medium text-white" title={row.email}>{row.email}</p>
            <button type="button" className="mt-2 text-xs text-sky-300 underline" onClick={() => onConnect(row.email)}>Connect this address</button>
            {row.items.length ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {row.items.map((item, index) => (
                  <li key={`${item.label}-${index}`}><StatusPill tone={item.ok ? "ok" : "error"}>{item.label}</StatusPill></li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-white/45">{row.board ? "Nothing connected yet" : "No services"}</p>
            )}
          </li>
        ))}
      </ul>
      {misses.length ? (
        <ul className="space-y-1 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-xs text-amber-200">
          {misses.map((text) => <li key={text}>{text}</li>)}
        </ul>
      ) : null}
      <p className="text-xs text-white/45">
        “Usual setup” sets Google to the Gmail address, the iCloud mailbox to your iCloud address, and every other platform to your work address. It only changes which account each card expects; nothing is disconnected.
      </p>
    </section>
  );
}
