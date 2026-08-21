import { describe, it, expect, vi, beforeEach } from "vitest";

// These are real "use server" actions, exercised here exactly as a real
// request would call them — auth check, validation, then the Supabase
// write — rather than testing an artificially extracted "core" function.
// Only the Next-runtime bits that don't exist outside an actual request
// (cookies-backed Supabase client, redirect, cache revalidation) are
// mocked; everything else is the real module graph. NODE_ENV is "test"
// under vitest, so the real DEV_BYPASS (lib/queries.ts) resolves to false
// here, same as it would in a real production request — no need to fake it.

const authedUser = { id: "owner-1", email: "owner@example.com" };

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("UNEXPECTED_REDIRECT");
  }),
}));

// Minimal fake covering exactly the query shapes createMember/
// updateMemberStatus use: members select/insert/update, plans select.
function createFakeSupabase(opts: {
  existingPlans?: Array<{ id: string; gym_id: string }>;
  insertError?: { code?: string; message: string } | null;
  updateError?: { message: string } | null;
}) {
  const { existingPlans = [], insertError = null, updateError = null } = opts;
  const inserted: Array<Record<string, unknown>> = [];
  const updated: Array<{ table: string; values: Record<string, unknown> }> = [];

  const client = {
    auth: { getUser: async () => ({ data: { user: authedUser } }) },
    from(table: string) {
      if (table === "plans") {
        return {
          select: () => ({
            eq: (_c1: string, planId: string) => ({
              eq: (_c2: string, gymId: string) => ({
                maybeSingle: async () => ({
                  data: existingPlans.find((p) => p.id === planId && p.gym_id === gymId) ?? null,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "members") {
        return {
          insert: (values: Record<string, unknown>) => {
            inserted.push(values);
            return Promise.resolve({ error: insertError });
          },
          update: (values: Record<string, unknown>) => ({
            eq: () => ({
              eq: async () => {
                updated.push({ table, values });
                return { error: updateError };
              },
            }),
          }),
        };
      }
      throw new Error(`Unexpected table in fake Supabase client: ${table}`);
    },
  };

  return { client, inserted, updated };
}

vi.mock("@/lib/supabase", () => ({
  createServerSupabaseClient: vi.fn(),
}));

import { createServerSupabaseClient } from "@/lib/supabase";
import { createMember, updateMemberStatus } from "@/app/actions/members";

function mockClient(client: unknown) {
  vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never);
}

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createMember", () => {
  it("rejects a missing required field before touching the database", async () => {
    const { client, inserted } = createFakeSupabase({});
    mockClient(client);

    const result = await createMember("gym-1", formData({ first_name: "", last_name: "Smith", email: "a@b.com" }));

    expect(result).toEqual({ error: "First name, last name, and email are required" });
    expect(inserted).toHaveLength(0);
  });

  it("rejects a malformed email before touching the database", async () => {
    const { client, inserted } = createFakeSupabase({});
    mockClient(client);

    const result = await createMember(
      "gym-1",
      formData({ first_name: "Jo", last_name: "Smith", email: "not-an-email" })
    );

    expect(result).toEqual({ error: "Enter a valid email address" });
    expect(inserted).toHaveLength(0);
  });

  it("rejects a plan_id that belongs to a different gym", async () => {
    const { client, inserted } = createFakeSupabase({
      existingPlans: [{ id: "plan-1", gym_id: "some-other-gym" }],
    });
    mockClient(client);

    const result = await createMember(
      "gym-1",
      formData({ first_name: "Jo", last_name: "Smith", email: "jo@example.com", plan_id: "plan-1" })
    );

    expect(result).toEqual({ error: "Invalid plan selected" });
    expect(inserted).toHaveLength(0);
  });

  it("accepts a plan_id that belongs to this gym and inserts the member", async () => {
    const { client, inserted } = createFakeSupabase({
      existingPlans: [{ id: "plan-1", gym_id: "gym-1" }],
    });
    mockClient(client);

    const result = await createMember(
      "gym-1",
      formData({ first_name: "Jo", last_name: "Smith", email: "jo@example.com", plan_id: "plan-1" })
    );

    expect(result).toEqual({ success: true });
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({ gym_id: "gym-1", email: "jo@example.com", plan_id: "plan-1", status: "pending" });
  });

  it("translates a duplicate-email unique violation into a friendly error", async () => {
    const { client } = createFakeSupabase({ insertError: { code: "23505", message: "duplicate key" } });
    mockClient(client);

    const result = await createMember(
      "gym-1",
      formData({ first_name: "Jo", last_name: "Smith", email: "jo@example.com" })
    );

    expect(result).toEqual({ error: "A member with this email already exists" });
  });
});

describe("updateMemberStatus", () => {
  it("pauses a member with a plain status write", async () => {
    const { client, updated } = createFakeSupabase({});
    mockClient(client);

    const result = await updateMemberStatus("mem-1", "gym-1", "paused");

    expect(result).toEqual({ success: true });
    expect(updated).toEqual([{ table: "members", values: { status: "paused" } }]);
  });

  it("surfaces a Supabase error instead of claiming success", async () => {
    const { client } = createFakeSupabase({ updateError: { message: "connection reset" } });
    mockClient(client);

    const result = await updateMemberStatus("mem-1", "gym-1", "active");

    expect(result).toEqual({ error: "connection reset" });
  });
});
