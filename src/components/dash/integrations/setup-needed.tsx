import { useState } from "react";
import type { ProviderMeta } from "@/lib/integrations/providers";
import { Button } from "./ui";

/**
 * Services whose server settings are missing, folded into one quiet group instead of a warning on every card.
 * One button copies every variable name, ready to paste into the host's settings.
 */
export function SetupNeeded({ providers, encryptionReady, needsNylas }: {
  providers: ProviderMeta[];
  encryptionReady: boolean;
  needsNylas: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const names = [
    ...(encryptionReady ? [] : ["INTEGRATIONS_ENCRYPTION_KEY"]),
    ...providers.flatMap((meta) => [`${meta.id.toUpperCase()}_CLIENT_ID`, `${meta.id.toUpperCase()}_CLIENT_SECRET`]),
    ...(needsNylas ? ["NYLAS_API_KEY", "NYLAS_CLIENT_ID"] : []),
  ];
  if (!names.length) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(names.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked: the names are on screen */ }
  }

  return (
    <details className="module-card p-4" aria-label="Needs server setup">
      <summary className="cursor-pointer text-sm font-medium text-white">
        Needs server setup · {providers.length + (needsNylas ? 1 : 0) + (encryptionReady ? 0 : 1)}
        <span className="ml-2 text-xs font-normal text-white/50">
          {providers.map((meta) => meta.name).join(", ")}{needsNylas ? `${providers.length ? ", " : ""}mailboxes` : ""}
        </span>
      </summary>
      <div className="mt-3 space-y-3">
        <p className="text-xs text-white/55">
          These services appear as soon as their settings exist on the server. Create an app at each provider, add the redirect address from docs/INTEGRATIONS.md, then set:
        </p>
        <pre className="max-h-48 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 text-xs text-white/80">{names.join("\n")}</pre>
        <Button onClick={() => void copy()} label="Copy the variable names">{copied ? "Copied" : "Copy variable names"}</Button>
      </div>
    </details>
  );
}
