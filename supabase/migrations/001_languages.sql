-- ============================================================================
-- Migration 001 — Presentation languages
-- Run this in the Supabase SQL editor on an existing project.
-- (For a fresh setup, schema.sql already includes everything below.)
-- ============================================================================

create table if not exists public.languages (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  rtl boolean not null default false,   -- right-to-left script (e.g. Persian, Arabic)
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.consultations
  add column if not exists language_id uuid references public.languages(id) on delete set null;

alter table public.languages enable row level security;

drop policy if exists "read languages" on public.languages;
create policy "read languages" on public.languages
  for select using (public.is_active());

drop policy if exists "admin write languages" on public.languages;
create policy "admin write languages" on public.languages
  for all using (public.is_admin()) with check (public.is_admin());

-- Seed the default language.
insert into public.languages (name, rtl) values ('English', false)
on conflict (name) do nothing;
