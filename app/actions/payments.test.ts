import { describe, it, expect, vi, beforeEach } from "vitest";

// Same approach as app/actions/members.test.ts — see that file's header.

const authedUser = { id: "owner-1" };

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("UNEXPECTED_REDIRECT");
  }),
}));
vi.mock("@/lib/supabase", () => ({ createServerSupabaseClient: vi.fn() }));

import { createServerSupabaseClient } from "@/lib/supabase";
import { recordPayment } from "@/app/actions/payments";

function mockClient(client: unknown) {
  vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never);
}

function createFakeSupabase(opts: { member?: { id: string; plan_id: string | null } | null }) {
  const { member = { id: "mem-1", plan_id: "plan-1" } } = opts;
  const inserted: Array<Record<string, unknown>> = [];

  const client = {
    auth: { getUser: async () => ({ data: { user: authedUser } }) },
    from(table: string) {
      if (table === "members") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => (member ? { data: member, error: null } : { data: null, error: { message: "not found" } }),
              }),
            }),
          }),
        };
      }
      if (table === "payments") {
        return {
          insert: (values: Record<string, unknown>) => {
            inserted.push(values);
            return Promise.resolve({ error: null });
          },
        };
      }
      throw new Error(`Unexpected table in fake Supabase client: ${table}`);
    },
  };

  return { client, inserted };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("recordPayment", () => {
  it("rejects a non-positive amount before touching the database", async () => {
    const { client, inserted } = createFakeSupabase({});
    mockClient(client);
    const result = await recordPayment("mem-1", "gym-1", { amount: 0, paidAt: "2026-01-01" });
    expect(result).toEqual({ error: "Enter a valid amount" });
    expect(inserted).toHaveLength(0);
  });

  it("rejects a non-finite amount", async () => {
    const { client, inserted } = createFakeSupabase({});
    mockClient(client);
    const result = await recordPayment("mem-1", "gym-1", { amount: NaN, paidAt: "2026-01-01" });
    expect(result).toEqual({ error: "Enter a valid amount" });
    expect(inserted).toHaveLength(0);
  });

  it("rejects a missing paid-at date", async () => {
    const { client, inserted } = createFakeSupabase({});
    mockClient(client);
    const result = await recordPayment("mem-1", "gym-1", { amount: 15, paidAt: "" });
    expect(result).toEqual({ error: "Enter the date paid" });
    expect(inserted).toHaveLength(0);
  });

  it("rejects a member that doesn't belong to this gym", async () => {
    const { client, inserted } = createFakeSupabase({ member: null });
    mockClient(client);
    const result = await recordPayment("mem-1", "gym-1", { amount: 15, paidAt: "2026-01-01" });
    expect(result).toEqual({ error: "Member not found" });
    expect(inserted).toHaveLength(0);
  });

  it("records a manual payment using the member's own plan_id, not a client-supplied one", async () => {
    const { client, inserted } = createFakeSupabase({ member: { id: "mem-1", plan_id: "plan-real" } });
    mockClient(client);
    const result = await recordPayment("mem-1", "gym-1", { amount: 15, paidAt: "2026-01-01", note: "Cash" });
    expect(result).toEqual({ success: true });
    expect(inserted).toEqual([
      {
        gym_id: "gym-1",
        member_id: "mem-1",
        plan_id: "plan-real",
        amount: 15,
        provider: "manual",
        type: "one_off",
        status: "succeeded",
        paid_at: "2026-01-01",
        note: "Cash",
      },
    ]);
  });
});
