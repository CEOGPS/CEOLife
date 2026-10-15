export type Note = { id: string; title: string; body: string };
export type Task = { id: string; title: string; done: boolean };
export type Lead = { id: string; name: string; source: string; status: string; url?: string; note?: string };
export type Notif = { id: string; text: string; source: string; seen: boolean };
export type AgentJob = { id: string; agent: string; task: string; active: boolean };
export type Account = { id: string; name: string; balance: number; prior: number; kind?: string; institution?: string; last4?: string };
export type Product = { id: string; name: string; cost: number; revenue: number };
export type Expense = { id: string; name: string; amount: number; paid: boolean; fixed: boolean; category?: string };
export type WeekEvent = { id: string; day: number; title: string; date?: string; start?: string; end?: string; where?: string; who?: string; remind?: boolean };
export type QuickLink = { id: string; label: string; href: string };
export type Track = { id: string; title: string; url: string; artist: string; album: string; playlist: string; page: string; art: string };
export type Series = { id: string; label: string; points: number[] };

export type Board = {
  logo: string;
  banner: string;
  notes: Note[];
  tasks: Task[];
  leads: Lead[];
  notifs: Notif[];
  jobs: AgentJob[];
  accounts: Account[];
  products: Product[];
  fico: number;
  vantage: number;
  expenses: Expense[];
  events: WeekEvent[];
  links: QuickLink[];
  tracks: Track[];
  social: Series[];
  marketing: Series[];
};

export const emptyBoard = (): Board => ({
  logo: "",
  banner: "",
  notes: [],
  tasks: [],
  leads: [],
  notifs: [],
  jobs: [],
  accounts: [],
  products: [],
  fico: 0,
  vantage: 0,
  expenses: [],
  events: [],
  links: [],
  tracks: [],
  social: [],
  marketing: [],
});

function arr<T>(value: unknown, map: (row: unknown) => T | null, max = 80): T[] {
  if (!Array.isArray(value)) return [];
  return value.map(map).filter((row): row is T => row !== null).slice(0, max);
}

const HUB_NOTE = /^(Agent|Chat|Hub|Voice|Kranos) · /;

function oneNote(row: unknown): Note | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Note;
  const title = text(r.title, 80);
  if (!title) return null;
  const roomy = HUB_NOTE.test(title) || title.startsWith("Doc ·") || title.startsWith("Sheet ·");
  return { id: text(r.id, 40) || crypto.randomUUID(), title, body: text(r.body, roomy ? 20000 : 4000) };
}

function notesOf(value: unknown): Note[] {
  if (!Array.isArray(value)) return [];
  const hub = new Map<string, Note>();
  const rest: Note[] = [];
  for (const row of value) {
    const note = oneNote(row);
    if (!note) continue;
    if (!HUB_NOTE.test(note.title)) {
      rest.push(note);
      continue;
    }
    const prev = hub.get(note.title);
    if (!prev || note.body.length >= prev.body.length) hub.set(note.title, note);
  }
  return [...hub.values(), ...rest].slice(0, 400);
}

function text(value: unknown, max: number) {
  return String(value ?? "").slice(0, max);
}

function num(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function score(value: unknown) {
  if (value === undefined || value === null || value === "") return 0;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 300 || n > 850) return 0;
  return Math.round(n);
}

const STUB_LEADS = new Set(["lead-nextdoor\u0000Neighborhood intro ask\u0000Nextdoor\u0000New", "lead-group\u0000Local group recommendation\u0000Facebook Groups\u0000Warm"]);
const STUB_NOTIFS = new Set(["n1\u0000Two warm leads have no next step.\u0000Leads", "n2\u0000Phone bill is still unpaid this cycle.\u0000Budget"]);
const STUB_JOBS = new Set(["j1\u0000Erebus\u0000Read the board each morning\u00001", "j2\u0000Kranos\u0000Queue the unpaid bills\u00000"]);
const STUB_ACCOUNTS = new Set(["a1\u0000Bank\u00004200\u00003900", "a2\u0000Stripe\u0000860\u0000640", "a3\u0000Cards\u0000-1200\u0000-1480", "a4\u0000Cash App\u0000140\u000090", "a5\u0000Venmo\u000075\u000060", "a6\u0000OnePay\u0000310\u0000300", "a7\u0000Credit Karma\u00000\u00000"]);
const STUB_PRODUCTS = new Set(["p1\u0000Listings\u0000200\u0000900", "p2\u0000Retainers\u0000400\u00001800"]);
const STUB_EXPENSES = new Set(["e1\u0000Rent\u00001450\u00001\u00001", "e2\u0000Phone\u000085\u00000\u00001"]);
const STUB_SERIES = new Set([
  "s1\u0000Followers\u0000120,128,131,140,138,150,156",
  "s2\u0000Reach\u0000800,640,910,1000,870,1200,1100",
  "m1\u0000Site visits\u000040,55,48,70,66,80,74",
  "m2\u0000Leads\u00002,1,3,2,4,3,5",
]);

