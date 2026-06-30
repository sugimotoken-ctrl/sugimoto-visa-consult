-- ============================================================================
-- Migration 002 — Per-pathway presentation prompt
-- Custom instructions the AI follows when writing slides for this pathway.
-- ============================================================================

alter table public.pathways add column if not exists prompt text;
