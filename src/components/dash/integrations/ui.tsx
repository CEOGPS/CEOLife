import type { ReactNode } from "react";
import type { Tone } from "./format";

const TONE: Record<Tone, string> = {
  ok: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  error: "border-rose-400/40 bg-rose-400/10 text-rose-300",
  warn: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  idle: "border-white/15 bg-white/5 text-white/55",
};

export function EmailText({ value }: { value: string }) {
  const safe = value.replace(/[&<>"']/g, (ch) => {
    if (ch === "&") return "\u0026amp;";
    if (ch === "<") return "\u0026lt;";
    if (ch === ">") return "\u0026gt;";
    if (ch === "\"") return "\u0026quot;";
    return "\u0026#39;";
  });
  return <span dangerouslySetInnerHTML={{ __html: `<!--email_off-->${safe}<!--/email_off-->` }} />;
}

export function StatusPill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE[tone]}`}>
      <span aria-hidden="true" className={`size-1.5 rounded-full ${tone === "ok" ? "bg-emerald-400" : tone === "error" ? "bg-rose-400" : tone === "warn" ? "bg-amber-300" : "bg-white/40"}`} />
      {children}
    </span>
  );
}

export function Button({ children, onClick, busy, disabled, primary, danger, label, type = "button" }: {
  children: ReactNode;
  onClick?: () => void;
  busy?: boolean;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
  label?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      aria-label={label}
      onClick={onClick}
      disabled={disabled || busy}
      className={`int-btn ${primary ? "int-btn--primary" : danger ? "int-btn--danger" : ""}`}
    >
      {busy ? <span aria-hidden="true" className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : null}
      {children}
    </button>
  );
}

/** A selectable filter chip (styles live in styles.css so the app's flat button reset does not hide the selected state). */
export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className="int-chip">
      {children}
    </button>
  );
}
