import type {
  ActivityItem, Contract, ContractWithMember, DashboardStats, FailedPaymentAlert, Gym, MandateSummary, Member,
  MemberStatus, MemberWithPlan, Payment, Plan, SubmissionDaySummary, UpcomingCharge,
} from "@/types";
import { DEMO_GYM_ID, type DemoState } from "./dev-data";
import { buildActivity, currentMonthRange, filterOpenFailures, summarizeMandates, summarizeSubmissions } from "./reporting";
import { toLocalISODate } from "@/utils";

// Demo mode's stand-in for Supabase. Reads mirror lib/queries.ts and writes
// mirror the Server Actions, so a click-through behaves like the real app: add
// a member and they appear, record a payment and the alert clears. Everything
// here is a plain function of a DemoState; lib/demo-session.ts decides where
// that state comes from.

function withPlan(state: DemoState, member: Member): MemberWithPlan {
  return { ...member, plan: state.plans.find((plan) => plan.id === member.plan_id) ?? null };
}

function findMember(state: DemoState, memberId: string): Member | undefined {
  return state.members.find((member) => member.id === memberId);
}

function newestFirst<T extends { created_at: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export function getMembers(state: DemoState): MemberWithPlan[] {
  return newestFirst(state.members).map((member) => withPlan(state, member));
}

export function getMember(state: DemoState, memberId: string): MemberWithPlan | null {
  const member = findMember(state, memberId);
  return member ? withPlan(state, member) : null;
}

export function getMemberCount(state: DemoState): number {
  return state.members.length;
}

export function getPlans(state: DemoState): Plan[] {
  return [...state.plans].sort((a, b) => a.price - b.price);
}

export function getPlansWithMemberCount(state: DemoState): (Plan & { members: number })[] {
  return getPlans(state).map((plan) => ({
    ...plan,
    members: state.members.filter(
      (member) => member.plan_id === plan.id && (member.status === "active" || member.status === "paused")
    ).length,
  }));
}

export function getMemberPayments(state: DemoState, memberId: string): Payment[] {
  return state.payments
    .filter((payment) => payment.member_id === memberId)
    .sort((a, b) => (b.paid_at ?? b.created_at).localeCompare(a.paid_at ?? a.created_at));
}

export function getMemberContracts(state: DemoState, memberId: string): Contract[] {
  return newestFirst(state.contracts.filter((contract) => contract.member_id === memberId));
}

export function getContract(state: DemoState, contractId: string): Contract | null {
  return state.contracts.find((contract) => contract.id === contractId) ?? null;
}

export function getContracts(state: DemoState): ContractWithMember[] {
  return newestFirst(state.contracts).flatMap((contract) => {
    const member = findMember(state, contract.member_id);
    return member ? [{ ...contract, member: withPlan(state, member) }] : [];
  });
}

export function getFailedPaymentAlerts(state: DemoState): FailedPaymentAlert[] {
  const { start, end } = currentMonthRange();
  const failures = newestFirst(
    state.payments.filter(
      (payment) =>
        payment.provider === "gocardless" &&
        payment.status === "failed" &&
        payment.created_at >= start &&
        payment.created_at < end
    )
  ).map((payment) => {
    const member = findMember(state, payment.member_id);
    return {
      id: payment.id,
      memberId: member?.id ?? null,
      memberName: member ? `${member.first_name} ${member.last_name}` : "Unknown member",
      memberEmail: member?.email ?? null,
      amount: payment.amount,
      failedAt: payment.created_at,
    };
  });
  return filterOpenFailures(failures, state.payments.filter((payment) => payment.status === "succeeded"));
}

export function getDashboardStats(state: DemoState): DashboardStats {
  const { start, end } = currentMonthRange();
  const { members, payments } = state;
  return {
    totalMembers: members.length,
    activeMembers: members.filter((member) => member.status === "active").length,
    monthlyRevenue: payments
      .filter((p) => p.status === "succeeded" && p.paid_at && p.paid_at >= start && p.paid_at < end)
      .reduce((sum, payment) => sum + payment.amount, 0),
    revenueIsEstimate: false,
    failedPayments: getFailedPaymentAlerts(state).length,
  };
}

export function getUpcomingCharges(state: DemoState, daysAhead: number): UpcomingCharge[] {
  const today = toLocalISODate();
  const windowEnd = toLocalISODate(new Date(Date.now() + daysAhead * 86400000));
  return state.members
    .filter(
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
      const { plan } = withPlan(state, member);
      return {
        memberId: member.id,
        memberName: `${member.first_name} ${member.last_name}`,
        planName: plan?.name ?? "—",
        amount: plan?.price ?? 0,
        chargeDate: member.next_billing_date!,
      };
    });
}

