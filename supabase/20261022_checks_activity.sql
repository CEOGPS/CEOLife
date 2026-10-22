-- Source of truth for connector probes, the activity feed, daily briefs, and per-project budget lines.
-- Applied to project mhvcdstgkyplhzjptgfr.

create table if not exists public.integration_checks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  subject text not null,
  state text not null check (state in ('green', 'red')),
  detail text not null default '',
  provider text not null default '',
  checked_at timestamptz not null default now(),
  unique (user_id, subject)
);
create index if not exists integration_checks_user_checked on public.integration_checks (user_id, checked_at desc);
alter table public.integration_checks enable row level security;
drop policy if exists integration_checks_owner_select on public.integration_checks;
create policy integration_checks_owner_select on public.integration_checks
  for select to authenticated
  using (user_id = (select auth.uid())::text);

create table if not exists public.activity_feed (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  source text not null,
  kind text not null,
  title text not null,
  body text not null default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists activity_feed_user_created on public.activity_feed (user_id, created_at desc);
alter table public.activity_feed enable row level security;
drop policy if exists activity_feed_owner_select on public.activity_feed;
create policy activity_feed_owner_select on public.activity_feed
  for select to authenticated
  using (user_id = (select auth.uid())::text);

create table if not exists public.daily_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  day date not null,
  kind text not null,
  body text not null,
  source text not null,
  created_at timestamptz not null default now(),
  unique (user_id, day, kind)
);
alter table public.daily_briefs enable row level security;
drop policy if exists daily_briefs_owner_select on public.daily_briefs;
create policy daily_briefs_owner_select on public.daily_briefs
  for select to authenticated
  using (user_id = (select auth.uid())::text);

create table if not exists public.project_budget_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null references public.projects (id) on delete cascade,
  label text not null,
  amount_cents integer not null,
  kind text not null default 'expense',
  created_at timestamptz not null default now()
);
create index if not exists project_budget_lines_project on public.project_budget_lines (project_id, created_at desc);
alter table public.project_budget_lines enable row level security;
drop policy if exists project_budget_owner on public.project_budget_lines;
create policy project_budget_owner on public.project_budget_lines
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
