/**
 * Client-safe registry of the services that connect with one-click OAuth.
 * Endpoints, scopes and secrets live in `oauth.server.ts` and never ship to the browser.
 */
export type ProviderId =
  | "google" | "microsoft" | "github" | "slack" | "notion"
  | "spotify" | "discord" | "facebook" | "linkedin" | "twitter"
  /** Mailboxes (iCloud and others) connected through Nylas. Managed in the Mailboxes section, not as a login card. */
  | "nylas";

export type Category =
  | "Mail & Calendar" | "AI" | "Developer" | "Social" | "Media"
  | "Finance" | "Productivity" | "Marketing" | "Cloud" | "Other";

export type ProviderMeta = {
  id: ProviderId;
  name: string;
  category: Category;
  blurb: string;
  /** What the connection unlocks, shown on the card. */
  gives: string[];
};

export const PROVIDERS: ProviderMeta[] = [
  { id: "google", name: "Google", category: "Mail & Calendar", blurb: "Gmail, Calendar, Search Console and Analytics.", gives: ["Read Gmail", "Calendar sync", "Search Console", "Analytics"] },
  { id: "microsoft", name: "Microsoft", category: "Mail & Calendar", blurb: "Outlook mail and calendar.", gives: ["Outlook mail", "Calendar sync"] },
  { id: "github", name: "GitHub", category: "Developer", blurb: "Repos, issues and your profile.", gives: ["Repositories", "Issues & PRs"] },
  { id: "slack", name: "Slack", category: "Productivity", blurb: "Channels and messages for one workspace.", gives: ["Read channels", "Post messages"] },
  { id: "notion", name: "Notion", category: "Productivity", blurb: "Pages and databases you share with the app.", gives: ["Pages", "Databases"] },
  { id: "spotify", name: "Spotify", category: "Media", blurb: "Your playlists, library and search.", gives: ["Playlists", "Library", "Search"] },
  { id: "discord", name: "Discord", category: "Social", blurb: "Your profile and servers.", gives: ["Profile", "Servers"] },
  { id: "facebook", name: "Facebook", category: "Social", blurb: "Your profile and Pages.", gives: ["Profile", "Pages list"] },
  { id: "linkedin", name: "LinkedIn", category: "Social", blurb: "Your profile and posting.", gives: ["Profile", "Share posts"] },
  { id: "twitter", name: "X (Twitter)", category: "Social", blurb: "Your profile and posting.", gives: ["Profile", "Post"] },
];

export const NYLAS_META: ProviderMeta = {
  id: "nylas", name: "iCloud & other mailboxes", category: "Mail & Calendar",
  blurb: "Mailboxes the Email desk reads and sends from, connected through Nylas.", gives: ["Read mail", "Send mail"],
};

/** Every id the server understands: the login cards plus Nylas mailboxes. */
export const PROVIDER_IDS: ProviderId[] = [...PROVIDERS.map((row) => row.id), "nylas"];

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === "string" && (PROVIDER_IDS as string[]).includes(value);
}

export function providerMeta(id: ProviderId): ProviderMeta {
  return PROVIDERS.find((row) => row.id === id) ?? NYLAS_META;
}

/** Wire types shared by the API routes and the browser. */
export type AccountView = {
  id: string;
  provider: ProviderId;
  email: string;
  name: string;
  /** The account other desks use when a service has more than one linked. */
  primary: boolean;
  status: "ok" | "needs_reauth";
  scopes: string[];
  expiresAt: string | null;
  lastCheckedAt: string | null;
  lastError: string;
};

export type CheckView = { state: "ok" | "error" | "saved"; text: string; checkedAt: string };

/** A mailbox that lives in Nylas (status comes straight from Nylas). */
export type MailboxView = {
  id: string;
  email: string;
  provider: string;
  status: "valid" | "invalid" | string;
  createdAt: string | null;
};

export type IntegrationsPayload = {
  accounts: AccountView[];
  checks: Record<string, CheckView>;
  /** Providers whose CLIENT_ID and CLIENT_SECRET are set on the server. */
  configured: Record<ProviderId, boolean>;
  /** Mailboxes Nylas holds for this app. Empty with a `mailboxNote` when Nylas is not set up or could not be reached. */
  mailboxes: MailboxView[];
  mailboxNote: string;
  /** The email each service is meant to use, as the owner set it. Empty means "any". */
  expected: Partial<Record<ProviderId, string>>;
  /** App id typed on the card. The secret is never sent back. */
  apps: Partial<Record<ProviderId, { clientId: string; hasSecret: boolean }>>;
  /** False until INTEGRATIONS_ENCRYPTION_KEY (or BETTER_AUTH_SECRET) is set. Connecting is blocked until then. */
  encryptionReady: boolean;
};
