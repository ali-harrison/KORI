// ============================================================
// KORI/GYM — TypeScript Types
// ============================================================

export type MemberStatus = "pending" | "active" | "paused" | "cancelled" | "expired";
export type BillingInterval = "weekly" | "monthly" | "annual";
export type PricingModel = "recurring" | "paid_in_full";
export type ContractStatus = "pending" | "signed";
export type SubscriptionStatus = "trial" | "active" | "past_due" | "cancelled";
export type PaymentProvider = "stripe" | "gocardless" | "manual";
export type PaymentType = "recurring" | "one_off";
export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";

// ── Database row types ───────────────────────────────────────────────────────

// A gym row minus anything that must never reach the browser. Anything
// passed to a Client Component gets serialized into the page payload, so
// gc_access_token (a live bearer token for the gym's GoCardless account)
// has to be stripped first — see toClientGym in utils/index.ts.
export type ClientGym = Omit<Gym, "gc_access_token">;

export interface Gym {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  gc_organisation_id: string | null;
  gc_access_token: string | null;
  subscription_status: SubscriptionStatus;
  // Owner-edited, {{token}}-templated copy — see lib/templates.ts for the
  // render function and default copy, lib/resend.ts for where these get
  // sent.
  contract_template: string;
  overdue_email_subject: string;
  overdue_email_body: string;
  created_at: string;
}

interface PlanBase {
  id: string;
  gym_id: string;
  name: string;
  description: string | null;
  price: number;
  stripe_price_id: string | null;
  active: boolean;
  created_at: string;
}

// price = per-interval charge for recurring plans, total lump sum for
// paid-in-full plans (e.g. $799 for a 12-month term).
export type Plan =
  | (PlanBase & {
      pricing_model: "recurring";
      billing_interval: BillingInterval;
      term_months: null;
    })
  | (PlanBase & {
      pricing_model: "paid_in_full";
      billing_interval: null;
      term_months: number;
    });

export interface Member {
  id: string;
  gym_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  plan_id: string | null;
  status: MemberStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  gc_customer_id: string | null;
  gc_mandate_id: string | null;
  gc_subscription_id: string | null;
  invite_token: string | null;
  invite_sent_at: string | null;
  start_date: string | null;
  next_billing_date: string | null;
  // Set when a local "cancel member" click has told GoCardless to cancel
  // the subscription+mandate but the confirming mandates.cancelled webhook
  // hasn't landed yet. Cleared back to null by that webhook. See
  // lib/member-cancellation.ts and getMandateBadgeState (utils/index.ts).
  cancellation_requested_at: string | null;
  created_at: string;
}

export interface Contract {
  id: string;
  gym_id: string;
  member_id: string;
  template_url: string | null;
  signed_at: string | null;
  pdf_url: string | null;
  status: ContractStatus;
  // Set whenever the contract email is sent or resent — see
  // app/actions/contracts.ts:sendContract. Null until the first send.
  // Distinct from created_at, which never changes after the row exists.
  last_sent_at: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  gym_id: string;
  member_id: string;
  plan_id: string | null;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  provider_payment_id: string | null;
  type: PaymentType;
  status: PaymentStatus;
  note: string | null;
  gc_event_id: string | null;
  paid_at: string | null;
  created_at: string;
}

// ── Joined / enriched types ──────────────────────────────────────────────────

export interface MemberWithPlan extends Member {
  plan: Plan | null;
}

export interface ContractWithMember extends Contract {
  member: Member;
}

// ── Dashboard stat types ─────────────────────────────────────────────────────

export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  monthlyRevenue: number;
  // True while the gym has no payment history yet and monthlyRevenue is an
  // estimate from plan prices rather than money actually collected.
  revenueIsEstimate: boolean;
  failedPayments: number;
}

// Owner-facing "needs attention" signal — a failed GoCardless payment within
// the current billing window. Deliberately just data for a list, not an
// action: the owner follows up manually (see DirectDebitSetup / dashboard).
export interface FailedPaymentAlert {
  id: string;
  memberId: string | null;
  memberName: string;
  memberEmail: string | null;
  amount: number;
  failedAt: string;
}

// Derived display state for a member's direct debit mandate — see
// getMandateBadgeState in utils/index.ts for the derivation and its
// documented limits. Not a real GoCardless or DB status column.
export type MandateBadgeState = "active" | "pending" | "cancelling" | "on_hold" | "cancelled" | "none";

// A real, upcoming direct-debit charge, derived from an active recurring
// member's next_billing_date. Not a GoCardless "batch" — GoCardless doesn't
// expose one; see getUpcomingCharges in lib/queries.ts.
export interface UpcomingCharge {
  memberId: string;
  memberName: string;
  planName: string;
  amount: number;
  chargeDate: string;
}

// One calendar day's collection activity, grouped from our own payments
// ledger — a proxy for "a GoCardless submission", not real batch/payout
// data (we don't track those). See getRecentSubmissions in lib/queries.ts.
export interface SubmissionDaySummary {
  date: string;
  chargeCount: number;
  succeededCount: number;
  succeededValue: number;
  failedCount: number;
  status: "clear" | "partial_failures" | "all_failed";
}

export interface MandateSummary {
  active: number;
  pending: number;
  cancelling: number;
  on_hold: number;
  cancelled: number;
  none: number;
  total: number;
}

// Overview page's "recent activity" feed — derived by merging recent
// payments and recent member signups (no activity-log table exists). See
// getRecentActivity in lib/queries.ts.
export interface ActivityItem {
  id: string;
  timestamp: string;
  text: string;
}

