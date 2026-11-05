import type { ClientGym, Gym, MemberStatus, Plan, Member, MandateBadgeState } from "@/types";

// One NZ gym per deployment, so "today" always means the gym's today. Vercel
// runs in UTC, 12-13 hours behind NZ: without pinning this, every morning
// the dashboard shows yesterday's date, and a server-rendered date can
// disagree with the same date re-rendered in the viewer's browser.
export const APP_TIME_ZONE = "Pacific/Auckland";

// ── Currency ─────────────────────────────────────────────────────────────────
export function formatCurrency(
  amount: number,
  currency = "NZD",
  locale = "en-NZ"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    // Whole dollars stay clean ("$15") but cents always show two digits:
    // "$13.50", never "$13.5".
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ── Date ─────────────────────────────────────────────────────────────────────
export function formatDate(
  date: string | Date | null,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }
): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-NZ", { timeZone: APP_TIME_ZONE, ...options }).format(new Date(date));
}

// YYYY-MM-DD on the gym's calendar. Use this instead of
// toISOString().split("T")[0], which gives the UTC date — yesterday, for
// the whole of an NZ morning.
export function toLocalISODate(date: string | Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

export function formatRelativeDate(date: string | Date | null): string {
  if (!date) return "—";
  // Calendar days, not elapsed hours — 11pm last night is "Yesterday" even
  // though it's under 24 hours ago.
  const diffDays = Math.round(
    (Date.parse(toLocalISODate(date)) - Date.parse(toLocalISODate())) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 0 && diffDays < 7) return `In ${diffDays} days`;
  if (diffDays < 0 && diffDays > -7) return `${Math.abs(diffDays)} days ago`;
  return formatDate(date);
}

// ── Member status ─────────────────────────────────────────────────────────────
export const MEMBER_STATUS_LABEL: Record<MemberStatus, string> = {
  pending: "Pending",
  active: "Active",
  paused: "Paused",
  cancelled: "Cancelled",
  expired: "Expired",
};

export const MEMBER_STATUS_VARIANT: Record<MemberStatus, "success" | "warning" | "muted" | "danger"> = {
  active: "success",
  pending: "warning",
  paused: "muted",
  cancelled: "danger",
  expired: "danger",
};

// ── Gym ──────────────────────────────────────────────────────────────────────
export function toClientGym(gym: Gym): ClientGym {
  const { gc_access_token: _secret, ...clientGym } = gym;
  return clientGym;
}

// ── Mandate status ───────────────────────────────────────────────────────────
//
// There's no mandate-status column/enum anywhere in the schema — only
// gc_mandate_id (nullable), gc_customer_id, and the member's own status. This
// derives a display state from those signals. Things it can't tell you:
//   - "pending" is a proxy (mandate created, no payment confirmed yet) —
//     we never fetch GoCardless's real pending_customer_approval/
//     pending_submission sub-states.
//   - "cancelled" reflects OUR status only, same as any other locally-
//     derived state — see lib/member-cancellation.ts for how it gets there
//     (calls GoCardless first, then waits on the mandates.cancelled webhook
//     to confirm before this reads "cancelled" rather than "cancelling").
//   - "on_hold" covers both reasons a member with a live mandate can be
//     paused — a failed payment or a manual pause. Nothing stored tells
//     them apart, and neither one means the mandate itself is broken, so
//     this deliberately doesn't claim "failed". Failed payments are
//     surfaced separately, in Needs attention.
export function getMandateBadgeState(
  member: Pick<Member, "gc_mandate_id" | "gc_customer_id" | "status" | "cancellation_requested_at">
): MandateBadgeState {
  if (!member.gc_mandate_id) {
    // handleMandateCancelled nulls the mandate but keeps gc_customer_id, so
    // "has a customer, no mandate, not running" means a mandate really did
    // get cancelled. Without a customer id this member was never on direct
    // debit at all (cash/manual payer) — pausing them doesn't change that.
    const stopped = member.status === "paused" || member.status === "cancelled";
    return member.gc_customer_id && stopped ? "cancelled" : "none";
  }
  // A cancellation has been sent to GoCardless (subscription + mandate
  // cancel calls) but the confirming mandates.cancelled webhook hasn't
  // landed yet, so gc_mandate_id is still populated. Must not read as
  // "Active" (misleading — it's being torn down) or "Cancelled" (a lie —
  // GC may still show it live for a few seconds/minutes). See
  // lib/member-cancellation.ts. Checked ahead of the status switch below
  // so it wins regardless of whatever raw status the member was in when
  // cancellation was requested.
  if (member.cancellation_requested_at) {
    return "cancelling";
  }
  switch (member.status) {
    case "pending":
      return "pending";
    case "active":
      return "active";
    case "paused":
      return "on_hold"; // can't be a mandate-cancel pause — that always nulls the id above
    case "cancelled":
    case "expired":
      return "cancelled";
  }
}

export const MANDATE_STATE_LABEL: Record<MandateBadgeState, string> = {
  active: "Active",
  pending: "Pending confirmation",
  cancelling: "Cancelling",
  on_hold: "On hold",
  cancelled: "Cancelled",
  none: "Not set up",
};

export const MANDATE_STATE_VARIANT: Record<MandateBadgeState, "success" | "warning" | "danger" | "muted" | "default"> = {
  active: "success",
  pending: "warning",
  cancelling: "warning",
  on_hold: "warning",
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

// Shorter form for tight table columns, where the term is already in the
// plan's name ("12-Month Paid in Full").
export function formatPlanAmount(plan: PlanPricing): string {
  return plan.pricing_model === "paid_in_full" ? `${formatCurrency(plan.price)} upfront` : formatPlanPrice(plan);
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

// ── Redirects ────────────────────────────────────────────────────────────────
// For a redirect target that came from a URL. Only a path on this site gets
// through: `/\evil.com` and `//evil.com` are other sites to a browser, and
// `@evil.com` is one too once it's concatenated onto our origin.
export function safeRedirectPath(path: string | null, fallback: string): string {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return fallback;
  return path;
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
