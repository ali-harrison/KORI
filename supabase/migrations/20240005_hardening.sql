-- ============================================================
-- KORI/GYM — Hardening pass
-- ============================================================
--
-- gc_customer_id / gc_mandate_id / gc_subscription_id on members already
-- exist (20240002_gocardless.sql) — nothing to add there.

-- ── Unique email per gym, enforced at the DB layer ────────────────────────
--
-- createMember previously did a SELECT-then-INSERT existence check, which
-- is a race under concurrent submits (two requests can both pass the check
-- before either inserts). This index makes the DB the source of truth;
-- createMember now just inserts and handles the unique-violation error.
-- Verified against live data first — 0 members currently, so this applies
-- cleanly regardless.

create unique index idx_members_gym_email_unique on members (gym_id, lower(email));

-- ── Backfill CHECK constraints to migration 20240003's rigor ──────────────
--
-- members.status, contracts.status, and gyms.subscription_status have
-- carried their allowed-values lists only as SQL comments since
-- 20240001_initial_schema.sql — nothing stopped a direct write from setting
-- an out-of-range value. Verified against live data first: zero rows
-- violate any of these three constraints and zero rows are NULL in these
-- columns, so NOT NULL is safe to add alongside each CHECK (each column
-- already has a DEFAULT, so no insert path is affected).

alter table members
  alter column status set not null,
  add constraint members_status_check
    check (status in ('pending', 'active', 'paused', 'cancelled', 'expired'));

alter table contracts
  alter column status set not null,
  add constraint contracts_status_check
    check (status in ('pending', 'signed'));

alter table gyms
  alter column subscription_status set not null,
  add constraint gyms_subscription_status_check
    check (subscription_status in ('trial', 'active', 'past_due', 'cancelled'));

-- ── Drop redundant index ───────────────────────────────────────────────────
--
-- members.invite_token already carries a UNIQUE constraint (20240002),
-- which creates its own index. The explicit idx_members_invite_token index
-- added alongside it was a duplicate.

drop index if exists idx_members_invite_token;

-- ── GoCardless webhook event dedupe key ────────────────────────────────────
--
-- GoCardless redelivers webhook events and can deliver out of order.
-- gc_event_id is the idempotency key the webhook handler (this week's item
-- 4) will upsert against with on-conflict-do-nothing, so a redelivered
-- event can never double-insert a payments row. NULL for non-GoCardless
-- (manual) payments — Postgres unique constraints don't conflict on NULL,
-- so that's compatible with item 1's manual-payment rows.

alter table payments
  add column if not exists gc_event_id text;

alter table payments
  add constraint payments_gc_event_id_unique unique (gc_event_id);