export function sanitizeBoard(input: unknown): Board {
  const base = emptyBoard();
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const board: Board = {
    logo: text(raw.logo, 500_000),
    banner: text(raw.banner, 500_000),
    notes: notesOf(raw.notes),
    tasks: arr(raw.tasks, (row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Task;
      return { id: text(r.id, 40) || crypto.randomUUID(), title: text(r.title, 140), done: Boolean(r.done) };
    }),
    leads: arr(raw.leads, (row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Lead;
      const name = text(r.name, 120);
      if (!name) return null;
      return {
        id: text(r.id, 40) || crypto.randomUUID(),
        name,
        source: text(r.source, 80),
        status: text(r.status, 40) || "New",
        url: text(r.url, 400),
        note: text(r.note, 400),
      };
    }, 200),
    notifs: arr(raw.notifs, (row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Notif;
      return { id: text(r.id, 40) || crypto.randomUUID(), text: text(r.text, 200), source: text(r.source, 40), seen: Boolean(r.seen) };
    }),
    jobs: arr(raw.jobs, (row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as AgentJob;
      return { id: text(r.id, 40) || crypto.randomUUID(), agent: text(r.agent, 40), task: text(r.task, 160), active: Boolean(r.active) };
    }),
    accounts: arr(raw.accounts, (row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Account;
      return {
        id: text(r.id, 40) || crypto.randomUUID(),
        name: text(r.name, 40),
        balance: num(r.balance, -1_000_000, 10_000_000, 0),
        prior: num(r.prior, -1_000_000, 10_000_000, 0),
        kind: text((r as Account).kind, 24),
        institution: text((r as Account).institution, 40),
        last4: text((r as Account).last4, 4).replace(/\D/g, ""),
      };
    }),
    products: arr(raw.products, (row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Product;
      return {
        id: text(r.id, 40) || crypto.randomUUID(),
        name: text(r.name, 40),
        cost: num(r.cost, 0, 10_000_000, 0),
        revenue: num(r.revenue, 0, 10_000_000, 0),
      };
    }),
    fico: score(raw.fico),
    vantage: score(raw.vantage),
    expenses: arr(raw.expenses, (row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Expense;
      return {
        id: text(r.id, 40) || crypto.randomUUID(),
        name: text(r.name, 60),
        amount: num(r.amount, 0, 1_000_000, 0),
        paid: Boolean(r.paid),
        fixed: Boolean(r.fixed),
        category: text((r as Expense).category, 24),
      };
    }),
    events: arr(raw.events, (row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as WeekEvent;
      const date = text(r.date, 10);
      const start = text(r.start, 5);
      const end = text(r.end, 5);
      return {
        id: text(r.id, 40) || crypto.randomUUID(),
        day: num(r.day, 0, 6, 0),
        title: text(r.title, 80),
        ...( /^\d{4}-\d{2}-\d{2}$/.test(date) ? { date } : {} ),
        ...( /^\d{2}:\d{2}$/.test(start) ? { start } : {} ),
        ...( /^\d{2}:\d{2}$/.test(end) ? { end } : {} ),
        ...( text(r.where, 80) ? { where: text(r.where, 80) } : {} ),
        ...( text(r.who, 80) ? { who: text(r.who, 80) } : {} ),
        ...( r.remind ? { remind: true } : {} ),
      };
    }),
    links: arr(raw.links, (row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as QuickLink;
      const href = text(r.href, 300);
      if (!/^https?:\/\//i.test(href)) return null;
      return { id: text(r.id, 40) || crypto.randomUUID(), label: text(r.label, 60), href };
    }),
    tracks: arr(raw.tracks, (row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Track;
      const url = text(r.url, 2000);
      const page = text(r.page, 2000);
      const local = url.startsWith("idb:");
      if (url && !local && !/^https?:\/\//i.test(url)) return null;
      if (!url && !/^https?:\/\//i.test(page)) return null;
      return {
        id: text(r.id, 40) || crypto.randomUUID(),
        title: text(r.title, 120),
        url,
        artist: text(r.artist, 80),
        album: text(r.album, 80),
        playlist: text(r.playlist, 40) || "Library",
        page,
        art: text(r.art, 400),
      };
    }, 400),
    social: series(raw.social, base.social).filter((row) => !STUB_SERIES.has(`${row.id}\u0000${row.label}\u0000${row.points.join(",")}`)),
    marketing: series(raw.marketing, base.marketing).filter((row) => !STUB_SERIES.has(`${row.id}\u0000${row.label}\u0000${row.points.join(",")}`)),
  };
  board.leads = board.leads.filter((row) => !STUB_LEADS.has(`${row.id}\u0000${row.name}\u0000${row.source}\u0000${row.status}`));
  board.notifs = board.notifs.filter((row) => !STUB_NOTIFS.has(`${row.id}\u0000${row.text}\u0000${row.source}`));
  board.jobs = board.jobs.filter((row) => !STUB_JOBS.has(`${row.id}\u0000${row.agent}\u0000${row.task}\u0000${row.active ? 1 : 0}`));
  board.accounts = board.accounts.filter((row) => !STUB_ACCOUNTS.has(`${row.id}\u0000${row.name}\u0000${row.balance}\u0000${row.prior}`));
  board.products = board.products.filter((row) => !STUB_PRODUCTS.has(`${row.id}\u0000${row.name}\u0000${row.cost}\u0000${row.revenue}`));
  board.expenses = board.expenses.filter((row) => !STUB_EXPENSES.has(`${row.id}\u0000${row.name}\u0000${row.amount}\u0000${row.paid ? 1 : 0}\u0000${row.fixed ? 1 : 0}`));
  if (board.fico === 712 && board.vantage === 698 && board.accounts.length === 0) {
    board.fico = 0;
    board.vantage = 0;
  }
  return board;
}

function series(value: unknown, fallback: Series[]): Series[] {
  const rows = arr(value, (row) => {
    if (!row || typeof row !== "object") return null;
    const r = row as Series;
    const points = Array.isArray(r.points) ? r.points.slice(0, 7).map((n) => num(n, 0, 1_000_000, 0)) : [];
    while (points.length < 7) points.push(0);
    return { id: text(r.id, 40) || crypto.randomUUID(), label: text(r.label, 40), points };
  });
  return rows.length ? rows.slice(0, 4) : fallback;
}

export function band(value: number) {
  if (value < 300) return "No score";
  if (value < 580) return "Poor";
  if (value < 670) return "Fair";
  if (value < 740) return "Good";
  return "Great";
}

export function moneyTips(board: Board) {
  const unpaid = board.expenses.filter((row) => !row.paid);
  const debt = board.accounts.filter((row) => row.balance < 0);
  const tips = [];
  if (unpaid.length) tips.push(`Pay ${unpaid.map((row) => row.name).join(", ")} before adding new spend.`);
  if (debt.length) tips.push(`${debt[0].name} is negative. Extra cash should hit that before savings.`);
  if (board.fico >= 300 && board.fico < 740) tips.push("Keep card use under 30% of the limit to move the FICO band.");
  if (!tips.length) tips.push(board.accounts.length ? "No unpaid bill or negative account is on the board." : "No accounts or bills are saved yet.");
  return tips.slice(0, 3);
}

export function insights(board: Board) {
  const open = board.tasks.filter((row) => !row.done).length;
  const warm = board.leads.filter((row) => row.status !== "Closed").length;
  const net = board.accounts.reduce((sum, row) => sum + row.balance, 0);
  const accounts = board.accounts.length;
  return [
    `${open} open tasks and ${warm} open leads.`,
    accounts ? `Net across ${accounts} account${accounts === 1 ? "" : "s"} is $${net.toLocaleString()}.` : "No accounts are saved yet.",
    board.notes.length ? `Newest note: ${board.notes[0].title || "Untitled"}.` : "No notes yet.",
  ];
}

export const LIFE_HACKS = [
  { title: "2-Minute Rule", body: "If it takes under two minutes, do it now." },
  { title: "Pay Yourself First", body: "Move 10% aside before any other spend." },
  { title: "Batch Email", body: "Open mail at three set times, not all day." },
  { title: "48-Hour Cart", body: "Wait two days on anything that is not a bill or a job." },
  { title: "3 Big Rocks", body: "Three tasks finish the day. The rest can wait." },
  { title: "Mirror Test", body: "If you would not say it in person, do not send it." },
];

export function lifeHacks(board: Board) {
  const hacks = [
    "Block the first 25 minutes after wake-up for the oldest unpaid bill or oldest lead.",
  ];
  if (board.events.length === 0) hacks.push("Put one real appointment on the 7-day strip so the week is not only tasks.");
  if (board.links.length === 0) hacks.push("Pin the sheet you open every morning in Quicklinks so you stop hunting for it.");
  hacks.push("One compliment or check-in to a saved contact beats another hour in a feed.");
  return hacks.slice(0, 3);
}