export function getRecentSubmissions(state: DemoState, days: number): SubmissionDaySummary[] {
  const since = Date.now() - days * 86400000;
  return summarizeSubmissions(
    state.payments.filter(
      (payment) =>
        payment.provider === "gocardless" &&
        (payment.status === "succeeded" || payment.status === "failed") &&
        new Date(payment.paid_at ?? payment.created_at).getTime() >= since
    ),
    days
  );
}

export function getMandateSummary(state: DemoState): MandateSummary {
  return summarizeMandates(state.members);
}

export function getRecentActivity(state: DemoState, limit: number): ActivityItem[] {
  return buildActivity(
    state.payments.map((payment) => ({ ...payment, member: findMember(state, payment.member_id) ?? null })),
    state.members.map((member) => withPlan(state, member)),
    limit
  );
}

// ── Writes ────────────────────────────────────────────────────────────────────
// Same rules and error messages as the real actions, so the demo can't show a
// path the real app would refuse. A write gets its timestamp and any new id
// from the context rather than making its own, so replaying the same write
// always produces the same row.

export interface WriteContext {
  now: string;
  id: string;
}

export type WriteResult = { error: string } | void;

type PlanFields = Pick<Plan, "name" | "description" | "price" | "pricing_model" | "billing_interval" | "term_months">;

// logo_url is left out on purpose. PDF generation fetches it from the server,
// so on a public demo it would let any visitor point our server at any URL.
const EDITABLE_GYM_FIELDS = [
  "name", "address", "phone", "email", "contract_template", "overdue_email_subject", "overdue_email_body",
] as const;

