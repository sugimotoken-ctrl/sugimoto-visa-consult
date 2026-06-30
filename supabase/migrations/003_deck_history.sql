-- ============================================================================
-- Migration 003 — Presentation history
-- One row per generated presentation, so every version is kept and listed.
-- ============================================================================

create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  storage_path text not null,
  url text,
  language text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_decks_consultation on public.decks(consultation_id);

alter table public.decks enable row level security;

drop policy if exists "own decks history" on public.decks;
create policy "own decks history" on public.decks
  for all
  using (exists (
    select 1 from public.consultations c
    where c.id = decks.consultation_id
      and (c.consultant_id = auth.uid() or public.is_admin())
  ))
  with check (exists (
    select 1 from public.consultations c
    where c.id = decks.consultation_id
      and (c.consultant_id = auth.uid() or public.is_admin())
  ));
