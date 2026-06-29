-- ============================================================================
-- Sugimoto Visa — Consultation Follow-up Deck Generator
-- Database schema, RLS policies, triggers, storage bucket.
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('admin', 'consultant');
exception when duplicate_object then null; end $$;

do $$ begin
  create type account_status as enum ('pending', 'active', 'disabled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type deck_status as enum ('draft', 'generating', 'ready', 'error');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- admin_emails: emails that should become admin/active on signup.
-- Seeded by `npm run seed:admin`.
-- ---------------------------------------------------------------------------
create table if not exists public.admin_emails (
  email text primary key
);

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role user_role not null default 'consultant',
  status account_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Reference data (admin-managed)
-- ---------------------------------------------------------------------------
create table if not exists public.pathways (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  requirements text,
  talking_points text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.countries (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references public.countries(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (country_id, name)
);

create table if not exists public.languages (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  rtl boolean not null default false,   -- right-to-left script (e.g. Persian, Arabic)
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Consultations + children
-- ---------------------------------------------------------------------------
create table if not exists public.consultations (
  id uuid primary key default gen_random_uuid(),
  consultant_id uuid not null references public.profiles(id) on delete cascade,
  client_email text not null,
  applicant_name text not null,
  applicant_age int,
  applicant_background text,
  spouse_name text,
  spouse_age int,
  spouse_background text,
  pathway_id_1 uuid references public.pathways(id) on delete set null,
  pathway_id_2 uuid references public.pathways(id) on delete set null,
  country_id uuid references public.countries(id) on delete set null,
  city_id uuid references public.cities(id) on delete set null,
  language_id uuid references public.languages(id) on delete set null,
  deck_status deck_status not null default 'draft',
  deck_url text,
  deck_error text,
  created_at timestamptz not null default now()
);

create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  name text not null,
  age int,
  background text,
  sort_order int not null default 0
);

create index if not exists idx_consultations_consultant on public.consultations(consultant_id);
create index if not exists idx_children_consultation on public.children(consultation_id);
create index if not exists idx_cities_country on public.cities(country_id);

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER → bypass RLS, avoid policy recursion)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

create or replace function public.is_active()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'active'
  );
$$;

-- ---------------------------------------------------------------------------
-- New-user trigger: create profile, promote configured admin emails.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_seed_admin boolean;
begin
  select exists(select 1 from public.admin_emails where lower(email) = lower(new.email))
    into is_seed_admin;

  insert into public.profiles (id, email, full_name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case when is_seed_admin then 'admin'::user_role else 'consultant'::user_role end,
    case when is_seed_admin then 'active'::account_status else 'pending'::account_status end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.pathways      enable row level security;
alter table public.countries     enable row level security;
alter table public.cities        enable row level security;
alter table public.languages     enable row level security;
alter table public.consultations enable row level security;
alter table public.children      enable row level security;
alter table public.admin_emails  enable row level security;

-- profiles
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles
  for update using (id = auth.uid() or public.is_admin());

drop policy if exists "admin manage profiles" on public.profiles;
create policy "admin manage profiles" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- reference data: any active user can read; only admins write
drop policy if exists "read pathways" on public.pathways;
create policy "read pathways" on public.pathways
  for select using (public.is_active());
drop policy if exists "admin write pathways" on public.pathways;
create policy "admin write pathways" on public.pathways
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "read countries" on public.countries;
create policy "read countries" on public.countries
  for select using (public.is_active());
drop policy if exists "admin write countries" on public.countries;
create policy "admin write countries" on public.countries
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "read cities" on public.cities;
create policy "read cities" on public.cities
  for select using (public.is_active());
drop policy if exists "admin write cities" on public.cities;
create policy "admin write cities" on public.cities
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "read languages" on public.languages;
create policy "read languages" on public.languages
  for select using (public.is_active());
drop policy if exists "admin write languages" on public.languages;
create policy "admin write languages" on public.languages
  for all using (public.is_admin()) with check (public.is_admin());

-- consultations: consultant owns theirs; admins read all
drop policy if exists "own consultations" on public.consultations;
create policy "own consultations" on public.consultations
  for all
  using (consultant_id = auth.uid() or public.is_admin())
  with check (consultant_id = auth.uid() or public.is_admin());

-- children: gated by parent consultation ownership
drop policy if exists "own children" on public.children;
create policy "own children" on public.children
  for all
  using (exists (
    select 1 from public.consultations c
    where c.id = children.consultation_id
      and (c.consultant_id = auth.uid() or public.is_admin())
  ))
  with check (exists (
    select 1 from public.consultations c
    where c.id = children.consultation_id
      and (c.consultant_id = auth.uid() or public.is_admin())
  ));

-- admin_emails: only admins (service role bypasses RLS for seeding)
drop policy if exists "admin read admin_emails" on public.admin_emails;
create policy "admin read admin_emails" on public.admin_emails
  for select using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage bucket for generated decks (private; access via signed URLs)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('decks', 'decks', false)
on conflict (id) do nothing;

drop policy if exists "active users read decks" on storage.objects;
create policy "active users read decks" on storage.objects
  for select using (bucket_id = 'decks' and public.is_active());

-- ---------------------------------------------------------------------------
-- Seed default language
-- ---------------------------------------------------------------------------
insert into public.languages (name, rtl) values ('English', false)
on conflict (name) do nothing;

-- Inserts/updates to the decks bucket are done server-side with the service role.