export const demoWrites = {
  setMemberStatus(state: DemoState, _context: WriteContext, memberId: string, status: MemberStatus): WriteResult {
    const member = findMember(state, memberId);
    if (member) member.status = status;
  },

  // Mirrors lib/member-cancellation.ts: no mandate cancels straight away; with
  // one, the member sits in "Cancelling" until GoCardless confirms, and in the
  // demo no webhook ever arrives.
  cancelMember(state: DemoState, context: WriteContext, memberId: string): WriteResult {
    const member = findMember(state, memberId);
    if (!member) return;
    if (member.gc_mandate_id) {
      member.cancellation_requested_at = context.now;
    } else {
      member.status = "cancelled";
    }
  },

  createMember(
    state: DemoState,
    context: WriteContext,
    input: { first_name: string; last_name: string; email: string; phone: string | null; plan_id: string | null }
  ): WriteResult {
    const email = input.email.toLowerCase();
    if (state.members.some((member) => member.email.toLowerCase() === email)) {
      return { error: "A member with this email already exists" };
    }
    state.members.push({
      ...input,
      id: `mem-${context.id}`,
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
      start_date: toLocalISODate(context.now),
      next_billing_date: null,
      cancellation_requested_at: null,
      created_at: context.now,
    });
  },

  assignMemberPlan(state: DemoState, _context: WriteContext, memberId: string, planId: string | null): WriteResult {
    const member = findMember(state, memberId);
    if (member) member.plan_id = planId;
  },

  recordPayment(
    state: DemoState,
    context: WriteContext,
    memberId: string,
    input: { amount: number; paidAt: string; note: string | null }
  ): WriteResult {
    const member = findMember(state, memberId);
    if (!member) return { error: "Member not found" };
    state.payments.push({
      id: `pay-${context.id}`,
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
      created_at: context.now,
    });
  },

  createPlan(state: DemoState, context: WriteContext, fields: PlanFields): WriteResult {
    state.plans.push({
      ...fields,
      id: `plan-${context.id}`,
      gym_id: DEMO_GYM_ID,
      stripe_price_id: null,
      active: true,
      created_at: context.now,
    } as Plan);
  },

  updatePlan(state: DemoState, _context: WriteContext, planId: string, fields: PlanFields): WriteResult {
    const index = state.plans.findIndex((plan) => plan.id === planId);
    if (index !== -1) state.plans[index] = { ...state.plans[index], ...fields } as Plan;
  },

  setPlanActive(state: DemoState, _context: WriteContext, planId: string, active: boolean): WriteResult {
    const plan = state.plans.find((candidate) => candidate.id === planId);
    if (plan) plan.active = active;
  },

  // Mirrors deletePlan's two refusals: members still on the plan, then the
  // foreign key from any past member still pointing at it.
  deletePlan(state: DemoState, _context: WriteContext, planId: string): WriteResult {
    const onPlan = state.members.filter((member) => member.plan_id === planId);
    const current = onPlan.filter((member) => member.status === "active" || member.status === "paused").length;
    if (current > 0) {
      return { error: `Cannot delete — ${current} active member${current > 1 ? "s" : ""} on this plan` };
    }
    if (onPlan.length > 0) {
      return { error: "This plan is still linked to past members — deactivate it instead." };
    }
    state.plans = state.plans.filter((plan) => plan.id !== planId);
  },

  updateGym(
    state: DemoState,
    _context: WriteContext,
    fields: Partial<Pick<Gym, (typeof EDITABLE_GYM_FIELDS)[number]>>
  ): WriteResult {
    for (const key of EDITABLE_GYM_FIELDS) {
      const value = fields[key];
      if (value !== undefined) Object.assign(state.gym, { [key]: value });
    }
  },

  sendContract(state: DemoState, context: WriteContext, memberId: string): WriteResult {
    const pending = state.contracts.find((contract) => contract.member_id === memberId && contract.status === "pending");
    if (pending) {
      pending.last_sent_at = context.now;
      return;
    }
    state.contracts.push({
      id: `con-${context.id}`,
      gym_id: DEMO_GYM_ID,
      member_id: memberId,
      template_url: null,
      pdf_url: `demo/${memberId}.pdf`,
      signed_at: null,
      status: "pending",
      last_sent_at: context.now,
      created_at: context.now,
    });
  },

  markContractSigned(state: DemoState, context: WriteContext, contractId: string): WriteResult {
    const contract = state.contracts.find((candidate) => candidate.id === contractId);
    if (contract) {
      contract.status = "signed";
      contract.signed_at = context.now;
    }
  },

  // Stands in for the GoCardless hosted flow plus billing-callback: the member
  // ends up with a mandate (and a subscription on recurring plans) awaiting
  // their first confirmed payment.
  startDirectDebit(state: DemoState, context: WriteContext, memberId: string): WriteResult {
    const member = findMember(state, memberId);
    if (!member) return;
    const ref = context.id.toUpperCase();
    member.gc_customer_id ??= `CU00${ref}`;
    member.gc_mandate_id = `MD00${ref}`;
    member.cancellation_requested_at = null;
    if (withPlan(state, member).plan?.pricing_model === "recurring") {
      member.gc_subscription_id = `SB00${ref}`;
      member.next_billing_date = toLocalISODate(new Date(Date.parse(context.now) + 4 * 86400000));
    }
  },
};

export type DemoWriteName = keyof typeof demoWrites;

export type DemoWriteArgs<K extends DemoWriteName> =
  Parameters<(typeof demoWrites)[K]> extends [DemoState, WriteContext, ...infer Args] ? Args : never;
