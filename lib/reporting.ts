import type { ActivityItem, MandateSummary, Member, PaymentStatus, SubmissionDaySummary } from "@/types";
import { formatCurrency, getMandateBadgeState, toLocalISODate } from "@/utils";

// Pure aggregation over rows that are already fetched — no Supabase, no Next.
// lib/queries.ts and the demo store (lib/dev-store.ts) both feed their rows
// through these, so demo mode can't quietly drift from what the real app
// would show for the same data.

// UTC calendar-month boundaries. paid_at is stored as a date at UTC midnight
// (a manual payment's date, a GoCardless charge_date), so these line up with
// how payments are actually dated.
export function currentMonthRange(now = new Date()): { start: string; end: string } {
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString(),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString(),
  };
}

// A failed payment only needs attention until the member's money comes in.
// Any success recorded after the failure resolves it — a GoCardless retry,
// or the owner taking cash and using Record payment.
export function filterOpenFailures<T extends { memberId: string | null; failedAt: string }>(
  failures: T[],
  successes: { member_id: string; created_at: string }[]
): T[] {
  return failures.filter(
    (failure) =>
      !successes.some(
        (success) =>
          success.member_id === failure.memberId &&
          new Date(success.created_at).getTime() > new Date(failure.failedAt).getTime()
      )
  );
}

// See getMandateBadgeState (utils/index.ts) for the derivation and its limits.
export function summarizeMandates(
  members: Pick<Member, "gc_mandate_id" | "gc_customer_id" | "status" | "cancellation_requested_at">[]
): MandateSummary {
  const summary: MandateSummary = { active: 0, pending: 0, cancelling: 0, on_hold: 0, cancelled: 0, none: 0, total: 0 };
  for (const member of members) {
    summary[getMandateBadgeState(member)] += 1;
    summary.total += 1;
  }
  return summary;
}

// A day's collection activity, grouped from the payments ledger — a proxy
// for "a GoCardless submission". Failed rows have no paid_at, so they bucket
// on when the failure was recorded.
export function summarizeSubmissions(
  payments: { amount: number; status: PaymentStatus; paid_at: string | null; created_at: string }[],
  days: number
): SubmissionDaySummary[] {
  const byDate = new Map<string, SubmissionDaySummary>();
  for (const payment of payments) {
    const date = toLocalISODate(payment.paid_at ?? payment.created_at);
    const bucket = byDate.get(date) ?? {
      date, chargeCount: 0, succeededCount: 0, succeededValue: 0, failedCount: 0, status: "clear" as const,
    };
    bucket.chargeCount += 1;
    if (payment.status === "succeeded") {
      bucket.succeededCount += 1;
      bucket.succeededValue += payment.amount;
    } else {
      bucket.failedCount += 1;
    }
    byDate.set(date, bucket);
  }

  return Array.from(byDate.values())
    .map((bucket) => ({
      ...bucket,
      status: bucket.failedCount === 0 ? "clear" : bucket.succeededCount === 0 ? "all_failed" : "partial_failures",
    } as SubmissionDaySummary))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, days);
}

interface ActivityPayment {
  id: string;
  amount: number;
  status: PaymentStatus;
  created_at: string;
  member: { first_name: string; last_name: string } | null;
}

interface ActivityMember {
  id: string;
  first_name: string;
  last_name: string;
  created_at: string;
  plan: { name: string } | null;
}

// No activity-log table exists, so this merges the two things we do have
// timestamps for — recent payments and recent signups — into one feed.
export function buildActivity(payments: ActivityPayment[], members: ActivityMember[], limit: number): ActivityItem[] {
  const memberName = (payment: ActivityPayment) =>
    payment.member ? `${payment.member.first_name} ${payment.member.last_name}` : "Unknown member";

  const items: ActivityItem[] = [
    ...payments
      .filter((payment) => payment.status === "succeeded" || payment.status === "failed")
      .map((payment) => ({
        id: `payment-${payment.id}`,
        timestamp: payment.created_at,
        text:
          payment.status === "succeeded"
            ? `${formatCurrency(payment.amount)} collected — ${memberName(payment)}`
            : `Payment failed — ${memberName(payment)}`,
      })),
    ...members.map((member) => ({
      id: `member-${member.id}`,
      timestamp: member.created_at,
      text: `${member.first_name} ${member.last_name} joined${member.plan ? ` on the ${member.plan.name} plan` : ""}`,
    })),
  ];

  return items
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}
