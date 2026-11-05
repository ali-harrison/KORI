import { beforeEach, describe, expect, it } from "vitest";
import * as DEMO from "@/lib/dev-store";
import { getMandateBadgeState } from "@/utils";

beforeEach(() => DEMO.resetDemoState());

// The whole point of the demo store: every number on every page comes from
// the same rows, so a viewer can never catch two pages disagreeing.
describe("seed data tells one consistent story", () => {
  it("member counts agree everywhere", () => {
    const members = DEMO.getMembers();
    const stats = DEMO.getDashboardStats();

    expect(DEMO.getMemberCount()).toBe(members.length);
    expect(stats.totalMembers).toBe(members.length);
    expect(stats.activeMembers).toBe(members.filter((m) => m.status === "active").length);
    expect(DEMO.getMandateSummary().total).toBe(members.length);
  });

  it("the failed-payments stat matches Needs attention, and each is a paused member", () => {
    const alerts = DEMO.getFailedPaymentAlerts();

    expect(DEMO.getDashboardStats().failedPayments).toBe(alerts.length);
    expect(alerts.length).toBeGreaterThan(0);
    for (const alert of alerts) {
      expect(DEMO.getMember(alert.memberId!)?.status).toBe("paused");
    }
  });

  it("every mandate state is represented", () => {
    const summary = DEMO.getMandateSummary();
    for (const state of ["active", "pending", "cancelling", "on_hold", "cancelled", "none"] as const) {
      expect(summary[state], state).toBeGreaterThan(0);
    }
  });

  it("has charges due soon, and none for a member mid-cancellation", () => {
    const upcoming = DEMO.getUpcomingCharges(7);

    expect(upcoming.length).toBeGreaterThan(0);
    for (const charge of upcoming) {
      expect(getMandateBadgeState(DEMO.getMember(charge.memberId)!)).toBe("active");
    }
  });

  it("contains no addresses that could reach a real person", () => {
    for (const member of DEMO.getMembers()) {
      expect(member.email).toMatch(/^[a-z.]+@example\.co\.nz$/);
    }
  });
});

describe("writes show up in reads", () => {
  const newMember = { first_name: "Demo", last_name: "Person", email: "demo@example.com", phone: null, plan_id: "plan-weekly" };

  it("adding a member updates the list and the stats", () => {
    const before = DEMO.getDashboardStats().totalMembers;

    expect(DEMO.createMember(newMember)).toBeUndefined();

    expect(DEMO.getDashboardStats().totalMembers).toBe(before + 1);
    expect(DEMO.getMembers()[0]).toMatchObject({ first_name: "Demo", status: "pending" });
  });

  it("refuses a duplicate email whatever the case, like the real unique index", () => {
    DEMO.createMember(newMember);
    expect(DEMO.createMember({ ...newMember, email: "DEMO@example.com" })).toEqual({
      error: "A member with this email already exists",
    });
  });

  it("recording a payment for a failed member clears their alert and adds to revenue", () => {
    const [alert] = DEMO.getFailedPaymentAlerts();
    const revenueBefore = DEMO.getDashboardStats().monthlyRevenue;
    const alertsBefore = DEMO.getFailedPaymentAlerts().length;

    DEMO.recordPayment(alert.memberId!, { amount: 15, paidAt: new Date().toISOString().split("T")[0], note: "Cash" });

    expect(DEMO.getFailedPaymentAlerts()).toHaveLength(alertsBefore - 1);
    expect(DEMO.getDashboardStats().monthlyRevenue).toBe(revenueBefore + 15);
  });

  it("cancelling goes straight through without a mandate, and via Cancelling with one", () => {
    const cash = DEMO.getMembers().find((m) => m.status === "active" && !m.gc_mandate_id)!;
    const debit = DEMO.getMembers().find((m) => m.status === "active" && m.gc_mandate_id && !m.cancellation_requested_at)!;

    DEMO.cancelMember(cash.id);
    DEMO.cancelMember(debit.id);

    expect(DEMO.getMember(cash.id)?.status).toBe("cancelled");
    expect(getMandateBadgeState(DEMO.getMember(debit.id)!)).toBe("cancelling");
  });

  it("deleting a plan follows the same refusals as the real action", () => {
    expect(DEMO.deletePlan("plan-weekly")?.error).toMatch(/^Cannot delete — \d+ active members on this plan$/);

    DEMO.createPlan({ name: "Unused", description: null, price: 10, pricing_model: "paid_in_full", billing_interval: null, term_months: 1 });
    const unused = DEMO.getPlans().find((plan) => plan.name === "Unused")!;
    expect(DEMO.deletePlan(unused.id)).toBeUndefined();
    expect(DEMO.getPlans().some((plan) => plan.name === "Unused")).toBe(false);
  });

  it("setting up direct debit gives a recurring member a mandate and a next charge", () => {
    const member = DEMO.getMembers().find((m) => m.status === "pending" && !m.gc_mandate_id && m.plan?.pricing_model === "recurring")!;

    DEMO.startDirectDebit(member.id);

    const updated = DEMO.getMember(member.id)!;
    expect(getMandateBadgeState(updated)).toBe("pending");
    expect(updated.gc_subscription_id).toBeTruthy();
    expect(updated.next_billing_date).toBeTruthy();
  });

  it("reset puts everything back", () => {
    const before = DEMO.getMemberCount();
    DEMO.createMember(newMember);
    DEMO.resetDemoState();
    expect(DEMO.getMemberCount()).toBe(before);
  });
});
