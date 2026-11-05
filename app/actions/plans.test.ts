import { describe, it, expect, vi, beforeEach } from "vitest";

// Same approach as app/actions/members.test.ts — real "use server" actions,
// only the Next-runtime bits mocked. See that file's header comment for why.

const authedUser = { id: "owner-1" };

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("UNEXPECTED_REDIRECT");
  }),
}));
vi.mock("@/lib/supabase", () => ({ createServerSupabaseClient: vi.fn() }));

import { createServerSupabaseClient } from "@/lib/supabase";
import { createPlan, updatePlan, deletePlan } from "@/app/actions/plans";

function mockClient(client: unknown) {
  vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never);
}

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

// Minimal fake covering exactly the query shapes createPlan/updatePlan/
// deletePlan use: plans insert/update/delete, members count-select.
function createFakeSupabase(opts: {
  activeOrPausedMemberCount?: number;
  writeError?: { code?: string; message: string } | null;
}) {
  const { activeOrPausedMemberCount = 0, writeError = null } = opts;
  const writes: Array<{ op: string; values?: Record<string, unknown> }> = [];

  const client = {
    auth: { getUser: async () => ({ data: { user: authedUser } }) },
    from(table: string) {
      if (table === "members") {
        return {
          select: (_cols: string, _opts: { count: string; head: boolean }) => ({
            eq: () => ({
              in: async () => ({ count: activeOrPausedMemberCount }),
            }),
          }),
        };
      }
      if (table === "plans") {
        return {
          insert: (values: Record<string, unknown>) => {
            writes.push({ op: "insert", values });
            return Promise.resolve({ error: writeError });
          },
          update: (values: Record<string, unknown>) => ({
            eq: () => ({
              eq: async () => {
                writes.push({ op: "update", values });
                return { error: writeError };
              },
            }),
          }),
          delete: () => ({
            eq: () => ({
              eq: async () => {
                writes.push({ op: "delete" });
                return { error: writeError };
              },
            }),
          }),
        };
      }
      throw new Error(`Unexpected table in fake Supabase client: ${table}`);
    },
  };

  return { client, writes };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createPlan — pricing shape validation (mirrors plans_pricing_shape_check)", () => {
  it("rejects a missing name", async () => {
    const { client, writes } = createFakeSupabase({});
    mockClient(client);
    const result = await createPlan("gym-1", formData({ name: "", price: "20", pricing_model: "recurring", billing_interval: "weekly" }));
    expect(result).toEqual({ error: "Plan name is required" });
    expect(writes).toHaveLength(0);
  });

  it("rejects a non-positive price", async () => {
    const { client, writes } = createFakeSupabase({});
    mockClient(client);
    const result = await createPlan("gym-1", formData({ name: "Weekly", price: "0", pricing_model: "recurring", billing_interval: "weekly" }));
    expect(result).toEqual({ error: "Enter a valid price" });
    expect(writes).toHaveLength(0);
  });

  it("rejects recurring with an invalid billing_interval", async () => {
    const { client, writes } = createFakeSupabase({});
    mockClient(client);
    const result = await createPlan("gym-1", formData({ name: "Weekly", price: "20", pricing_model: "recurring", billing_interval: "fortnightly" }));
    expect(result).toEqual({ error: "Invalid billing interval" });
    expect(writes).toHaveLength(0);
  });

  it("rejects paid_in_full with a zero/missing term_months", async () => {
    const { client, writes } = createFakeSupabase({});
    mockClient(client);
    const result = await createPlan("gym-1", formData({ name: "PIF", price: "500", pricing_model: "paid_in_full", term_months: "0" }));
    expect(result).toEqual({ error: "Enter a valid term length in months" });
    expect(writes).toHaveLength(0);
  });

  it("inserts a valid recurring plan with term_months null", async () => {
    const { client, writes } = createFakeSupabase({});
    mockClient(client);
    const result = await createPlan("gym-1", formData({ name: "Weekly", price: "20", pricing_model: "recurring", billing_interval: "weekly" }));
    expect(result).toEqual({ success: true });
    expect(writes).toEqual([
      { op: "insert", values: expect.objectContaining({ pricing_model: "recurring", billing_interval: "weekly", term_months: null }) },
    ]);
  });

  it("inserts a valid paid_in_full plan with billing_interval null", async () => {
    const { client, writes } = createFakeSupabase({});
    mockClient(client);
    const result = await createPlan("gym-1", formData({ name: "12mo PIF", price: "799", pricing_model: "paid_in_full", term_months: "12" }));
    expect(result).toEqual({ success: true });
    expect(writes).toEqual([
      { op: "insert", values: expect.objectContaining({ pricing_model: "paid_in_full", billing_interval: null, term_months: 12 }) },
    ]);
  });
});

describe("updatePlan", () => {
  it("applies the same pricing validation as createPlan", async () => {
    const { client, writes } = createFakeSupabase({});
    mockClient(client);
    const result = await updatePlan("plan-1", "gym-1", formData({ name: "Weekly", price: "20", pricing_model: "paid_in_full", term_months: "-1" }));
    expect(result).toEqual({ error: "Enter a valid term length in months" });
    expect(writes).toHaveLength(0);
  });
});

describe("deletePlan", () => {
  it("blocks deletion when active/paused members are still on the plan", async () => {
    const { client, writes } = createFakeSupabase({ activeOrPausedMemberCount: 3 });
    mockClient(client);
    const result = await deletePlan("plan-1", "gym-1");
    expect(result).toEqual({ error: "Cannot delete — 3 active members on this plan" });
    expect(writes).toHaveLength(0);
  });

  it("deletes cleanly when no active/paused members remain", async () => {
    const { client, writes } = createFakeSupabase({ activeOrPausedMemberCount: 0 });
    mockClient(client);
    const result = await deletePlan("plan-1", "gym-1");
    expect(result).toEqual({ success: true });
    expect(writes).toEqual([{ op: "delete" }]);
  });

  // members.plan_id has no ON DELETE rule, so a cancelled or pending member
  // still blocks the delete at the database even though the count above
  // only looks at active/paused members.
  it("translates a foreign-key refusal into something an owner can act on", async () => {
    const { client } = createFakeSupabase({
      writeError: { code: "23503", message: 'update or delete on table "plans" violates foreign key constraint' },
    });
    mockClient(client);
    const result = await deletePlan("plan-1", "gym-1");
    expect(result).toEqual({ error: "This plan is still linked to past members — deactivate it instead." });
  });
});
