import { useState } from "react";
import { CATEGORY_LABEL, type Integration } from "@/lib/integrations/catalog";
import type { Connection, ProviderInfo } from "./use-integrations";

export type Mark = { state: "connected" | "error" | "saved"; text: string };

export type CardHandlers = {
  connect: () => void;
  verify: () => void;
  disconnect: () => void;
  saveKey: (value: string) => void;
  testKey: (value?: string) => void;
  accountCheck: (values: { key?: string; secret?: string; site?: string }) => void;
};

const METHOD_LABEL: Record<string, string> = {
  oauth: "Sign in with the provider",
  apikey: "API key",
  local: "This computer",
  none: "No public API",
};

function mask(value: string) {
  const clean = value.trim();
  if (clean.length <= 8) return "saved";
  return `${clean.slice(0, 3)}····${clean.slice(-4)}`;
}

function Pill({ tone, label }: { tone: "ok" | "bad" | "warn" | "idle"; label: string }) {
  const style =
    tone === "ok"
      ? "border-[#34d399]/50 text-[#34d399]"
      : tone === "bad"
        ? "border-[#fb7185]/50 text-[#fb7185]"
        : tone === "warn"
          ? "border-[#fbbf24]/50 text-[#fbbf24]"
          : "border-white/15 text-white/50";
  const dot = tone === "ok" ? "bg-[#34d399]" : tone === "bad" ? "bg-[#fb7185]" : tone === "warn" ? "bg-[#fbbf24]" : "bg-white/30";
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wide ${style}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function when(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

export function ProviderCard({
  entry,
  connection,
  provider,
  oauthId,
  savedKey,
  mark,
  checked,
  busy,
  pending,
  onConnect,
  onVerify,
  onDisconnect,
  onSaveKey,
  onTestKey,
  onAccount,
  accountValue,
}: {
  entry: Integration;
  connection?: Connection;
  provider?: ProviderInfo;
  oauthId?: string;
  savedKey?: string;
  mark?: Mark;
  checked?: string;
  busy: boolean;
  pending: boolean;
  accountValue?: string;
  onConnect: () => void;
  onVerify: () => void;
  onDisconnect: () => void;
  onSaveKey: (value: string) => void;
  onTestKey: (value?: string) => void;
  onAccount: (values: { key?: string; secret?: string; site?: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [secret, setSecret] = useState("");
  const [site, setSite] = useState("");
  const [copied, setCopied] = useState(false);

  const supportsOauth = Boolean(oauthId);
  const connected = connection?.status === "connected";
  const failed = connection?.status === "error" || mark?.state === "error";
  const unconfigured = supportsOauth && provider && !provider.configured;
  const keyed = Boolean(savedKey);

  const tone: "ok" | "bad" | "warn" | "idle" = connected
    ? "ok"
    : failed
      ? "bad"
      : unconfigured || (!connected && !keyed && supportsOauth)
        ? "warn"
        : "idle";
  const statusLabel = connected
    ? "Connected"
    : failed
      ? "Failed"
      : unconfigured
        ? "Needs setup"
        : supportsOauth
          ? "Not connected"
          : keyed
            ? mark?.state === "connected" ? "Tested" : "Key saved"
            : entry.methods.includes("none")
              ? "Unsupported"
              : "Empty";

  const statusText = connected
    ? connection?.label || "Connected"
    : failed
      ? connection?.lastError || mark?.text || "The last check failed."
      : unconfigured
        ? `Server keys missing: ${provider?.missing.join(", ")}`
        : checked || mark?.text || "";

  function copyRedirect() {
    const value = provider?.redirectUri || "";
    if (!value) return;
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }).catch(() => undefined);
  }

  return (
    <article className="module-card flex flex-col gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-base leading-tight">{entry.name}</p>
          <p className="text-[11px] uppercase tracking-[0.12em] text-white/35">{CATEGORY_LABEL[entry.category]}</p>
        </div>
        <Pill tone={tone} label={statusLabel} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {entry.methods.map((method) => (
          <span key={method} className="rounded-full border border-line px-2 py-0.5 text-[11px] text-white/50">{METHOD_LABEL[method]}</span>
        ))}
      </div>

      {statusText ? (
        <p className={`text-sm leading-5 ${connected ? "text-[#34d399]" : failed ? "text-[#fb7185]" : "text-white/55"}`}>{statusText}</p>
      ) : null}

      {entry.summary && !statusText ? <p className="text-sm leading-5 text-white/50">{entry.summary}</p> : null}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        {supportsOauth ? (
          connected ? (
            <>
              <button type="button" className="quiet check-btn" disabled={busy} onClick={onVerify}>{busy ? "Testing" : "Test"}</button>
              <button type="button" className="quiet" disabled={busy} onClick={onConnect}>Reconnect</button>
              <button type="button" className="quiet" disabled={busy} onClick={onDisconnect}>Disconnect</button>
            </>
          ) : (
            <button type="button" className="quiet check-btn" disabled={busy || pending} onClick={onConnect}>
              {pending ? "Finishing…" : unconfigured ? "Connect anyway" : failed ? "Reconnect" : "Connect"}
            </button>
          )
        ) : null}

        {entry.methods.includes("local") ? (
          <button type="button" className="quiet check-btn" disabled={busy} onClick={() => onTestKey(savedKey)}>{busy ? "Testing" : "Test"}</button>
        ) : null}

        {!supportsOauth && entry.methods.includes("apikey") ? (
          <button type="button" className="quiet check-btn" disabled={busy || !keyed} onClick={() => onTestKey()}>{busy ? "Testing" : "Test"}</button>
        ) : null}

        {supportsOauth && entry.methods.includes("apikey") ? (
          <span className="text-[11px] text-white/35">API key fallback available</span>
        ) : null}

        {entry.methods.includes("none") ? <span className="text-[11px] text-white/35">Nothing to connect</span> : null}

        <button type="button" className="quiet" onClick={() => setOpen((value) => !value)}>{open ? "Hide" : "Details"}</button>
      </div>

      {open ? (
        <div className="mt-1 grid gap-3 border-t border-line pt-3">
          {entry.note ? <p className="text-sm leading-5 text-white/60">{entry.note}</p> : null}

          {entry.dependents.length ? (
            <p className="text-sm leading-5 text-white/50">
              <span className="text-white/70">Used by: </span>
              {entry.dependents.join(" · ")}
            </p>
          ) : null}

          {supportsOauth && provider ? (
            <div className="grid gap-2">
              <p className="text-[11px] uppercase tracking-[0.12em] text-white/35">Provider setup</p>
              {provider.scopes ? <p className="font-mono text-[11px] leading-5 text-white/45">{provider.scopes}</p> : <p className="text-[11px] text-white/45">No scopes are requested for this provider.</p>}
              <div className="flex flex-wrap items-center gap-2">
                {/* `min-w-0` lets this shrink inside the flex row: a nowrap URL
                    would otherwise force the whole panel wider than a phone. */}
                <code className="min-w-0 max-w-full truncate rounded-full border border-line bg-black/40 px-3 py-1 text-[11px] text-white/60">{provider.redirectUri}</code>
                <button type="button" className="quiet" onClick={copyRedirect}>{copied ? "Copied" : "Copy callback URL"}</button>
                <a className="quiet" href={provider.docs} target="_blank" rel="noreferrer noopener">Provider console</a>
              </div>
              {unconfigured ? (
                <p className="text-sm leading-5 text-[#fbbf24]">
                  Add {provider.missing.join(" and ")} to this project's secrets, then connect. The callback URL above must be allowed in the provider app.
                </p>
              ) : (
                <p className="text-sm leading-5 text-white/45">
                  Server keys are present. {provider.name} must allow the callback URL above.
                </p>
              )}
              {connected ? (
                <p className="text-[11px] text-white/40">
                  {connection?.verifiedAt ? `Verified ${when(connection.verifiedAt)}` : "Not verified yet"}
                  {connection?.expiresAt ? ` · token expires ${when(connection.expiresAt)}` : ""}
                </p>
              ) : null}
              {connection?.lastError ? <p className="text-sm leading-5 text-[#fb7185]">{connection.lastError}</p> : null}
            </div>
          ) : null}

          {entry.account ? (
            <div className="grid gap-2">
              <p className="text-[11px] uppercase tracking-[0.12em] text-white/35">
                {entry.account === "google-analytics" ? "Property to read" : entry.account === "godaddy" ? "GoDaddy key and secret" : entry.account === "brilliant" ? "Directory key and site" : "Check"}
              </p>
              {entry.account === "google-analytics" ? (
                <input className="h-9 min-w-0 rounded-full border border-line bg-black/40 px-3 text-sm" placeholder="GA4 property ID" value={draft} onChange={(event) => setDraft(event.target.value)} />
              ) : null}
              {entry.account === "godaddy" || entry.account === "brilliant" ? (
                <>
                  <input className="h-9 min-w-0 rounded-full border border-line bg-black/40 px-3 text-sm" placeholder={entry.account === "godaddy" ? "key:secret" : "API key"} value={draft} onChange={(event) => setDraft(event.target.value)} />
                  {entry.account === "brilliant" ? (
                    <input className="h-9 min-w-0 rounded-full border border-line bg-black/40 px-3 text-sm" placeholder="https://ceogps.com" value={site} onChange={(event) => setSite(event.target.value)} />
                  ) : null}
                  <input className="h-9 min-w-0 rounded-full border border-line bg-black/40 px-3 text-sm" placeholder="secret (GoDaddy only)" value={secret} onChange={(event) => setSecret(event.target.value)} />
                </>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="quiet check-btn" disabled={busy} onClick={() => onAccount({ key: draft, secret, site })}>{busy ? "Checking" : "Check"}</button>
                {entry.account === "search-console" || entry.account === "google-analytics" ? (
                  <span className="text-[11px] text-white/40">Runs as the connected Google login.</span>
                ) : null}
              </div>
              {checked ? <p className="text-sm leading-5 text-white/55">{checked}</p> : null}
              {accountValue ? <p className="text-[11px] text-white/40">Saved · {accountValue}</p> : null}
            </div>
          ) : null}

          {entry.methods.includes("apikey") && !supportsOauth ? (
            <div className="grid gap-2">
              <p className="text-[11px] uppercase tracking-[0.12em] text-white/35">API key</p>
              <input
                className="h-9 min-w-0 rounded-full border border-line bg-black/40 px-3 text-sm"
                placeholder={entry.name === "Ollama (local)" ? "http://127.0.0.1:11434" : "Paste key"}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="quiet is-on"
                  disabled={!draft.trim()}
                  onClick={() => {
                    onSaveKey(draft.trim());
                    setDraft("");
                  }}
                >
                  Save and test
                </button>
                {keyed ? <span className="text-[11px] text-white/40">On file · {mask(savedKey || "")}</span> : null}
              </div>
              {checked || mark?.text ? <p className="text-sm leading-5 text-white/55">{checked || mark?.text}</p> : null}
            </div>
          ) : null}

          {entry.methods.includes("apikey") && supportsOauth ? (
            <div className="grid gap-2">
              <p className="text-[11px] uppercase tracking-[0.12em] text-white/35">API key fallback</p>
              <input
                className="h-9 min-w-0 rounded-full border border-line bg-black/40 px-3 text-sm"
                placeholder="Paste a key instead of signing in"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="quiet"
                  disabled={!draft.trim() || !entry.probe}
                  onClick={() => {
                    onSaveKey(draft.trim());
                    setDraft("");
                  }}
                >
                  Use this key
                </button>
                {entry.probe ? <button type="button" className="quiet check-btn" disabled={busy || !keyed} onClick={() => onTestKey()}>{busy ? "Testing" : "Test key"}</button> : <span className="text-[11px] text-white/35">No public key check for this service</span>}
                {keyed ? <span className="text-[11px] text-white/40">On file · {mask(savedKey || "")}</span> : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
