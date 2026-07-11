-- Migration 017: Reminder window scheduling on push_subscriptions (F-070)
--
-- Adds the "one quiet word" time-window model to push subscriptions so the
-- hourly sender (Supabase edge function send-daily-push, fired by pg_cron)
-- can deliver at most ONE push per reader-local calendar day, inside the
-- reader's chosen window:
--
--   reminder_window  which local-time window the reader chose:
--                      early_morning (5-7) · morning (7-9) ·
--                      midday (12-14)      · evening (19-21)
--                    Windows are [startHour, endHour) in the reader's local
--                    time. Canonical definition:
--                    src/lib/push/reminder-window.ts (mirrored in the edge fn).
--   timezone         IANA timezone reported by the subscribing browser
--                    (Intl.DateTimeFormat().resolvedOptions().timeZone),
--                    validated by the API at save time. NULL is evaluated as
--                    UTC by the sender.
--   last_sent_date   the reader-local calendar date (YYYY-MM-DD) of the last
--                    delivered nudge. The sender writes this after a
--                    successful send and skips any subscription whose
--                    last_sent_date already equals today's local date, which
--                    makes the hourly cron idempotent (never two sends/day).
--
-- Existing rows default to 'morning': those readers opted in under the
-- "one quiet word each morning" promise, which morning (7-9) preserves.
--
-- Writes remain service-role only (RLS deny-by-default posture from
-- migration 015 is unchanged).
--
-- DO NOT RUN automatically — apply via the normal migration process
-- (Supabase dashboard SQL editor, same as migrations 001-016). Apply BEFORE
-- setting the VAPID keys / deploying the updated send-daily-push function:
-- both the settings reminder card and the sender select these columns and
-- surface an explicit error if they are missing.

alter table public.push_subscriptions
  add column if not exists reminder_window text not null default 'morning',
  add column if not exists timezone text,
  add column if not exists last_sent_date date;

-- Named check constraint added separately so re-running this migration is
-- safe (ADD COLUMN IF NOT EXISTS would not re-add, but a duplicate named
-- constraint would error — guard it).
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'push_subscriptions_reminder_window_check'
      and conrelid = 'public.push_subscriptions'::regclass
  ) then
    alter table public.push_subscriptions
      add constraint push_subscriptions_reminder_window_check
      check (reminder_window in ('early_morning', 'morning', 'midday', 'evening'));
  end if;
end
$$;
