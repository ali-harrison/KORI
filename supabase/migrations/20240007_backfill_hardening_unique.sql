-- ============================================================
-- KORI/GYM — Backfill: objects from 20240005 that never applied
-- ============================================================
--
-- 20240005_hardening.sql was applied out of band via the SQL Editor and
-- only partially landed: its two column/CHECK-constraint sections went
-- through, but the two uniqueness objects below did not. This migration
-- exists solely to backfill those two objects. It does not touch anything
-- already live (gc_event_id column, the three status CHECK constraints) —
-- re-running those would fail, since 20240005's statements aren't
-- idempotent past its two `add column if not exists` lines.
--
-- Idempotent so `db push` is safe to run again if needed.

-- members: verbatim from 20240005_hardening.sql line 17, unchanged except
-- for `if not exists`. Re-verified zero duplicate (gym_id, lower(email))
-- pairs against live data before writing this (10 real members now
-- present, not the 0 assumed earlier in the session).
create unique index if not exists idx_members_gym_email_unique
  on members (gym_id, lower(email));

-- payments: `add constraint` has no native IF NOT EXISTS, so guard it
-- explicitly.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'payments_gc_event_id_unique'
  ) then
    alter table payments
      add constraint payments_gc_event_id_unique unique (gc_event_id);
  end if;
end $$;
