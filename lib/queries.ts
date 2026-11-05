import { createServerSupabaseClient } from "./supabase";
import { redirect } from "next/navigation";
import type {
  Gym, Member, Plan, Contract, Payment, MemberWithPlan, ContractWithMember,
  DashboardStats, FailedPaymentAlert, UpcomingCharge, SubmissionDaySummary, MandateSummary, ActivityItem,
  CollectedPayment, RevenueSeries,
} from "@/types";
import { monthlyEquivalentPrice, toLocalISODate } from "@/utils";
import { buildActivity, buildRevenueSeries, currentMonthRange, filterOpenFailures, summarizeMandates, summarizeSubmissions } from "./reporting";
import { isDemoMode } from "./demo-mode";
import { demoState } from "./demo-session";
import { DEMO_USER } from "./dev-data";
import * as DEMO from "./dev-store";

// When on, every read here and every write in app/actions/ uses the visitor's
// sample data (lib/demo-session.ts) instead of Supabase. See lib/demo-mode.ts
// for exactly when that is.
export const DEMO_MODE = isDemoMode();

type ServerClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

// There's no Supabase in demo mode, and a public demo has no keys to build a
// client from. Anything that reaches for one is a bug, so it fails loudly.
const NO_SUPABASE = new Proxy({}, {
  get(_target, property) {
    throw new Error(`Demo mode tried to use Supabase (${String(property)})`);
  },
}) as ServerClient;

// ── Auth helpers ──────────────────────────────────────────────────────────────

// The opening line of every Server Action. Demo mode has to be handled here:
// it has no Supabase session, so a plain getUser() check would bounce every
// button click to the login page.
export async function requireSession() {
  if (DEMO_MODE) return { supabase: NO_SUPABASE, user: DEMO_USER };

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  return { supabase, user };
}

export async function getUser(): Promise<{ id: string; email?: string }> {
  if (DEMO_MODE) return DEMO_USER;
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/auth/login");
  return user;
}

