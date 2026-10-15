create table if not exists public.lifeos_agents (
  name text primary key,
  soul text not null default '',
  personality text not null default '',
  instructions text not null default '',
  rules text not null default '',
  voice text not null default '',
  skin text not null default '',
  avatar text not null default '',
  task text not null default '',
  active boolean not null default false,
  updated_at timestamptz not null default now()
);
