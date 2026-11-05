import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// Every other action test runs with a logged-in user and DEV_BYPASS off, which
// is exactly why this bug shipped: each action checked for a Supabase session
// before looking at DEV_BYPASS, so in demo mode — where no session exists —
// every button click redirected to /auth/login. These run the real actions the
// way demo mode does, with DEV_BYPASS on and no user at all. A redirect throws,
// so any action reaching for one fails its test.

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`UNEXPECTED_REDIRECT:${path}`);
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/supabase", () => ({
  createAdminClient: vi.fn(),
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: null }, error: new Error("Auth session missing") }) },
    from: () => {
      throw new Error("Demo mode must never touch Supabase");
    },
  })),
}));

vi.stubEnv("NODE_ENV", "development");
vi.stubEnv("DEV_BYPASS", "true");

const members = await import("@/app/actions/members");
const payments = await import("@/app/actions/payments");
const plans = await import("@/app/actions/plans");
const gym = await import("@/app/actions/gym");
const reminders = await import("@/app/actions/reminders");
const contracts = await import("@/app/actions/contracts");
const gocardless = await import("@/app/actions/gocardless");
const DEMO = await import("@/lib/dev-store");
const { DEV_BYPASS } = await import("@/lib/queries");

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const GYM_ID = "dev-gym-id";

beforeEach(() => {
  DEMO.resetDemoState();
  redirect.mockClear();
});

afterAll(() => vi.unstubAllEnvs());

describe("every action works in demo mode with no session", () => {
  it("is actually running in demo mode", () => {
    expect(DEV_BYPASS).toBe(true);
  });

  it("createMember", async () => {
    const result = await members.createMember(
      GYM_ID,
      formData({ first_name: "Demo", last_name: "Person", email: "demo@example.com", plan_id: "plan-weekly" })
    );
    expect(result).toEqual({ success: true });
    expect(DEMO.getMembers().some((m) => m.email === "demo@example.com")).toBe(true);
  });

  it("createMember still validates", async () => {
    const result = await members.createMember(
      GYM_ID,
      formData({ first_name: "Demo", last_name: "Person", email: "not-an-email" })
    );
    expect(result).toEqual({ error: "Enter a valid email address" });
  });

  it("updateMemberStatus", async () => {
    expect(await members.updateMemberStatus("mem-1", GYM_ID, "paused")).toEqual({ success: true });
    expect(DEMO.getMember("mem-1")?.status).toBe("paused");
  });

  it("cancelMember", async () => {
    expect(await members.cancelMember("mem-6", GYM_ID)).toEqual({ success: true });
    expect(DEMO.getMember("mem-6")?.status).toBe("cancelled");
  });

  it("assignMemberPlan", async () => {
    expect(await members.assignMemberPlan("mem-1", GYM_ID, "plan-pif-3mo")).toEqual({ success: true });
    expect(DEMO.getMember("mem-1")?.plan?.name).toBe("3-Month Paid in Full");
  });

  it("recordPayment", async () => {
    const result = await payments.recordPayment("mem-1", GYM_ID, { amount: 42, paidAt: "2026-11-05", note: "Cash" });
    expect(result).toEqual({ success: true });
    expect(DEMO.getMemberPayments("mem-1").some((p) => p.amount === 42)).toBe(true);
  });

  it("createPlan, updatePlan, togglePlanActive, deletePlan", async () => {
    const fields = { name: "Student", price: "12", pricing_model: "recurring", billing_interval: "weekly" };
    expect(await plans.createPlan(GYM_ID, formData(fields))).toEqual({ success: true });
    const plan = DEMO.getPlans().find((p) => p.name === "Student")!;

    expect(await plans.updatePlan(plan.id, GYM_ID, formData({ ...fields, price: "13" }))).toEqual({ success: true });
    expect(DEMO.getPlans().find((p) => p.id === plan.id)?.price).toBe(13);

    expect(await plans.togglePlanActive(plan.id, GYM_ID, false)).toEqual({ success: true });
    expect(DEMO.getPlans().find((p) => p.id === plan.id)?.active).toBe(false);

    expect(await plans.deletePlan(plan.id, GYM_ID)).toEqual({ success: true });
  });

  it("updateGym and the template actions", async () => {
    expect(await gym.updateGym(GYM_ID, formData({ name: "Southerly Strength Southport" }))).toEqual({ success: true });
    expect(await gym.updateContractTemplate(GYM_ID, formData({ contract_template: "Hello {{member_name}}" }))).toEqual({ success: true });
    expect(
      await gym.updateReminderTemplate(GYM_ID, formData({ overdue_email_subject: "Oi", overdue_email_body: "Pay up" }))
    ).toEqual({ success: true });

    expect(DEMO.getGym()).toMatchObject({
      name: "Southerly Strength Southport",
      contract_template: "Hello {{member_name}}",
      overdue_email_subject: "Oi",
    });
  });

  it("sendOverdueReminder", async () => {
    const [alert] = DEMO.getFailedPaymentAlerts();
    expect(await reminders.sendOverdueReminder(alert.memberId!, GYM_ID)).toEqual({ success: true });
  });

  it("sendContract, markContractSigned, getContractDownloadUrl", async () => {
    expect(await contracts.sendContract("mem-16", GYM_ID)).toEqual({ success: true });
    const [contract] = DEMO.getMemberContracts("mem-16");

    expect(await contracts.getContractDownloadUrl(contract.id, GYM_ID)).toEqual({
      url: `/api/demo/contract/${contract.id}`,
    });

    expect(await contracts.markContractSigned(contract.id, GYM_ID, "mem-16")).toEqual({ success: true });
    expect(DEMO.getMemberContracts("mem-16")[0].status).toBe("signed");
  });

  it("startBillingForMember", async () => {
    expect(await gocardless.startBillingForMember("mem-16")).toEqual({ success: true });
    expect(DEMO.getMember("mem-16")?.gc_mandate_id).toBeTruthy();
  });
});
