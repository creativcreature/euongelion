-- Migration 016: add the onboarding columns that migration 009 defines but
-- prod's devotional_plan_instances is missing.
--
-- Prod's table was created from an earlier 009 that had start_policy +
-- cycle_start_at but NOT onboarding_variant / onboarding_days (those were added
-- to 009 later). The Soul Audit select route (Finish-line Wave 1D, onboarding
-- day-0 per SOURCE-OF-TRUTH #22) writes all four columns on every plan build, so
-- the missing two caused an INSERT failure → HTTP 500 on every build.
--
-- Additive + idempotent. Safe to run multiple times.

alter table public.devotional_plan_instances
  add column if not exists onboarding_variant text;

alter table public.devotional_plan_instances
  add column if not exists onboarding_days integer;