export async function getGym(): Promise<Gym> {
  if (DEMO_MODE) return (await demoState()).gym;
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

export async function getDashboardStats(gymId: string): Promise<DashboardStats> {
  if (DEMO_MODE) return DEMO.getDashboardStats(await demoState());
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
  const revenueIsEstimate = !paymentsRecorded;

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

  // Same list Needs attention shows, so the stat and the card always agree.
  const openFailures = await getFailedPaymentAlerts(gymId);

  return {
    totalMembers: totalRes.count ?? 0,
    activeMembers: activeRes.count ?? 0,
    monthlyRevenue,
    revenueIsEstimate,
    failedPayments: openFailures.length,
  };
}

export async function getFailedPaymentAlerts(gymId: string): Promise<FailedPaymentAlert[]> {
  if (DEMO_MODE) return DEMO.getFailedPaymentAlerts(await demoState());
  const supabase = await createServerSupabaseClient();
  const { start, end } = currentMonthRange();

  // Windows on created_at, when the webhook recorded the failure — paid_at is
  // never set on a failed payment, since nothing was ever paid.
  const [{ data: failed }, { data: succeeded }] = await Promise.all([
    supabase
      .from("payments")
      .select("id, amount, created_at, member:members(id, first_name, last_name, email)")
      .eq("gym_id", gymId)
      .eq("provider", "gocardless")
      .eq("status", "failed")
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: false }),
    supabase
      .from("payments")
      .select("member_id, created_at")
      .eq("gym_id", gymId)
      .eq("status", "succeeded")
      .gte("created_at", start),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const alerts = (failed ?? []).map((p: any) => ({
    id: p.id,
    memberId: p.member?.id ?? null,
    memberName: p.member ? `${p.member.first_name} ${p.member.last_name}` : "Unknown member",
    memberEmail: p.member?.email ?? null,
    amount: p.amount,
    failedAt: p.created_at,
  }));

  return filterOpenFailures(alerts, succeeded ?? []);
}

export async function getRevenueSeries(gymId: string): Promise<RevenueSeries> {
  if (DEMO_MODE) return DEMO.getRevenueSeries(await demoState());
  const supabase = await createServerSupabaseClient();
  const now = new Date();
  const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString();

  const { data, error } = await supabase
    .from("payments")
    .select("amount, paid_at")
    .eq("gym_id", gymId)
    .eq("status", "succeeded")
    .gte("paid_at", lastMonth);

  if (error) throw error;
  return buildRevenueSeries(data ?? []);
}

// The rows behind "collected this month": same window, same filter, so the
// list on the Billing page always adds up to the figure on the Overview.
export async function getCollectedThisMonth(gymId: string): Promise<CollectedPayment[]> {
  if (DEMO_MODE) return DEMO.getCollectedThisMonth(await demoState());
  const supabase = await createServerSupabaseClient();
  const { start, end } = currentMonthRange();

  const { data, error } = await supabase
    .from("payments")
    .select("id, amount, paid_at, provider, note, member:members(id, first_name, last_name)")
    .eq("gym_id", gymId)
    .eq("status", "succeeded")
    .gte("paid_at", start)
    .lt("paid_at", end)
    .order("paid_at", { ascending: false });

  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((p: any) => ({
    id: p.id,
    memberId: p.member?.id ?? null,
    memberName: p.member ? `${p.member.first_name} ${p.member.last_name}` : "Unknown member",
    amount: p.amount,
    paidAt: p.paid_at,
    provider: p.provider,
    note: p.note,
  }));
}

// Lightweight count for chrome decoration (Sidebar's gym switcher) — avoids
// fetching full member rows just to show a number.
export async function getMemberCount(gymId: string): Promise<number> {
  if (DEMO_MODE) return DEMO.getMemberCount(await demoState());
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
  if (DEMO_MODE) return DEMO.getUpcomingCharges(await demoState(), daysAhead);
  const supabase = await createServerSupabaseClient();
  const todayISO = toLocalISODate();
  const windowEndISO = toLocalISODate(new Date(Date.now() + daysAhead * 86400000));

  const { data, error } = await supabase
    .from("members")
    .select("id, first_name, last_name, next_billing_date, plan:plans(name, price)")
    .eq("gym_id", gymId)
    .eq("status", "active")
    .not("gc_subscription_id", "is", null)
    .not("next_billing_date", "is", null)
    // Subscription already cancelled at GoCardless, just awaiting the webhook.
    .is("cancellation_requested_at", null)
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
  if (DEMO_MODE) return DEMO.getRecentSubmissions(await demoState(), days);
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
  return summarizeSubmissions((data ?? []) as Payment[], days);
}

// Mandate-state counts for the billing page's segmented bar. See
// getMandateBadgeState (utils/index.ts) for the derivation and its limits.
export async function getMandateSummary(gymId: string): Promise<MandateSummary> {
  if (DEMO_MODE) return DEMO.getMandateSummary(await demoState());
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("members")
    .select("gc_mandate_id, gc_customer_id, status, cancellation_requested_at")
    .eq("gym_id", gymId);

  if (error) throw error;
  return summarizeMandates((data ?? []) as Member[]);
}

export async function getRecentActivity(gymId: string, limit = 6): Promise<ActivityItem[]> {
  if (DEMO_MODE) return DEMO.getRecentActivity(await demoState(), limit);
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return buildActivity((paymentsRes.data ?? []) as any[], (membersRes.data ?? []) as any[], limit);
}

// ── Members ───────────────────────────────────────────────────────────────────

export async function getMembers(gymId: string): Promise<MemberWithPlan[]> {
  if (DEMO_MODE) return DEMO.getMembers(await demoState());
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
  if (DEMO_MODE) return DEMO.getMember(await demoState(), memberId);
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
  if (DEMO_MODE) return DEMO.getMemberPayments(await demoState(), memberId);
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
  if (DEMO_MODE) return DEMO.getMemberContracts(await demoState(), memberId);
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from("contracts")
    .select("*")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });

  return (data ?? []) as Contract[];
}

// ── Plans ─────────────────────────────────────────────────────────────────────

export async function getPlans(gymId: string): Promise<Plan[]> {
  if (DEMO_MODE) return DEMO.getPlans(await demoState());
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
  if (DEMO_MODE) return DEMO.getPlansWithMemberCount(await demoState());
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
  if (DEMO_MODE) return DEMO.getContracts(await demoState());
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("contracts")
    .select("*, member:members(id, first_name, last_name, email, plan_id, plan:plans(name))")
    .eq("gym_id", gymId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as ContractWithMember[];
}
