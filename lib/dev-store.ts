import type {
  ActivityItem, Contract, ContractWithMember, DashboardStats, FailedPaymentAlert, Gym, MandateSummary, Member,
  MemberStatus, MemberWithPlan, Payment, Plan, SubmissionDaySummary, UpcomingCharge,
} from "@/types";
import { createDemoData, DEMO_GYM_ID, type DemoState } from "./dev-data";
import { buildActivity, currentMonthRange, filterOpenFailures, summarizeMandates, summarizeSubmissions } from "./reporting";
import { toLocalISODate } from "@/utils";

// In-memory stand-in for Supabase, used only when DEV_BYPASS is on. Reads
// mirror lib/queries.ts, writes mirror the Server Actions, so a click-through
// behaves like the real app: add a member and they appear, record a payment
// and the alert clears. Nothing leaves this process — no database, GoCardless
// or email — and everything resets when the server restarts.
//
// On globalThis because Next can load this module more than once in dev (hot
// reload, separate route bundles), and they all need to share one state.
const holder = globalThis as typeof globalThis & { __koriDemoState?: DemoState };

function state(): DemoState {
  return (holder.__koriDemoState ??= createDemoData());
}

export function resetDemoState(): void {
  holder.__koriDemoState = createDemoData();
}

function withPlan(member: Member): MemberWithPlan {
  return { ...member, plan: state().plans.find((plan) => plan.id === member.plan_id) ?? null };
}

function findMember(memberId: string): Member | undefined {
  return state().members.find((member) => member.id === memberId);
}

