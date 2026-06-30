-- ============================================================================
-- Migration 004 — Odoo CRM integration (read-only import)
-- Links consultations to Odoo leads, maps Odoo tags to consultants, and stores
-- the sync configuration. Run in the Supabase SQL editor.
-- ============================================================================

-- Link a consultation back to its Odoo lead + record where it came from.
alter table public.consultations add column if not exists odoo_lead_id bigint;
alter table public.consultations add column if not exists source text not null default 'manual';
create unique index if not exists uq_consultations_odoo_lead
  on public.consultations(odoo_lead_id) where odoo_lead_id is not null;

-- Map an Odoo Salesperson to a consultant in this tool (sets imported owner).
create table if not exists public.odoo_user_map (
  id uuid primary key default gen_random_uuid(),
  odoo_user_id bigint not null unique,
  odoo_user_name text not null,
  consultant_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.odoo_user_map enable row level security;
drop policy if exists "admin manage user map" on public.odoo_user_map;
create policy "admin manage user map" on public.odoo_user_map
  for all using (public.is_admin()) with check (public.is_admin());

-- Map an Odoo CRM tag to a destination country (e.g. "Canada" -> Canada).
create table if not exists public.odoo_tag_country_map (
  id uuid primary key default gen_random_uuid(),
  odoo_tag_id bigint not null unique,
  odoo_tag_name text not null,
  country_id uuid references public.countries(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.odoo_tag_country_map enable row level security;
drop policy if exists "admin manage tag country" on public.odoo_tag_country_map;
create policy "admin manage tag country" on public.odoo_tag_country_map
  for all using (public.is_admin()) with check (public.is_admin());

-- Single-row sync configuration (which CRM stage to import from).
create table if not exists public.odoo_config (
  id int primary key default 1,
  source_stage_id bigint,
  source_stage_name text,
  enabled boolean not null default false,
  last_synced_at timestamptz,
  last_sync_result text,
  constraint odoo_config_single_row check (id = 1)
);
alter table public.odoo_config enable row level security;
drop policy if exists "admin manage odoo config" on public.odoo_config;
create policy "admin manage odoo config" on public.odoo_config
  for all using (public.is_admin()) with check (public.is_admin());
insert into public.odoo_config (id) values (1) on conflict (id) do nothing;
