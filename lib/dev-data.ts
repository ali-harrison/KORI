import type { Contract, Gym, Member, MemberStatus, Payment, Plan } from "@/types";
import { DEFAULT_CONTRACT_TEMPLATE, DEFAULT_OVERDUE_EMAIL_SUBJECT, DEFAULT_OVERDUE_EMAIL_BODY } from "@/lib/templates";
import { toLocalISODate } from "@/utils";

// Demo-mode seed data: one consistent set of rows, dated relative to today so
// the demo never goes stale. Nothing here is a pre-computed total — every
// number on screen is derived from these rows by lib/dev-store.ts, so the
// dashboard, member list and billing page can't contradict each other.
// Everything is made up. Emails use example.com, which is reserved and can
// never belong to anyone.

export const DEMO_GYM_ID = "dev-gym-id";
export const DEMO_USER = { id: "dev-user-id", email: "owner@example.com" };

export interface DemoState {
  gym: Gym;
  plans: Plan[];
  members: Member[];
  contracts: Contract[];
  payments: Payment[];
}

const DAY_MS = 86400000;

type PlanKey = "weekly" | "pif12" | "pif3";

// How a member pays, which decides their GoCardless fields and history:
//   dd        — live mandate; recurring plans also get a subscription
//   cash      — never on direct debit
//   ex-dd     — had a mandate that's since been cancelled
type Billing = "dd" | "cash" | "ex-dd";

interface MemberSeed {
  first: string;
  last: string;
  plan: PlanKey;
  status: MemberStatus;
  billing: Billing;
  joinedDaysAgo: number;
  // Weekly direct debits run in two cohorts, so the billing page shows a real
  // spread of collection days. The number is how long ago the last charge was.
  lastChargeDaysAgo?: 2 | 5;
  // A charge that bounced — lands in Needs attention, member goes on hold.
  failedLatestCharge?: boolean;
  // Mandate set up, first payment not confirmed yet.
  awaitingFirstPayment?: boolean;
  cancelling?: boolean;
  contract?: "signed" | "pending" | "none";
}

// Order fixes the ids (mem-1, mem-2, ...).
const MEMBER_SEEDS: MemberSeed[] = [
  { first: "Sarah", last: "Mitchell", plan: "weekly", status: "active", billing: "dd", joinedDaysAgo: 290, lastChargeDaysAgo: 5 },
  { first: "Liam", last: "Taufa", plan: "pif12", status: "active", billing: "dd", joinedDaysAgo: 262 },
  { first: "Aroha", last: "Ngata", plan: "weekly", status: "paused", billing: "dd", joinedDaysAgo: 244, lastChargeDaysAgo: 2, failedLatestCharge: true },
  { first: "James", last: "Park", plan: "pif3", status: "paused", billing: "dd", joinedDaysAgo: 75 },
  { first: "Mia", last: "Chen", plan: "weekly", status: "pending", billing: "dd", joinedDaysAgo: 3, awaitingFirstPayment: true, contract: "pending" },
  { first: "Tane", last: "Walker", plan: "pif12", status: "active", billing: "cash", joinedDaysAgo: 228 },
  { first: "Priya", last: "Sharma", plan: "weekly", status: "cancelled", billing: "cash", joinedDaysAgo: 281 },
  { first: "Kahu", last: "Ropata", plan: "weekly", status: "paused", billing: "ex-dd", joinedDaysAgo: 215 },
  { first: "Ngahuia", last: "Reid", plan: "weekly", status: "active", billing: "dd", joinedDaysAgo: 199, lastChargeDaysAgo: 5, cancelling: true },
  { first: "Emma", last: "Thompson", plan: "weekly", status: "active", billing: "dd", joinedDaysAgo: 170, lastChargeDaysAgo: 2 },
  { first: "Jayden", last: "Tamati", plan: "weekly", status: "active", billing: "dd", joinedDaysAgo: 142, lastChargeDaysAgo: 5 },
  { first: "Grace", last: "Wallace", plan: "pif12", status: "active", billing: "dd", joinedDaysAgo: 121 },
  { first: "Kane", last: "Fa'amausili", plan: "pif12", status: "active", billing: "cash", joinedDaysAgo: 150 },
  { first: "Chloe", last: "Anderson", plan: "pif3", status: "active", billing: "dd", joinedDaysAgo: 31 },
  { first: "Ben", last: "Richardson", plan: "pif12", status: "active", billing: "dd", joinedDaysAgo: 2, contract: "pending" },
  { first: "Zara", last: "Patel", plan: "weekly", status: "pending", billing: "cash", joinedDaysAgo: 1, contract: "none" },
  { first: "Ethan", last: "Wiremu", plan: "pif3", status: "pending", billing: "cash", joinedDaysAgo: 2, contract: "none" },
  { first: "Olivia", last: "Hart", plan: "weekly", status: "cancelled", billing: "ex-dd", joinedDaysAgo: 180 },
  { first: "Hemi", last: "Parata", plan: "weekly", status: "paused", billing: "dd", joinedDaysAgo: 96, lastChargeDaysAgo: 5, failedLatestCharge: true },
  { first: "Lucy", last: "Brown", plan: "weekly", status: "active", billing: "dd", joinedDaysAgo: 88, lastChargeDaysAgo: 2 },
  { first: "Noah", last: "Sione", plan: "weekly", status: "active", billing: "dd", joinedDaysAgo: 64, lastChargeDaysAgo: 2 },
  { first: "Isla", last: "Tawhiri", plan: "weekly", status: "active", billing: "dd", joinedDaysAgo: 47, lastChargeDaysAgo: 5 },
];