function newestFirst<T extends { created_at: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export function getGym(): Gym {
  return state().gym;
}

export function getMembers(): MemberWithPlan[] {
  return newestFirst(state().members).map(withPlan);
}

export function getMember(memberId: string): MemberWithPlan | null {
  const member = findMember(memberId);
  return member ? withPlan(member) : null;
}

export function getMemberCount(): number {
  return state().members.length;
}

export function getPlans(): Plan[] {
  return [...state().plans].sort((a, b) => a.price - b.price);
}

export function getPlansWithMemberCount(): (Plan & { members: number })[] {
  return getPlans().map((plan) => ({
    ...plan,
    members: state().members.filter(
      (member) => member.plan_id === plan.id && (member.status === "active" || member.status === "paused")
    ).length,
  }));
}

export function getMemberPayments(memberId: string): Payment[] {
  return state()
    .payments.filter((payment) => payment.member_id === memberId)
    .sort((a, b) => (b.paid_at ?? b.created_at).localeCompare(a.paid_at ?? a.created_at));
}

export function getMemberContracts(memberId: string): Contract[] {
  return newestFirst(state().contracts.filter((contract) => contract.member_id === memberId));
}

export function getContract(contractId: string): Contract | null {
  return state().contracts.find((contract) => contract.id === contractId) ?? null;
}

export function getContracts(): ContractWithMember[] {
  return newestFirst(state().contracts).flatMap((contract) => {
    const member = findMember(contract.member_id);
    return member ? [{ ...contract, member: withPlan(member) }] : [];
  });
}

export function getFailedPaymentAlerts(): FailedPaymentAlert[] {
  const { start, end } = currentMonthRange();
  const failures = newestFirst(
    state().payments.filter(
      (payment) =>
        payment.provider === "gocardless" &&
        payment.status === "failed" &&
        payment.created_at >= start &&
        payment.created_at < end
    )
  ).map((payment) => {
    const member = findMember(payment.member_id);
    return {
      id: payment.id,
      memberId: member?.id ?? null,
      memberName: member ? `${member.first_name} ${member.last_name}` : "Unknown member",
      memberEmail: member?.email ?? null,
      amount: payment.amount,
      failedAt: payment.created_at,
    };
  });
  return filterOpenFailures(failures, state().payments.filter((payment) => payment.status === "succeeded"));
}

export function getDashboardStats(): DashboardStats {
  const { start, end } = currentMonthRange();
  const { members, payments } = state();
  return {
    totalMembers: members.length,
    activeMembers: members.filter((member) => member.status === "active").length,
    monthlyRevenue: payments
      .filter((p) => p.status === "succeeded" && p.paid_at && p.paid_at >= start && p.paid_at < end)
      .reduce((sum, payment) => sum + payment.amount, 0),
    revenueIsEstimate: false,
    failedPayments: getFailedPaymentAlerts().length,
  };
}

export function getUpcomingCharges(daysAhead: number): UpcomingCharge[] {
  const today = toLocalISODate();
  const windowEnd = toLocalISODate(new Date(Date.now() + daysAhead * 86400000));
  return state()
    .members.filter(
      (member) =>
        member.status === "active" &&
        member.gc_subscription_id &&
        !member.cancellation_requested_at &&
        member.next_billing_date &&
        member.next_billing_date >= today &&
        member.next_billing_date <= windowEnd
    )
    .sort((a, b) => a.next_billing_date!.localeCompare(b.next_billing_date!))
    .map((member) => {
      const { plan } = withPlan(member);
      return {
        memberId: member.id,
        memberName: `${member.first_name} ${member.last_name}`,
        planName: plan?.name ?? "—",
        amount: plan?.price ?? 0,
        chargeDate: member.next_billing_date!,
      };
    });
}

export function getRecentSubmissions(days: number): SubmissionDaySummary[] {
  const since = Date.now() - days * 86400000;
  return summarizeSubmissions(
    state().payments.filter(
      (payment) =>
        payment.provider === "gocardless" &&
        (payment.status === "succeeded" || payment.status === "failed") &&
        new Date(payment.paid_at ?? payment.created_at).getTime() >= since
    ),
    days
  );
}

export function getMandateSummary(): MandateSummary {
  return summarizeMandates(state().members);
}

export function getRecentActivity(limit: number): ActivityItem[] {
  return buildActivity(
    state().payments.map((payment) => ({ ...payment, member: findMember(payment.member_id) ?? null })),
    state().members.map(withPlan),
    limit
  );
}

// ── Writes ────────────────────────────────────────────────────────────────────
// Same rules and error messages as the real actions, so the demo can't show a
// path the real app would refuse.

type WriteResult = { error: string } | undefined;

export function setMemberStatus(memberId: string, status: MemberStatus): void {
  const member = findMember(memberId);
  if (member) member.status = status;
}

// Mirrors lib/member-cancellation.ts: no mandate cancels straight away; with
// one, the member sits in "Cancelling" until GoCardless confirms, and in the
// demo no webhook ever arrives.
export function cancelMember(memberId: string): void {
  const member = findMember(memberId);
  if (!member) return;
  if (member.gc_mandate_id) {
    member.cancellation_requested_at = new Date().toISOString();
  } else {
    member.status = "cancelled";
  }
}

export function createMember(input: {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  plan_id: string | null;
}): WriteResult {
  const email = input.email.toLowerCase();
  if (state().members.some((member) => member.email.toLowerCase() === email)) {
    return { error: "A member with this email already exists" };
  }
  state().members.push({
    ...input,
    id: `mem-${crypto.randomUUID()}`,
    gym_id: DEMO_GYM_ID,
    user_id: null,
    status: "pending",
    stripe_customer_id: null,
    stripe_subscription_id: null,
    gc_customer_id: null,
    gc_mandate_id: null,
    gc_subscription_id: null,
    invite_token: null,
    invite_sent_at: null,
    start_date: toLocalISODate(),
    next_billing_date: null,
    cancellation_requested_at: null,
    created_at: new Date().toISOString(),
  });
}

export function assignMemberPlan(memberId: string, planId: string | null): void {
  const member = findMember(memberId);
  if (member) member.plan_id = planId;
}

export function recordPayment(memberId: string, input: { amount: number; paidAt: string; note: string | null }): WriteResult {
  const member = findMember(memberId);
  if (!member) return { error: "Member not found" };
  state().payments.push({
    id: `pay-${crypto.randomUUID()}`,
    gym_id: DEMO_GYM_ID,
    member_id: memberId,
    plan_id: member.plan_id,
    amount: input.amount,
    currency: "NZD",
    provider: "manual",
    provider_payment_id: null,
    type: "one_off",
    status: "succeeded",
    note: input.note,
    gc_event_id: null,
    // Same shape Postgres stores a bare date in, so month windows line up.
    paid_at: `${input.paidAt}T00:00:00.000Z`,
    created_at: new Date().toISOString(),
  });
}

type PlanFields = Pick<Plan, "name" | "description" | "price" | "pricing_model" | "billing_interval" | "term_months">;

export function createPlan(fields: PlanFields): void {
  state().plans.push({
    ...fields,
    id: `plan-${crypto.randomUUID()}`,
    gym_id: DEMO_GYM_ID,
    stripe_price_id: null,
    active: true,
    created_at: new Date().toISOString(),
  } as Plan);
}

export function updatePlan(planId: string, fields: PlanFields): void {
  const { plans } = state();
  const index = plans.findIndex((plan) => plan.id === planId);
  if (index !== -1) plans[index] = { ...plans[index], ...fields } as Plan;
}

export function setPlanActive(planId: string, active: boolean): void {
  const plan = state().plans.find((candidate) => candidate.id === planId);
  if (plan) plan.active = active;
}

// Mirrors deletePlan's two refusals: members still on the plan, then the
// foreign key from any past member still pointing at it.
export function deletePlan(planId: string): WriteResult {
  const { members, plans } = state();
  const onPlan = members.filter((member) => member.plan_id === planId);
  const current = onPlan.filter((member) => member.status === "active" || member.status === "paused").length;
  if (current > 0) {
    return { error: `Cannot delete — ${current} active member${current > 1 ? "s" : ""} on this plan` };
  }
  if (onPlan.length > 0) {
    return { error: "This plan is still linked to past members — deactivate it instead." };
  }
  state().plans = plans.filter((plan) => plan.id !== planId);
}

export function updateGym(
  fields: Partial<Pick<Gym, "name" | "address" | "phone" | "email" | "logo_url" | "contract_template" | "overdue_email_subject" | "overdue_email_body">>
): void {
  Object.assign(state().gym, fields);
}

export function sendContract(memberId: string): void {
  const now = new Date().toISOString();
  const pending = state().contracts.find((contract) => contract.member_id === memberId && contract.status === "pending");
  if (pending) {
    pending.last_sent_at = now;
    return;
  }
  state().contracts.push({
    id: `con-${crypto.randomUUID()}`,
    gym_id: DEMO_GYM_ID,
    member_id: memberId,
    template_url: null,
    pdf_url: `demo/${memberId}.pdf`,
    signed_at: null,
    status: "pending",
    last_sent_at: now,
    created_at: now,
  });
}

export function markContractSigned(contractId: string): void {
  const contract = state().contracts.find((candidate) => candidate.id === contractId);
  if (contract) {
    contract.status = "signed";
    contract.signed_at = new Date().toISOString();
  }
}

// Stands in for the GoCardless hosted flow plus billing-callback: the member
// ends up with a mandate (and a subscription on recurring plans) awaiting
// their first confirmed payment.
export function startDirectDebit(memberId: string): void {
  const member = findMember(memberId);
  if (!member) return;
  const ref = crypto.randomUUID().slice(0, 8).toUpperCase();
  member.gc_customer_id ??= `CU00${ref}`;
  member.gc_mandate_id = `MD00${ref}`;
  member.cancellation_requested_at = null;
  if (withPlan(member).plan?.pricing_model === "recurring") {
    member.gc_subscription_id = `SB00${ref}`;
    member.next_billing_date = toLocalISODate(new Date(Date.now() + 4 * 86400000));
  }
}
