-- ============================================================
-- KORI/GYM — Payment notes
-- ============================================================
--
-- Free-text context for manually recorded payments (e.g. "cash",
-- "bank transfer ref #123"). provider_payment_id is reserved for the
-- payment gateway's own reference and isn't the right place for this.

alter table payments
  add column if not exists note text;
