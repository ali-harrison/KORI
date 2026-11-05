import { beforeEach, describe, expect, it } from "vitest";
import * as DEMO from "@/lib/dev-store";
import { createDemoData, type DemoState } from "@/lib/dev-data";
import { getMandateBadgeState } from "@/utils";

let state: DemoState;
let writes = 0;

const context = () => ({ now: new Date().toISOString(), id: `id${++writes}` });

beforeEach(() => {
  state = createDemoData();
});

// Every number on every page comes from the same rows, so a viewer can never
// catch two pages disagreeing.
describe("seed data tells one consistent story", () => {
  it("member counts agree everywhere", () => {
    const members = DEMO.getMembers(state);
    const stats = DEMO.getDashboardStats(state);

    expect(DEMO.getMemberCount(state)).toBe(members.length);
    expect(stats.totalMembers).toBe(members.length);
    expect(stats.activeMembers).toBe(members.filter((m) => m.status === "active").length);
    expect(DEMO.getMandateSummary(state).total).toBe(members.length);
  });

  it("the failed-payments stat matches Needs attention, and each is a paused member", () => {
    const alerts = DEMO.getFailedPaymentAlerts(state);

    expect(DEMO.getDashboardStats(state).failedPayments).toBe(alerts.length);
    expect(alerts.length).toBeGreaterThan(0);
    for (const alert of alerts) {
      expect(DEMO.getMember(state, alert.memberId!)?.status).toBe("paused");
    }
  });

  it("every mandate state is represented", () => {
    const summary = DEMO.getMandateSummary(state);
    for (const mandateState of ["active", "pending", "cancelling", "on_hold", "cancelled", "none"] as const) {
      expect(summary[mandateState], mandateState).toBeGreaterThan(0);
    }
  });

  it("has charges due soon, and none for a member mid-cancellation", () => {
    const upcoming = DEMO.getUpcomingCharges(state, 7);

    expect(upcoming.length).toBeGreaterThan(0);
    for (const charge of upcoming) {
      expect(getMandateBadgeState(DEMO.getMember(state, charge.memberId)!)).toBe("active");
    }
  });

  it("contains no address that could reach a real person", () => {
    for (const member of DEMO.getMembers(state)) {
      expect(member.email).toMatch(/^[a-z.]+@example\.com$/);
    }
    expect(state.gym.email).toMatch(/@example\.com$/);
  });
});

describe("writes show up in reads", () => {
  const { demoWrites } = DEMO;
  const newMember = { first_name: "Demo", last_name: "Person", email: "demo@example.com", phone: null, plan_id: "plan-weekly" };

  it("adding a member updates the list and the stats", () => {
    const before = DEMO.getDashboardStats(state).totalMembers;

    expect(demoWrites.createMember(state, context(), newMember)).toBeUndefined();

    expect(DEMO.getDashboardStats(state).totalMembers).toBe(before + 1);
    expect(DEMO.getMembers(state)[0]).toMatchObject({ first_name: "Demo", status: "pending" });
  });

  it("refuses a duplicate email whatever the case, like the real unique index", () => {
    demoWrites.createMember(state, context(), newMember);
    expect(demoWrites.createMember(state, context(), { ...newMember, email: "DEMO@example.com" })).toEqual({
      error: "A member with this email already exists",
    });
  });

  it("recording a payment for a failed member clears their alert and adds to revenue", () => {
    const [alert] = DEMO.getFailedPaymentAlerts(state);
    const revenueBefore = DEMO.getDashboardStats(state).monthlyRevenue;
    const alertsBefore = DEMO.getFailedPaymentAlerts(state).length;

    demoWrites.recordPayment(state, context(), alert.memberId!, {
      amount: 18,
      paidAt: new Date().toISOString().split("T")[0],
      note: "Cash",
    });

    expect(DEMO.getFailedPaymentAlerts(state)).toHaveLength(alertsBefore - 1);
    expect(DEMO.getDashboardStats(state).monthlyRevenue).toBe(revenueBefore + 18);
  });

  it("cancelling goes straight through without a mandate, and via Cancelling with one", () => {
    const cash = DEMO.getMembers(state).find((m) => m.status === "active" && !m.gc_mandate_id)!;
    const debit = DEMO.getMembers(state).find((m) => m.status === "active" && m.gc_mandate_id && !m.cancellation_requested_at)!;

    demoWrites.cancelMember(state, context(), cash.id);
    demoWrites.cancelMember(state, context(), debit.id);

    expect(DEMO.getMember(state, cash.id)?.status).toBe("cancelled");
    expect(getMandateBadgeState(DEMO.getMember(state, debit.id)!)).toBe("cancelling");
  });

  it("deleting a plan follows the same refusals as the real action", () => {
    expect(demoWrites.deletePlan(state, context(), "plan-weekly")?.error).toMatch(
      /^Cannot delete — \d+ active members on this plan$/
    );

    demoWrites.createPlan(state, context(), {
      name: "Unused",
      description: null,
      price: 10,
      pricing_model: "paid_in_full",
      billing_interval: null,
      term_months: 1,
    });
    const unused = DEMO.getPlans(state).find((plan) => plan.name === "Unused")!;
    expect(demoWrites.deletePlan(state, context(), unused.id)).toBeUndefined();
    expect(DEMO.getPlans(state).some((plan) => plan.name === "Unused")).toBe(false);
  });

  it("setting up direct debit gives a recurring member a mandate and a next charge", () => {
    const member = DEMO.getMembers(state).find(
      (m) => m.status === "pending" && !m.gc_mandate_id && m.plan?.pricing_model === "recurring"
    )!;

    demoWrites.startDirectDebit(state, context(), member.id);

    const updated = DEMO.getMember(state, member.id)!;
    expect(getMandateBadgeState(updated)).toBe("pending");
    expect(updated.gc_subscription_id).toBeTruthy();
    expect(updated.next_billing_date).toBeTruthy();
  });

  // PDF generation fetches the logo from the server, so on a public demo a
  // writable logo URL would let anyone aim our server at any address.
  it("never accepts a logo URL, even if one is passed in", () => {
    demoWrites.updateGym(state, context(), { name: "Renamed", logo_url: "http://169.254.169.254/" } as never);

    expect(state.gym.name).toBe("Renamed");
    expect(state.gym.logo_url).toBeNull();
  });
});
