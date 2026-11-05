import { describe, it, expect, vi, beforeEach } from "vitest";

// Same approach as app/actions/members.test.ts — see that file's header.

const authedUser = { id: "owner-1" };

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("UNEXPECTED_REDIRECT");
  }),
}));
vi.mock("@/lib/supabase", () => ({
  createServerSupabaseClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase";
import { createGym, updateGym } from "@/app/actions/gym";

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

// createGym needs both the admin client (existing-gym count check) and the
// RLS-scoped client (slug lookup + the actual insert) — separate fakes,
// same as the two real clients the action itself uses.
function setupCreateGym(opts: {
  gymCount?: number;
  existingSlug?: boolean;
  insertError?: { code?: string; message: string } | null;
}) {
  const { gymCount = 0, existingSlug = false, insertError = null } = opts;
  const inserted: Array<Record<string, unknown>> = [];

  vi.mocked(createAdminClient).mockReturnValue({
    from: (table: string) => {
      if (table !== "gyms") throw new Error(`Unexpected admin-client table: ${table}`);
      return { select: () => Promise.resolve({ count: gymCount }) };
    },
  } as never);

  const serverClient = {
    auth: { getUser: async () => ({ data: { user: authedUser } }) },
    from: (table: string) => {
      if (table !== "gyms") throw new Error(`Unexpected server-client table: ${table}`);
      return {
        select: () => ({
          eq: () => ({
            single: async () => (existingSlug ? { data: { id: "existing-gym" } } : { data: null }),
          }),
        }),
        insert: (values: Record<string, unknown>) => {
          inserted.push(values);
          return Promise.resolve({ error: insertError });
        },
      };
    },
  };
  vi.mocked(createServerSupabaseClient).mockResolvedValue(serverClient as never);

  return { inserted };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createGym", () => {
  it("refuses when a gym already exists, without attempting an insert", async () => {
    const { inserted } = setupCreateGym({ gymCount: 1 });
    const result = await createGym(formData({ name: "Southerly Strength" }));
    expect(result).toEqual({ error: "This pilot is configured for a single gym. Contact the admin if you need access." });
    expect(inserted).toHaveLength(0);
  });

  it("rejects a blank name", async () => {
    const { inserted } = setupCreateGym({ gymCount: 0 });
    const result = await createGym(formData({ name: "  " }));
    expect(result).toEqual({ error: "Gym name is required" });
    expect(inserted).toHaveLength(0);
  });

  it("appends a random suffix when the slug already exists", async () => {
    const { inserted } = setupCreateGym({ gymCount: 0, existingSlug: true });
    await expect(createGym(formData({ name: "Southerly Strength" }))).rejects.toThrow("UNEXPECTED_REDIRECT");
    expect(inserted).toHaveLength(1);
    expect(inserted[0].slug).toMatch(/^southerly-strength-[a-z0-9]{4}$/);
  });

  it("inserts cleanly and redirects to the dashboard on success", async () => {
    const { inserted } = setupCreateGym({ gymCount: 0 });
    await expect(
      createGym(formData({ name: "Southerly Strength", address: "12 Harbour Road, Southport", phone: "+64 21 555 0100" }))
    ).rejects.toThrow("UNEXPECTED_REDIRECT");
    expect(inserted).toEqual([
      {
        owner_id: "owner-1",
        name: "Southerly Strength",
        slug: "southerly-strength",
        address: "12 Harbour Road, Southport",
        phone: "+64 21 555 0100",
        email: null,
      },
    ]);
  });

  // Locks in the 20240011_gyms_singleton.sql fix: a second concurrent
  // createGym call that slips past the count-check race now hits the DB's
  // unique index and gets a 23505 — this must surface as the same friendly
  // "single gym" message, not a raw Postgres error.
  it("treats a 23505 from the new singleton index the same as the count check catching it", async () => {
    const { inserted } = setupCreateGym({ gymCount: 0, insertError: { code: "23505", message: "duplicate key value violates unique constraint" } });
    const result = await createGym(formData({ name: "Southerly Strength" }));
    expect(result).toEqual({ error: "This pilot is configured for a single gym. Contact the admin if you need access." });
    expect(inserted).toHaveLength(1); // the insert was attempted — this is what makes it a race, not a pre-check catch
  });
});

describe("updateGym", () => {
  it("rejects a blank gym name rather than saving an empty one", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: authedUser } }) },
    } as never);

    const result = await updateGym("gym-1", formData({ name: "   " }));

    expect(result).toEqual({ error: "Gym name is required" });
  });

  it("trims fields and nulls out blanks", async () => {
    const updates: Array<Record<string, unknown>> = [];
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: authedUser } }) },
      from: () => ({
        update: (values: Record<string, unknown>) => ({
          eq: () => ({
            eq: async () => {
              updates.push(values);
              return { error: null };
            },
          }),
        }),
      }),
    } as never);

    const result = await updateGym(
      "gym-1",
      formData({ name: "  Southerly Strength  ", address: "  ", phone: "+64 21 555 0100", email: "", logo_url: "" })
    );

    expect(result).toEqual({ success: true });
    expect(updates).toEqual([
      { name: "Southerly Strength", address: null, phone: "+64 21 555 0100", email: null, logo_url: null },
    ]);
  });
});