const WEEKS_OF_HISTORY = 8;

export function createDemoData(now = new Date()): DemoState {
  const daysFromNow = (days: number) => new Date(now.getTime() + days * DAY_MS);
  const dateOnly = (date: Date) => toLocalISODate(date);
  const utcMidnight = (date: Date) => `${dateOnly(date)}T00:00:00.000Z`;

  const gym: Gym = {
    id: DEMO_GYM_ID,
    owner_id: DEMO_USER.id,
    name: "Southerly Strength",
    slug: "southerly-strength",
    logo_url: null,
    address: "12 Harbour Road, Southport",
    phone: "+64 21 555 0100",
    email: "hello@example.com",
    stripe_account_id: null,
    stripe_onboarding_complete: false,
    // Connected, since the members below have live mandates. No token: demo
    // mode never talks to GoCardless.
    gc_organisation_id: "OR000DEMO",
    gc_access_token: null,
    subscription_status: "trial",
    contract_template: DEFAULT_CONTRACT_TEMPLATE,
    overdue_email_subject: DEFAULT_OVERDUE_EMAIL_SUBJECT,
    overdue_email_body: DEFAULT_OVERDUE_EMAIL_BODY,
    created_at: daysFromNow(-320).toISOString(),
  };

  const planBase = {
    gym_id: DEMO_GYM_ID,
    stripe_price_id: null,
    active: true,
    created_at: gym.created_at,
  };

  const plansByKey: Record<PlanKey, Plan> = {
    weekly: {
      ...planBase,
      id: "plan-weekly",
      name: "Weekly Direct Debit",
      description: "Full gym access, billed weekly",
      price: 18,
      pricing_model: "recurring",
      billing_interval: "weekly",
      term_months: null,
    },
    pif12: {
      ...planBase,
      id: "plan-pif-12mo",
      name: "12-Month Paid in Full",
      description: "Best value — pay upfront and save",
      price: 799,
      pricing_model: "paid_in_full",
      billing_interval: null,
      term_months: 12,
    },
    pif3: {
      ...planBase,
      id: "plan-pif-3mo",
      name: "3-Month Paid in Full",
      description: "Short-term commitment, paid upfront",
      price: 249,
      pricing_model: "paid_in_full",
      billing_interval: null,
      term_months: 3,
    },
  };

  const members: Member[] = [];
  const contracts: Contract[] = [];
  const payments: Payment[] = [];

  function addPayment(
    seed: Partial<Payment> & Pick<Payment, "member_id" | "plan_id" | "amount" | "provider" | "type" | "status" | "created_at">
  ) {
    payments.push({
      id: `pay-${payments.length + 1}`,
      gym_id: DEMO_GYM_ID,
      currency: "NZD",
      provider_payment_id: null,
      note: null,
      gc_event_id: null,
      paid_at: null,
      ...seed,
    });
  }

  MEMBER_SEEDS.forEach((seed, index) => {
    const id = `mem-${index + 1}`;
    const plan = plansByKey[seed.plan];
    const joined = daysFromNow(-seed.joinedDaysAgo);
    const onDirectDebit = seed.billing === "dd";
    const recurringDebit = onDirectDebit && plan.pricing_model === "recurring";
    const ref = `${seed.first.slice(0, 4).toUpperCase()}${String(index + 1).padStart(2, "0")}`;

    let nextBilling: string | null = null;
    if (recurringDebit && seed.status === "active" && seed.lastChargeDaysAgo) {
      nextBilling = dateOnly(daysFromNow(7 - seed.lastChargeDaysAgo));
    } else if (seed.awaitingFirstPayment) {
      nextBilling = dateOnly(daysFromNow(4));
    }

    members.push({
      id,
      gym_id: DEMO_GYM_ID,
      user_id: null,
      first_name: seed.first,
      last_name: seed.last,
      email: `${seed.first}.${seed.last}`.toLowerCase().replace(/[^a-z.]/g, "") + "@example.com",
      phone: `+64 21 555 ${String(101 + index * 37).padStart(4, "0")}`,
      plan_id: plan.id,
      status: seed.status,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      gc_customer_id: seed.billing === "cash" ? null : `CU00${ref}`,
      gc_mandate_id: onDirectDebit ? `MD00${ref}` : null,
      gc_subscription_id: recurringDebit ? `SB00${ref}` : null,
      invite_token: null,
      invite_sent_at: null,
      start_date: dateOnly(joined),
      next_billing_date: nextBilling,
      cancellation_requested_at: seed.cancelling ? daysFromNow(-1).toISOString() : null,
      created_at: joined.toISOString(),
    });

    // ── Contract ──
    const contractState = seed.contract ?? "signed";
    if (contractState !== "none") {
      const signed = contractState === "signed";
      contracts.push({
        id: `con-${index + 1}`,
        gym_id: DEMO_GYM_ID,
        member_id: id,
        template_url: null,
        // Demo PDFs are generated on request (app/api/demo/contract/[id]);
        // this only needs to be non-null so the Download button appears.
        pdf_url: `demo/${id}.pdf`,
        signed_at: signed ? joined.toISOString() : null,
        status: signed ? "signed" : "pending",
        last_sent_at: joined.toISOString(),
        created_at: joined.toISOString(),
      });
    }

    // ── Payment history ──
    if (seed.awaitingFirstPayment || seed.status === "pending") return;

    if (plan.pricing_model === "paid_in_full") {
      addPayment({
        member_id: id,
        plan_id: plan.id,
        amount: plan.price,
        provider: onDirectDebit ? "gocardless" : "manual",
        type: "one_off",
        status: "succeeded",
        note: onDirectDebit ? null : "Bank transfer",
        paid_at: utcMidnight(joined),
        created_at: joined.toISOString(),
      });
      return;
    }

    if (seed.lastChargeDaysAgo) {
      for (let week = 0; week < WEEKS_OF_HISTORY; week++) {
        const daysAgo = seed.lastChargeDaysAgo + week * 7;
        if (daysAgo > seed.joinedDaysAgo) break;
        const chargedOn = daysFromNow(-daysAgo);

        if (week === 0 && seed.failedLatestCharge) {
          addPayment({
            member_id: id,
            plan_id: plan.id,
            amount: plan.price,
            provider: "gocardless",
            type: "recurring",
            status: "failed",
            // Reported today: banks take a couple of days to bounce a debit.
            created_at: daysFromNow(-3 / 24).toISOString(),
          });
          continue;
        }

        addPayment({
          member_id: id,
          plan_id: plan.id,
          amount: plan.price,
          provider: "gocardless",
          type: "recurring",
          status: "succeeded",
          paid_at: utcMidnight(chargedOn),
          created_at: daysFromNow(-daysAgo + 1).toISOString(),
        });
      }
      return;
    }

    // Weekly members with no live debit: a stretch of older manual payments.
    for (let week = 0; week < 4; week++) {
      const paidOn = daysFromNow(-(35 + week * 7));
      addPayment({
        member_id: id,
        plan_id: plan.id,
        amount: plan.price,
        provider: "manual",
        type: "one_off",
        status: "succeeded",
        note: "Cash",
        paid_at: utcMidnight(paidOn),
        created_at: paidOn.toISOString(),
      });
    }
  });

  return { gym, plans: Object.values(plansByKey), members, contracts, payments };
}
