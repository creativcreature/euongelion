-- Migration 013: Active Series + Scheduled Swap + Archived Series
--
-- Introduces the user-controlled "active devotional" concept:
--
--   * active_series           — one row per user; the series that renders
--                               on /daily-bread. PRIMARY KEY (user_id)
--                               enforces "one active at a time" at the DB
--                               level, eliminating app-level drift.
--   * scheduled_series_swap   — one row per user; a queued replacement
--                               that lazily promotes itself to active when
--                               now() >= starts_at (used by "Start on Monday").
--   * archived_series         — many rows per user (one per series).
--                               Paused / completed series the user can
--                               restart from the /library page.
--
-- Save state lives in the existing session_bookmarks table (see
-- migration 005 / repository.ts) — no schema change required there.

create table if not exists public.active_series (
  user_id uuid primary key references auth.users(id) on delete cascade,
  series_slug text not null,
  current_day int not null default 1 check (current_day >= 1),
  source text not null check (source in (
    'manual_start',
    'soul_audit',
    'restart_from_archive'
  )),
  started_at timestamptz not null default now(),
  last_opened_at timestamptz not null default now()
);

alter table public.active_series enable row level security;

create policy "active_series_own_select"
  on public.active_series for select
  using (auth.uid() = user_id);

create policy "active_series_own_insert"
  on public.active_series for insert
  with check (auth.uid() = user_id);

create policy "active_series_own_update"
  on public.active_series for update
  using (auth.uid() = user_id);

create policy "active_series_own_delete"
  on public.active_series for delete
  using (auth.uid() = user_id);

create table if not exists public.scheduled_series_swap (
  user_id uuid primary key references auth.users(id) on delete cascade,
  series_slug text not null,
  starts_at timestamptz not null,
  queued_at timestamptz not null default now()
);

alter table public.scheduled_series_swap enable row level security;

create policy "scheduled_series_swap_own_select"
  on public.scheduled_series_swap for select
  using (auth.uid() = user_id);

create policy "scheduled_series_swap_own_insert"
  on public.scheduled_series_swap for insert
  with check (auth.uid() = user_id);

create policy "scheduled_series_swap_own_update"
  on public.scheduled_series_swap for update
  using (auth.uid() = user_id);

create policy "scheduled_series_swap_own_delete"
  on public.scheduled_series_swap for delete
  using (auth.uid() = user_id);

create table if not exists public.archived_series (
  user_id uuid not null references auth.users(id) on delete cascade,
  series_slug text not null,
  furthest_day_reached int not null default 1 check (furthest_day_reached >= 1),
  archived_at timestamptz not null default now(),
  state text not null check (state in ('paused', 'completed')),
  primary key (user_id, series_slug)
);

alter table public.archived_series enable row level security;

create policy "archived_series_own_select"
  on public.archived_series for select
  using (auth.uid() = user_id);

create policy "archived_series_own_insert"
  on public.archived_series for insert
  with check (auth.uid() = user_id);

create policy "archived_series_own_update"
  on public.archived_series for update
  using (auth.uid() = user_id);

create policy "archived_series_own_delete"
  on public.archived_series for delete
  using (auth.uid() = user_id);

create index if not exists archived_series_archived_at_idx
  on public.archived_series (user_id, archived_at desc);
