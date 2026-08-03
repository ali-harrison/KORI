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
  failedPayments: number;
}

// ── Form types ───────────────────────────────────────────────────────────────

export type CreatePlanInput =
  | {
      name: string;
      description?: string;
      price: number;
      pricing_model: "recurring";
      billing_interval: BillingInterval;
    }
  | {
      name: string;
      description?: string;
      price: number;
      pricing_model: "paid_in_full";
      term_months: number;
    };

export interface CreateMemberInput {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  plan_id: string;
}

export interface UpdateGymInput {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
}
