-- ============================================================
-- KORI/GYM — Pricing model (weekly + paid-in-full) + payments ledger
-- ============================================================
--
-- The gym's real pricing is two shapes:
--   - recurring: charged every interval, e.g. $18/week direct debit
--   - paid_in_full: one lump sum upfront for a fixed term,
--     e.g. $799 for 12 months, $249 for 3 months
--
-- `price` keeps its existing meaning per shape: the per-interval charge
-- for recurring plans, or the total lump sum for paid_in_full plans.

alter table plans
  add column if not exists pricing_model text not null default 'recurring',
  add column if not exists term_months integer;

alter table plans
  alter column billing_interval drop not null;

alter table plans
  add constraint plans_pricing_model_check
    check (pricing_model in ('recurring', 'paid_in_full'));

alter table plans
  add constraint plans_billing_interval_check
    check (billing_interval is null or billing_interval in ('weekly', 'monthly', 'annual'));

-- Recurring plans carry a billing_interval and no term; paid-in-full plans
-- carry a term_months and no billing_interval.
alter table plans
  add constraint plans_pricing_shape_check
    check (
      (pricing_model = 'recurring' and billing_interval is not null and term_months is null)
      or
      (pricing_model = 'paid_in_full' and term_months is not null and billing_interval is null)
    );

-- ============================================================
-- Payments — the commerce event itself. One row per charge attempt/
-- result, on either rail. This didn't exist before; member/gym state
-- was only ever a side effect of provider webhooks, with no ledger.
-- ============================================================

create table payments (
  id                    uuid primary key default gen_random_uuid(),
  gym_id                uuid references gyms not null,
  member_id             uuid references members not null,
  plan_id               uuid references plans on delete set null,
  amount                numeric not null,
  currency              text not null default 'NZD',
  provider              text not null,               -- stripe | gocardless | manual
  provider_payment_id   text,
  type                  text not null,                -- recurring | one_off
  status                text not null default 'pending',  -- pending | succeeded | failed | refunded
  paid_at               timestamptz,
  created_at            timestamptz default now()
);

alter table payments
  add constraint payments_provider_check
    check (provider in ('stripe', 'gocardless', 'manual'));

alter table payments
  add constraint payments_type_check
    check (type in ('recurring', 'one_off'));

alter table payments
  add constraint payments_status_check
    check (status in ('pending', 'succeeded', 'failed', 'refunded'));

alter table payments enable row level security;

create policy "Gym owners see own payments"
  on payments for all
  using (gym_id in (select id from gyms where owner_id = auth.uid()));

create policy "Members see own payments"
  on payments for select
  using (member_id in (select id from members where user_id = auth.uid()));

create index idx_payments_gym_id on payments (gym_id);
create index idx_payments_member_id on payments (member_id);
create index idx_payments_provider_payment_id on payments (provider_payment_id);
