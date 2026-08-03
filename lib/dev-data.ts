import type { Gym, Plan, MemberWithPlan, ContractWithMember, DashboardStats, Payment, FailedPaymentAlert } from "@/types";

export const DEV_GYM: Gym = {
  id: "dev-gym-id",
  owner_id: "dev-user-id",
  name: "Southerly Strength",
  slug: "southerly-strength",
  logo_url: null,
  address: "12 Harbour Road, Southport",
  phone: "+64 21 555 0100",
  email: "hello@example.com",
  stripe_account_id: null,
  stripe_onboarding_complete: false,
  gc_organisation_id: null,
  gc_access_token: null,
  subscription_status: "trial",
  created_at: "2025-01-15T00:00:00Z",
};

const PLAN_WEEKLY: Plan = {
  id: "plan-weekly",
  gym_id: "dev-gym-id",
  name: "Weekly Direct Debit",
  description: "Full gym access, billed weekly",
  price: 18,
  pricing_model: "recurring",
  billing_interval: "weekly",
  term_months: null,
  stripe_price_id: null,
  active: true,
  created_at: "2025-01-15T00:00:00Z",
};

const PLAN_PIF_12MO: Plan = {
  id: "plan-pif-12mo",
  gym_id: "dev-gym-id",
  name: "12-Month Paid in Full",
  description: "Best value — pay upfront and save",
  price: 799,
  pricing_model: "paid_in_full",
  billing_interval: null,
  term_months: 12,
  stripe_price_id: null,
  active: true,
  created_at: "2025-01-15T00:00:00Z",
};

const PLAN_PIF_3MO: Plan = {
  id: "plan-pif-3mo",
  gym_id: "dev-gym-id",
  name: "3-Month Paid in Full",
  description: "Short-term commitment, paid upfront",
  price: 249,
  pricing_model: "paid_in_full",
  billing_interval: null,
  term_months: 3,
  stripe_price_id: null,
  active: true,
  created_at: "2025-01-15T00:00:00Z",
};

export const DEV_PLANS = [PLAN_WEEKLY, PLAN_PIF_12MO, PLAN_PIF_3MO];

export const DEV_PLANS_WITH_COUNT = [
  { ...PLAN_WEEKLY,   members: 28 },
  { ...PLAN_PIF_12MO, members: 11 },
  { ...PLAN_PIF_3MO,  members: 4  },
];

export const DEV_MEMBERS: MemberWithPlan[] = [
  {
    id: "mem-1", gym_id: "dev-gym-id", user_id: null,
    first_name: "Sarah", last_name: "Mitchell", email: "sarah.mitchell@example.com", phone: "+64 21 555 1234",
    plan_id: "plan-weekly", plan: PLAN_WEEKLY, status: "active",
    stripe_customer_id: null, stripe_subscription_id: null,
    gc_customer_id: null, gc_mandate_id: null, gc_subscription_id: null,
    invite_token: null, invite_sent_at: null,
    start_date: "2025-01-20", next_billing_date: "2025-06-20", created_at: "2025-01-20T00:00:00Z",
  },
  {
    id: "mem-2", gym_id: "dev-gym-id", user_id: null,
    first_name: "Liam", last_name: "Taufa", email: "liam.taufa@example.com", phone: "+64 27 344 8821",
    plan_id: "plan-pif-12mo", plan: PLAN_PIF_12MO, status: "active",
    stripe_customer_id: null, stripe_subscription_id: null,
    gc_customer_id: null, gc_mandate_id: null, gc_subscription_id: null,
    invite_token: null, invite_sent_at: null,
    start_date: "2025-02-01", next_billing_date: "2026-02-01", created_at: "2025-02-01T00:00:00Z",
  },
  {
    id: "mem-3", gym_id: "dev-gym-id", user_id: null,
    first_name: "Aroha", last_name: "Ngata", email: "aroha.ngata@example.com", phone: "+64 22 100 4455",
    plan_id: "plan-weekly", plan: PLAN_WEEKLY, status: "active",
    stripe_customer_id: null, stripe_subscription_id: null,
    gc_customer_id: null, gc_mandate_id: null, gc_subscription_id: null,
    invite_token: null, invite_sent_at: null,
    start_date: "2025-02-14", next_billing_date: "2025-06-14", created_at: "2025-02-14T00:00:00Z",
  },
  {
    id: "mem-4", gym_id: "dev-gym-id", user_id: null,
    first_name: "James", last_name: "Park", email: "jpark92@example.com", phone: "+64 21 678 9900",
    plan_id: "plan-pif-3mo", plan: PLAN_PIF_3MO, status: "paused",
    stripe_customer_id: null, stripe_subscription_id: null,
    gc_customer_id: null, gc_mandate_id: null, gc_subscription_id: null,
    invite_token: null, invite_sent_at: null,
    start_date: "2025-03-05", next_billing_date: null, created_at: "2025-03-05T00:00:00Z",
  },
  {
    id: "mem-5", gym_id: "dev-gym-id", user_id: null,
    first_name: "Mia", last_name: "Chen", email: "mia.chen@example.com", phone: "+64 21 234 5678",
    plan_id: "plan-weekly", plan: PLAN_WEEKLY, status: "pending",
    stripe_customer_id: null, stripe_subscription_id: null,
    gc_customer_id: null, gc_mandate_id: null, gc_subscription_id: null,
    invite_token: null, invite_sent_at: null,
    start_date: "2025-05-10", next_billing_date: "2025-06-10", created_at: "2025-05-10T00:00:00Z",
  },
  {
    id: "mem-6", gym_id: "dev-gym-id", user_id: null,
    first_name: "Tane", last_name: "Walker", email: "tane.walker@example.com", phone: "+64 27 901 2345",
    plan_id: "plan-pif-12mo", plan: PLAN_PIF_12MO, status: "active",
    stripe_customer_id: null, stripe_subscription_id: null,
    gc_customer_id: null, gc_mandate_id: null, gc_subscription_id: null,
    invite_token: null, invite_sent_at: null,
    start_date: "2025-03-20", next_billing_date: "2026-03-20", created_at: "2025-03-20T00:00:00Z",
  },
  {
    id: "mem-7", gym_id: "dev-gym-id", user_id: null,
    first_name: "Priya", last_name: "Sharma", email: "priya.sharma@example.com", phone: null,
    plan_id: "plan-weekly", plan: PLAN_WEEKLY, status: "cancelled",
    stripe_customer_id: null, stripe_subscription_id: null,
    gc_customer_id: null, gc_mandate_id: null, gc_subscription_id: null,
    invite_token: null, invite_sent_at: null,
    start_date: "2025-01-28", next_billing_date: null, created_at: "2025-01-28T00:00:00Z",
  },
];

