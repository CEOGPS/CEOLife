alter table public.lifeos_agents add column if not exists memory jsonb not null default '{}'::jsonb;
