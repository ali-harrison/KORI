-- ============================================================
-- KORI/GYM — GoCardless columns
-- ============================================================

-- Gyms: GoCardless OAuth token + organisation reference
alter table gyms
  add column if not exists gc_organisation_id text,
  add column if not exists gc_access_token    text;

-- Members: GoCardless customer, mandate, and subscription IDs
alter table members
  add column if not exists gc_customer_id     text,
  add column if not exists gc_mandate_id      text,
  add column if not exists gc_subscription_id text,
  add column if not exists invite_token       text unique,
  add column if not exists invite_sent_at     timestamptz;

create index if not exists idx_members_invite_token on members (invite_token);
