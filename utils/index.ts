import type { MemberStatus, Plan, Member, MandateBadgeState } from "@/types";

// ── Currency ─────────────────────────────────────────────────────────────────
export function formatCurrency(
  amount: number,
  currency = "NZD",
  locale = "en-NZ"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ── Date ─────────────────────────────────────────────────────────────────────
export function formatDate(
  date: string | Date | null,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }
): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-NZ", options).format(new Date(date));
}

export function formatRelativeDate(date: string | Date | null): string {
  if (!date) return "—";
  const now = new Date();
  const d = new Date(date);
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 0 && diffDays < 7) return `In ${diffDays} days`;
  if (diffDays < 0 && diffDays > -7) return `${Math.abs(diffDays)} days ago`;
  return formatDate(date);
}

// ── Member status ─────────────────────────────────────────────────────────────
export function getMemberStatusLabel(status: MemberStatus): string {
  const labels: Record<MemberStatus, string> = {
    pending: "Pending",
    active: "Active",
    paused: "Paused",
    cancelled: "Cancelled",
    expired: "Expired",
  };
  return labels[status];
}

export function getMemberStatusColor(status: MemberStatus): string {
  const colors: Record<MemberStatus, string> = {
    pending: "warning",
    active: "success",
    paused: "secondary",
    cancelled: "danger",
    expired: "danger",
  };
  return colors[status];
}

// ── Mandate status ───────────────────────────────────────────────────────────
//
// There's no mandate-status column/enum anywhere in the schema — only
// gc_mandate_id (nullable) and the member's own status. This derives a
// display state from those two signals. Two things it can't tell you:
//   - "pending" is a proxy (mandate created, no payment confirmed yet) —
//     we never fetch GoCardless's real pending_customer_approval/
//     pending_submission sub-states.
//   - "cancelled" reflects OUR status only. Nothing in this app currently
//     calls GoCardless's cancel-mandate API when an admin cancels a member
//     locally (only the webhook's mandates.cancelled handler does that,
//     lib/gocardless-webhook.ts) — so a member showing "cancelled" here may
//     still have a live mandate at GoCardless. Known gap, not fixed here.
export function getMandateBadgeState(member: Pick<Member, "gc_mandate_id" | "status">): MandateBadgeState {
  if (!member.gc_mandate_id) {
    // Only handleMandateCancelled nulls gc_mandate_id, and it always pairs
    // that with status:"paused" — so this specific combination is a real,
    // confirmed cancellation signal, not a guess. Every other null case is
    // a member who's never been on direct debit at all (cash/manual payer,
    // or a plan that hasn't been billed yet).
    return member.status === "paused" ? "cancelled" : "none";
  }
  switch (member.status) {
    case "pending":
      return "pending";
    case "active":
      return "active";
    case "paused":
      return "failed"; // can't be a mandate-cancel pause — that always nulls the id above
    case "cancelled":
    case "expired":
      return "cancelled";
  }
}

export const MANDATE_STATE_LABEL: Record<MandateBadgeState, string> = {
  active: "Active",
  pending: "Pending confirmation",
  failed: "Failed",
  cancelled: "Cancelled",
  none: "Not set up",
};

export const MANDATE_STATE_VARIANT: Record<MandateBadgeState, "success" | "warning" | "danger" | "muted" | "default"> = {
  active: "success",
  pending: "warning",
  failed: "danger",
  cancelled: "muted",
  none: "default",
};

// ── Plan pricing ─────────────────────────────────────────────────────────────
const INTERVAL_SUFFIX: Record<Exclude<Plan["billing_interval"], null>, string> = {
  weekly: "wk",
  monthly: "mo",
  annual: "yr",
};

export function formatBillingIntervalSuffix(interval: Exclude<Plan["billing_interval"], null>): string {
  return INTERVAL_SUFFIX[interval];
}

// Pick<Plan, ...> would flatten the pricing_model/billing_interval/
// term_months discriminant into a single object shape, so this is spelled
// out as its own union to keep the narrowing below intact.
type PlanPricing =
  | { price: number; pricing_model: "recurring"; billing_interval: Exclude<Plan["billing_interval"], null>; term_months: null }
  | { price: number; pricing_model: "paid_in_full"; billing_interval: null; term_months: number };

// price = per-interval charge for recurring plans, total lump sum for
// paid-in-full plans.
export function formatPlanPrice(plan: PlanPricing): string {
  if (plan.pricing_model === "paid_in_full") {
    return `${formatCurrency(plan.price)} upfront (${plan.term_months} mo)`;
  }
  return `${formatCurrency(plan.price)}/${INTERVAL_SUFFIX[plan.billing_interval]}`;
}

// Normalizes any plan's price to a monthly-equivalent figure — needed
// wherever weekly/monthly/annual/paid-in-full prices get summed together
// (e.g. a "monthly revenue" stat). Paid-in-full is amortized over its term.
export function monthlyEquivalentPrice(plan: PlanPricing): number {
  if (plan.pricing_model === "paid_in_full") {
    return plan.price / plan.term_months;
  }
  switch (plan.billing_interval) {
    case "weekly":
      return (plan.price * 52) / 12;
    case "annual":
      return plan.price / 12;
    case "monthly":
      return plan.price;
  }
}

// ── Slug ─────────────────────────────────────────────────────────────────────
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ── Class name utility ────────────────────────────────────────────────────────
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

// ── Initials ─────────────────────────────────────────────────────────────────
export function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}
