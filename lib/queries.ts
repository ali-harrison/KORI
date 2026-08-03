import { createServerSupabaseClient } from "./supabase";
import { redirect } from "next/navigation";
import type { Gym, Member, Plan, Contract, Payment, MemberWithPlan, ContractWithMember, DashboardStats } from "@/types";
import { monthlyEquivalentPrice } from "@/utils";
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

export async function getDashboardStats(gymId: string): Promise<DashboardStats> {
  if (DEV_BYPASS) return DEV.DEV_STATS;
  const supabase = await createServerSupabaseClient();

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
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();

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

  const { count: failedCount } = await supabase
    .from("members")
    .select("id", { count: "exact", head: true })
    .eq("gym_id", gymId)
    .eq("status", "paused");

  return {
    totalMembers: totalRes.count ?? 0,
    activeMembers: activeRes.count ?? 0,
    monthlyRevenue,
    failedPayments: failedCount ?? 0,
  };
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
