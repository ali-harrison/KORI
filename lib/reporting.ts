import type { ActivityItem, CollectedPayment, MandateSummary, Member, PaymentStatus, RevenueSeries, SubmissionDaySummary } from "@/types";
import { formatCurrency, formatDate, getMandateBadgeState, toLocalISODate } from "@/utils";

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

// Buckets on the stored date in paid_at, the same way currentMonthRange windows
// the "collected this month" stat, so the chart's last point always equals it.
export function buildRevenueSeries(payments: { amount: number; paid_at: string | null }[], now = new Date()): RevenueSeries {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const key = (y: number, m: number) => new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);

  function cumulative(monthKey: string, days: number): number[] {
    const perDay = new Array<number>(days).fill(0);
    for (const payment of payments) {
      if (!payment.paid_at?.startsWith(monthKey)) continue;
      const day = Number(payment.paid_at.slice(8, 10));
      if (day >= 1 && day <= days) perDay[day - 1] += payment.amount;
    }
    let total = 0;
    return perDay.map((amount) => (total += amount));
  }

  const monthName = (m: number) => formatDate(new Date(Date.UTC(year, m, 15)), { month: "long", timeZone: "UTC" });

  return {
    current: cumulative(key(year, month), now.getUTCDate()),
    previous: cumulative(key(year, month - 1), daysIn(year, month - 1)),
    daysInMonth: daysIn(year, month),
    currentLabel: monthName(month),
    previousLabel: monthName(month - 1),
  };
}

// Where this month stands against the same day last month, or null when last
// month has nothing to compare with.
export function paceAgainstLastMonth(series: RevenueSeries): number | null {
  const today = series.current.length;
  const sameDayLastMonth = series.previous[Math.min(today, series.previous.length) - 1];
  if (!sameDayLastMonth) return null;
  return Math.round(((series.current[today - 1] - sameDayLastMonth) / sameDayLastMonth) * 100);
}

// A spreadsheet runs a cell starting with these as a formula, and a member's
// name or a payment note is free text, so the export neutralises them.
function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function collectedToCsv(payments: CollectedPayment[]): string {
  const header = "Date,Member,Amount (NZD),Method,Note";
  const rows = payments.map((payment) =>
    [
      payment.paidAt.slice(0, 10),
      csvCell(payment.memberName),
      payment.amount.toFixed(2),
      payment.provider === "gocardless" ? "Direct debit" : "Manual",
      csvCell(payment.note ?? ""),
    ].join(",")
  );
  return [header, ...rows].join("\r\n") + "\r\n";
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
