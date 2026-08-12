import { createServerSupabaseClient } from "./supabase";
import { redirect } from "next/navigation";
import type {
  Gym, Member, Plan, Contract, Payment, MemberWithPlan, ContractWithMember,
  DashboardStats, FailedPaymentAlert, UpcomingCharge, SubmissionDaySummary, MandateSummary, ActivityItem,
} from "@/types";
import { monthlyEquivalentPrice, getMandateBadgeState, formatCurrency } from "@/utils";
import * as DEV from "./dev-data";

// Gated on NODE_ENV so this can never activate in a production build/start,
// even if DEV_BYPASS=true leaks into a production environment by mistake.
const DEV_BYPASS = process.env.NODE_ENV === "development" && process.env.DEV_BYPASS === "true";

// ── Auth helpers ──────────────────────────────────────────────────────────────

export async function getUser(): Promise<{ id: string; email?: string }> {
  if (DEV_BYPASS) return { id: "dev-user-id", email: "owner@example.com" };
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/auth/login");
  return user;
}

export async function getGym(): Promise<Gym> {
  if (DEV_BYPASS) return DEV.DEV_GYM;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: gym, error } = await supabase
    .from("gyms")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  if (error || !gym) redirect("/onboarding");
  return gym as Gym;
}

// ── Dashboard stats ───────────────────────────────────────────────────────────

// UTC calendar-month boundaries for "this billing window" — good enough for
// a single-tenant pilot; revisit if billing windows ever need to be
// per-member (e.g. anniversary billing) rather than calendar-month.
function currentMonthRange(): { start: string; end: string } {
  const now = new Date();
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString(),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString(),
  };
}

export async function getDashboardStats(gymId: string): Promise<DashboardStats> {
  if (DEV_BYPASS) return DEV.DEV_STATS;
  const supabase = await createServerSupabaseClient();
  const { start: monthStart, end: monthEnd } = currentMonthRange();

  const [totalRes, activeRes] = await Promise.all([
    supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("gym_id", gymId),
    supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("gym_id", gymId)
      .eq("status", "active"),
  ]);

  // Revenue: once real payments start getting recorded, trust the ledger —
  // sum succeeded payments actually paid this calendar month. Only fall back
  // to a plan-price estimate while the gym has no payment history at all yet
  // (otherwise a slow month would wrongly look identical to "no data").
  const { count: paymentsRecorded } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("gym_id", gymId)
    .eq("status", "succeeded");

  let monthlyRevenue: number;

  if (paymentsRecorded && paymentsRecorded > 0) {
    const { data: monthPayments } = await supabase
      .from("payments")
      .select("amount")
      .eq("gym_id", gymId)
      .eq("status", "succeeded")
      .gte("paid_at", monthStart)
      .lt("paid_at", monthEnd);

    monthlyRevenue = (monthPayments ?? []).reduce((sum, p) => sum + p.amount, 0);
  } else {
    // FALLBACK — no payments recorded for this gym yet. Estimate from active
    // members' plans, normalized to a monthly-equivalent figure (weekly
    // ×52/12, annual ÷12, paid-in-full amortized over its term). Once the
    // first payment lands, this branch stops running entirely.
    const { data: activeMembers } = await supabase
      .from("members")
      .select("plan:plans(price, pricing_model, billing_interval, term_months)")
      .eq("gym_id", gymId)
      .eq("status", "active");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    monthlyRevenue = (activeMembers ?? []).reduce((sum, m: any) => {
      return sum + (m.plan ? monthlyEquivalentPrice(m.plan) : 0);
    }, 0);
  }

  // Failed Payments: actual failed GoCardless payments this billing window,
  // not a proxy. Previously this counted members with status='paused',
  // which overclaimed — a member can be paused manually (put on hold, no
  // failure involved) with nothing to do with a payment ever failing.
  // paid_at is never set on a failed payment (nothing was ever paid), so
  // this windows on created_at — when the webhook recorded the failure.
  const { count: failedCount } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("gym_id", gymId)
    .eq("provider", "gocardless")
    .eq("status", "failed")
    .gte("created_at", monthStart)
    .lt("created_at", monthEnd);

  return {
    totalMembers: totalRes.count ?? 0,
    activeMembers: activeRes.count ?? 0,
    monthlyRevenue,
    failedPayments: failedCount ?? 0,
  };
}

