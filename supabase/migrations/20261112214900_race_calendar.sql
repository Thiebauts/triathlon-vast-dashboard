-- Race calendar: races the club might go to, and members' plans for them.
-- Applied to Supabase project "triathlon-vast-dashboard" (eu-north-1) on 2026-11-12.

create table public.races (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  name text not null check (char_length(name) between 2 and 120),
  sport text not null check (sport in ('triathlon','duathlon','swimrun','running','swimming','cycling','skiing','other')),
  race_date date,                      -- null while the organiser hasn't announced it
  date_note text check (char_length(date_note) <= 80),
  place text check (char_length(place) <= 120),
  distance text check (char_length(distance) <= 120),
  url text check (url ~ '^https://'),
  registration text not null default 'unknown'
    check (registration in ('open','sold_out','not_open','unknown')),
  created_at timestamptz not null default now()
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references public.races(id) on delete cascade,
  person_name text not null check (char_length(btrim(person_name)) between 2 and 60),
  status text not null check (status in ('registered','planning','maybe','looking_for_ticket','selling_ticket')),
  offers_ride boolean not null default false,
  needs_ride boolean not null default false,
  note text check (char_length(note) <= 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One entry per person per race (case-insensitive name)
create unique index plans_race_person on public.plans (race_id, lower(btrim(person_name)));
create index plans_race on public.plans (race_id);

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

create trigger plans_touch before update on public.plans
  for each row execute function public.touch_updated_at();

-- Row level security
alter table public.races enable row level security;
alter table public.plans enable row level security;

-- Races: everyone reads; only the owner changes them (through SQL), so no
-- write policy for the public key.
create policy "races are public" on public.races for select to anon, authenticated using (true);

-- Plans: TEST PHASE, no log-in. Anyone with the page can read and edit.
-- Replace these with per-member policies before the page goes public.
create policy "plans readable (test phase)" on public.plans for select to anon, authenticated using (true);
create policy "plans insertable (test phase)" on public.plans for insert to anon, authenticated with check (true);
create policy "plans updatable (test phase)" on public.plans for update to anon, authenticated using (true) with check (true);
create policy "plans deletable (test phase)" on public.plans for delete to anon, authenticated using (true);
