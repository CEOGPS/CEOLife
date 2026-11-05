import { Button } from "./ui";

export type AttentionItem = { id: string; kind: "account" | "mailbox" | "key"; title: string; detail: string };

/** Everything that is broken right now in one place, each with the button that fixes it. */
export function AttentionList({ items, busy, onFix }: {
  items: AttentionItem[];
  busy: Record<string, boolean>;
  onFix: (item: AttentionItem) => void;
}) {
  if (!items.length) return null;
  return (
    <section className="space-y-2 rounded-2xl border border-rose-400/40 bg-rose-400/5 p-4" aria-label="Needs attention">
      <h3 className="text-sm font-semibold text-rose-200">Needs attention · {items.length}</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{item.title}</p>
              <p className="text-xs text-rose-200/80">{item.detail}</p>
            </div>
            <Button primary busy={Boolean(busy[item.kind === "account" ? `connect:${item.title.split(" ")[0].toLowerCase()}` : item.id])} onClick={() => onFix(item)} label={`${item.kind === "key" ? "Fix" : "Reconnect"} ${item.title}`}>
              {item.kind === "key" ? "Fix key" : "Reconnect"}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