export async function getFailedPaymentAlerts(gymId: string): Promise<FailedPaymentAlert[]> {
  if (DEV_BYPASS) return DEV.DEV_FAILED_PAYMENT_ALERTS;
  const supabase = await createServerSupabaseClient();
  const { start, end } = currentMonthRange();

  const { data } = await supabase
    .from("payments")
    .select("id, amount, created_at, member:members(id, first_name, last_name)")
    .eq("gym_id", gymId)
    .eq("provider", "gocardless")
    .eq("status", "failed")
    .gte("created_at", start)
    .lt("created_at", end)
    .order("created_at", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((p: any) => ({
    id: p.id,
    memberId: p.member?.id ?? null,
    memberName: p.member ? `${p.member.first_name} ${p.member.last_name}` : "Unknown member",
    amount: p.amount,
    failedAt: p.created_at,
  }));
}

// Lightweight count for chrome decoration (Sidebar's gym switcher) — avoids
// fetching full member rows just to show a number.
export async function getMemberCount(gymId: string): Promise<number> {
  if (DEV_BYPASS) return DEV.DEV_MEMBERS.length;
  const supabase = await createServerSupabaseClient();
  const { count } = await supabase
    .from("members")
    .select("id", { count: "exact", head: true })
    .eq("gym_id", gymId);
  return count ?? 0;
}

// ── Billing overview ─────────────────────────────────────────────────────────
//
// GoCardless doesn't expose a merchant-visible "batch"/"submission" id, and
// it batches per payment scheme on its own side, invisible to us — so
// nothing here claims to be real GoCardless batch data. These are honest
// proxies built from our own members/payments rows: an upcoming-charges
// queue (not a "next batch"), and same-day payment groupings (not a "recent
// submission"). See the comments on each for exactly what's being
// approximated and why.

// Real, upcoming direct-debit charges — not a GoCardless batch (see above).
// Restricted to members with a gc_subscription_id because billing-callback
// only creates a GoCardless subscription for pricing_model "recurring"
// members (app/api/gocardless/billing-callback/route.ts) — paid-in-full
// members never have a next charge to show here.
export async function getUpcomingCharges(gymId: string, daysAhead = 14): Promise<UpcomingCharge[]> {
  if (DEV_BYPASS) return DEV.DEV_UPCOMING_CHARGES;
  const supabase = await createServerSupabaseClient();
  const todayISO = new Date().toISOString().split("T")[0];
  const windowEndISO = new Date(Date.now() + daysAhead * 86400000).toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("members")
    .select("id, first_name, last_name, next_billing_date, plan:plans(name, price)")
    .eq("gym_id", gymId)
    .eq("status", "active")
    .not("gc_subscription_id", "is", null)
    .not("next_billing_date", "is", null)
    .gte("next_billing_date", todayISO)
    .lte("next_billing_date", windowEndISO)
    .order("next_billing_date", { ascending: true });

  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((m: any) => ({
    memberId: m.id,
    memberName: `${m.first_name} ${m.last_name}`,
    planName: m.plan?.name ?? "—",
    amount: m.plan?.price ?? 0,
    chargeDate: m.next_billing_date,
  }));
}

// A day's collection activity, grouped from our own payments ledger — a
// proxy for "a GoCardless submission" (see file header). Fetches a buffered
// range because a succeeded row's created_at (when our webhook recorded
// the confirmation) lags its real charge date (paid_at) by however long
// GoCardless takes to confirm — windowing the fetch by created_at alone
// would silently miss charges from near the start of the requested range.
export async function getRecentSubmissions(gymId: string, days = 14): Promise<SubmissionDaySummary[]> {
  if (DEV_BYPASS) return DEV.DEV_RECENT_SUBMISSIONS;
  const supabase = await createServerSupabaseClient();
  const CONFIRMATION_LAG_BUFFER_DAYS = 10;
  const since = new Date(Date.now() - (days + CONFIRMATION_LAG_BUFFER_DAYS) * 86400000).toISOString();

  const { data, error } = await supabase
    .from("payments")
    .select("amount, status, paid_at, created_at")
    .eq("gym_id", gymId)
    .eq("provider", "gocardless")
    .in("status", ["succeeded", "failed"])
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const byDate = new Map<string, SubmissionDaySummary>();
  for (const p of data ?? []) {
    const date = (p.paid_at ?? p.created_at).slice(0, 10);
    const bucket = byDate.get(date) ?? {
      date, chargeCount: 0, succeededCount: 0, succeededValue: 0, failedCount: 0, status: "clear" as const,
    };
    bucket.chargeCount += 1;
    if (p.status === "succeeded") {
      bucket.succeededCount += 1;
      bucket.succeededValue += p.amount;
    } else {
      bucket.failedCount += 1;
    }
    byDate.set(date, bucket);
  }

  return Array.from(byDate.values())
    .map((b) => ({
      ...b,
      status: b.failedCount === 0 ? "clear" : b.succeededCount === 0 ? "all_failed" : "partial_failures",
    } as SubmissionDaySummary))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, days);
}

// Mandate-state counts for the billing page's segmented bar. See
// getMandateBadgeState (utils/index.ts) for the derivation and its limits.
export async function getMandateSummary(gymId: string): Promise<MandateSummary> {
  if (DEV_BYPASS) return DEV.DEV_MANDATE_SUMMARY;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("members")
    .select("gc_mandate_id, status")
    .eq("gym_id", gymId);

  if (error) throw error;
  const summary: MandateSummary = { active: 0, pending: 0, failed: 0, cancelled: 0, none: 0, total: 0 };
  for (const m of data ?? []) {
    summary[getMandateBadgeState(m as Pick<Member, "gc_mandate_id" | "status">)] += 1;
    summary.total += 1;
  }
  return summary;
}