export const DEV_STATS: DashboardStats = {
  totalMembers: 43,
  activeMembers: 38,
  monthlyRevenue: 3382,
  failedPayments: 1,
};

export const DEV_FAILED_PAYMENT_ALERTS: FailedPaymentAlert[] = [
  {
    id: "pay-failed-1",
    memberId: "mem-3",
    memberName: "Aroha Ngata",
    amount: 15,
    failedAt: "2025-06-10T08:00:00Z",
  },
];

export const DEV_CONTRACTS: ContractWithMember[] = [
  {
    id: "con-1", gym_id: "dev-gym-id", member_id: "mem-1",
    template_url: null, pdf_url: "/contracts/sarah-mitchell.pdf",
    signed_at: "2025-01-20T10:30:00Z", status: "signed", created_at: "2025-01-20T09:00:00Z",
    member: DEV_MEMBERS[0],
  },
  {
    id: "con-2", gym_id: "dev-gym-id", member_id: "mem-2",
    template_url: null, pdf_url: "/contracts/liam-taufa.pdf",
    signed_at: "2025-02-01T14:15:00Z", status: "signed", created_at: "2025-02-01T12:00:00Z",
    member: DEV_MEMBERS[1],
  },
  {
    id: "con-3", gym_id: "dev-gym-id", member_id: "mem-3",
    template_url: null, pdf_url: null,
    signed_at: "2025-02-14T11:00:00Z", status: "signed", created_at: "2025-02-14T09:30:00Z",
    member: DEV_MEMBERS[2],
  },
  {
    id: "con-4", gym_id: "dev-gym-id", member_id: "mem-5",
    template_url: null, pdf_url: null,
    signed_at: null, status: "pending", created_at: "2025-05-10T10:00:00Z",
    member: DEV_MEMBERS[4],
  },
];

export const DEV_PAYMENTS: Payment[] = [
  {
    id: "pay-1", gym_id: "dev-gym-id", member_id: "mem-1", plan_id: "plan-weekly",
    amount: 18, currency: "NZD", provider: "manual", provider_payment_id: null,
    type: "one_off", status: "succeeded", note: "Cash", gc_event_id: null,
    paid_at: "2025-06-13T00:00:00Z", created_at: "2025-06-13T09:00:00Z",
  },
  {
    id: "pay-2", gym_id: "dev-gym-id", member_id: "mem-1", plan_id: "plan-weekly",
    amount: 18, currency: "NZD", provider: "manual", provider_payment_id: null,
    type: "one_off", status: "succeeded", note: "Cash", gc_event_id: null,
    paid_at: "2025-06-06T00:00:00Z", created_at: "2025-06-06T09:00:00Z",
  },
  {
    id: "pay-3", gym_id: "dev-gym-id", member_id: "mem-2", plan_id: "plan-pif-12mo",
    amount: 799, currency: "NZD", provider: "manual", provider_payment_id: null,
    type: "one_off", status: "succeeded", note: "Bank transfer ref #4471", gc_event_id: null,
    paid_at: "2025-02-01T00:00:00Z", created_at: "2025-02-01T12:00:00Z",
  },
];
