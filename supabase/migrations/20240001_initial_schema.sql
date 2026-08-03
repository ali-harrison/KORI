-- ============================================================
-- KORI/GYM — Initial Schema
-- ============================================================

-- Gyms (tenants)
create table gyms (
  id                          uuid primary key default gen_random_uuid(),
  owner_id                    uuid references auth.users not null,
  name                        text not null,
  slug                        text unique not null,
  logo_url                    text,
  address                     text,
  phone                       text,
  email                       text,
  stripe_account_id           text,
  stripe_onboarding_complete  boolean default false,
  subscription_status         text default 'trial',  -- trial | active | past_due | cancelled
  created_at                  timestamptz default now()
);

-- Membership plans (gym defines their own)
create table plans (
  id                uuid primary key default gen_random_uuid(),
  gym_id            uuid references gyms not null,
  name              text not null,
  description       text,
  price             numeric not null,
  billing_interval  text not null,   -- monthly | annual
  stripe_price_id   text,
  active            boolean default true,
  created_at        timestamptz default now()
);

-- Members
create table members (
  id                      uuid primary key default gen_random_uuid(),
  gym_id                  uuid references gyms not null,
  user_id                 uuid references auth.users,
  first_name              text not null,
  last_name               text not null,
  email                   text not null,
  phone                   text,
  plan_id                 uuid references plans,
  status                  text default 'pending',  -- pending | active | paused | cancelled | expired
  stripe_customer_id      text,
  stripe_subscription_id  text,
  start_date              date,
  next_billing_date       date,
  created_at              timestamptz default now()
);

-- Contracts
create table contracts (
  id            uuid primary key default gen_random_uuid(),
  gym_id        uuid references gyms not null,
  member_id     uuid references members not null,
  template_url  text,
  signed_at     timestamptz,
  pdf_url       text,
  status        text default 'pending',  -- pending | signed
  created_at    timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table gyms      enable row level security;
alter table plans     enable row level security;
alter table members   enable row level security;
alter table contracts enable row level security;

-- Gyms: owners only see their own gym
create policy "Gym owners see own gym"
  on gyms for all
  using (owner_id = auth.uid());

-- Plans: gym owners only see plans for their gym
create policy "Gym owners see own plans"
  on plans for all
  using (gym_id in (select id from gyms where owner_id = auth.uid()));

-- Members: gym owners see members of their gym
create policy "Gym owners see own members"
  on members for all
  using (gym_id in (select id from gyms where owner_id = auth.uid()));

-- Members: members can read their own record
create policy "Members see own record"
  on members for select
  using (user_id = auth.uid());

-- Contracts: gym owners see contracts for their gym
create policy "Gym owners see own contracts"
  on contracts for all
  using (gym_id in (select id from gyms where owner_id = auth.uid()));

-- Contracts: members can read their own contracts
create policy "Members see own contracts"
  on contracts for select
  using (member_id in (select id from members where user_id = auth.uid()));

-- ============================================================
-- Indexes
-- ============================================================

create index idx_gyms_owner_id          on gyms (owner_id);
create index idx_gyms_slug              on gyms (slug);
create index idx_plans_gym_id           on plans (gym_id);
create index idx_members_gym_id         on members (gym_id);
create index idx_members_user_id        on members (user_id);
create index idx_members_email          on members (email);
create index idx_contracts_gym_id       on contracts (gym_id);
create index idx_contracts_member_id    on contracts (member_id);