// Overview page's activity feed. No activity-log table exists, so this
// merges the two things we do have timestamps for — recent payments and
// recent member signups — into one feed, sorted by when each happened.
export async function getRecentActivity(gymId: string, limit = 6): Promise<ActivityItem[]> {
  if (DEV_BYPASS) return DEV.DEV_ACTIVITY;
  const supabase = await createServerSupabaseClient();

  const [paymentsRes, membersRes] = await Promise.all([
    supabase
      .from("payments")
      .select("id, amount, status, created_at, member:members(first_name, last_name)")
      .eq("gym_id", gymId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("members")
      .select("id, first_name, last_name, plan:plans(name), created_at")
      .eq("gym_id", gymId)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const items: ActivityItem[] = [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(paymentsRes.data ?? []).map((p: any) => ({
      id: `payment-${p.id}`,
      timestamp: p.created_at,
      text: p.status === "succeeded"
        ? `${formatCurrency(p.amount)} collected — ${p.member?.first_name ?? "Unknown"} ${p.member?.last_name ?? ""}`.trim()
        : `Payment failed — ${p.member?.first_name ?? "Unknown"} ${p.member?.last_name ?? ""}`.trim(),
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(membersRes.data ?? []).map((m: any) => ({
      id: `member-${m.id}`,
      timestamp: m.created_at,
      text: `${m.first_name} ${m.last_name} joined${m.plan ? ` on the ${m.plan.name} plan` : ""}`,
    })),
  ];

  return items
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

// ── Members ───────────────────────────────────────────────────────────────────

export async function getMembers(gymId: string): Promise<MemberWithPlan[]> {
  if (DEV_BYPASS) return DEV.DEV_MEMBERS;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("members")
    .select("*, plan:plans(*)")
    .eq("gym_id", gymId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as MemberWithPlan[];
}

export async function getMember(memberId: string, gymId: string): Promise<MemberWithPlan | null> {
  if (DEV_BYPASS) return DEV.DEV_MEMBERS.find((m) => m.id === memberId) ?? DEV.DEV_MEMBERS[0];
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("members")
    .select("*, plan:plans(*)")
    .eq("id", memberId)
    .eq("gym_id", gymId)
    .single();

  if (error) return null;
  return data as MemberWithPlan;
}

export async function getMemberPayments(memberId: string): Promise<Payment[]> {
  if (DEV_BYPASS) return DEV.DEV_PAYMENTS.filter((p) => p.member_id === memberId);
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from("payments")
    .select("*")
    .eq("member_id", memberId)
    .order("paid_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  return (data ?? []) as Payment[];
}

export async function getMemberContracts(memberId: string): Promise<Contract[]> {
  if (DEV_BYPASS) return DEV.DEV_CONTRACTS.filter((c) => c.member_id === memberId);
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from("contracts")
    .select("*")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });

  return (data ?? []) as Contract[];
}

export async function getRecentMembers(gymId: string, limit = 5): Promise<MemberWithPlan[]> {
  if (DEV_BYPASS) return DEV.DEV_MEMBERS.slice(0, limit);
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from("members")
    .select("*, plan:plans(*)")
    .eq("gym_id", gymId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as MemberWithPlan[];
}

// ── Plans ─────────────────────────────────────────────────────────────────────

export async function getPlans(gymId: string): Promise<Plan[]> {
  if (DEV_BYPASS) return DEV.DEV_PLANS;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .eq("gym_id", gymId)
    .order("price", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Plan[];
}

// Plans with member count using subquery
export async function getPlansWithMemberCount(gymId: string) {
  if (DEV_BYPASS) return DEV.DEV_PLANS_WITH_COUNT;
  const supabase = await createServerSupabaseClient();

  const { data: plans, error } = await supabase
    .from("plans")
    .select("*")
    .eq("gym_id", gymId)
    .order("price", { ascending: true });

  if (error || !plans) return [];

  // Fetch member counts in parallel
  const plansWithCounts = await Promise.all(
    (plans as Plan[]).map(async (plan) => {
      const { count } = await supabase
        .from("members")
        .select("id", { count: "exact", head: true })
        .eq("plan_id", plan.id)
        .in("status", ["active", "paused"]);
      return { ...plan, members: count ?? 0 };
    })
  );

  return plansWithCounts as (Plan & { members: number })[];
}

// ── Contracts ─────────────────────────────────────────────────────────────────

export async function getContracts(gymId: string): Promise<ContractWithMember[]> {
  if (DEV_BYPASS) return DEV.DEV_CONTRACTS;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("contracts")
    .select("*, member:members(id, first_name, last_name, email, plan_id, plan:plans(name))")
    .eq("gym_id", gymId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as ContractWithMember[];
}
