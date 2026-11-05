import type { ProviderId } from "@/lib/integrations/providers";
import { USED_BY } from "./used-by.generated";

/** Login cards cover several catalog names. Google's card also feeds Gmail, Calendar, Analytics and Search Console. */
const LOGIN_NAMES: Partial<Record<ProviderId, string[]>> = {
  google: ["Google", "Gmail (OAuth)", "Google Calendar", "Google Analytics", "Search Console", "YouTube"],
  microsoft: ["Microsoft", "Outlook", "Outlook Calendar"],
  github: ["GitHub"],
  slack: ["Slack"],
  notion: ["Notion"],
  spotify: ["Spotify"],
  discord: ["Discord"],
  facebook: ["Facebook", "Meta", "Facebook App ID"],
  linkedin: ["LinkedIn"],
  twitter: ["Twitter/X", "X"],
};

export function usedByLogin(id: ProviderId) {
  return [...new Set((LOGIN_NAMES[id] || []).flatMap((name) => USED_BY[name] || []))].sort();
}

export function usedByKey(name: string) {
  return USED_BY[name] || [];
}

/** Card footer: where in the dashboard this platform is used. Read from the source by scripts/used-by.mjs. */
export function UsedBy({ places }: { places: string[] }) {
  return (
    <footer className="mt-auto border-t border-white/10 pt-2 text-xs text-white/50">
      <span className="text-white/60">Used by: </span>
      {places.length ? places.join(" · ") : "No panel uses this yet."}
    </footer>
  );
}
