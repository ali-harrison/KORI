import { describe, it, expect, vi, beforeEach } from "vitest";

// Wiring test for app/actions/members.ts:cancelMember — the actual
// cancel-then-confirm GoCardless logic lives in, and is already fully
// tested by, lib/member-cancellation.test.ts. This file only checks that
// cancelMember assembles the right inputs for it: picks a gcClient only
// when the member actually has a mandate AND the gym is GoCardless-
// connected, looks the member up scoped to gymId, and passes through
// cancelMemberBilling's result rather than reinterpreting it.

const authedUser = { id: "owner-1" };

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("UNEXPECTED_REDIRECT");
  }),
}));
vi.mock("@/lib/supabase", () => ({ createServerSupabaseClient: vi.fn() }));

vi.mock("@/lib/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/queries")>();
  return { ...actual, getGym: vi.fn(), getMember: vi.fn() };
});

vi.mock("@/lib/gocardless", () => ({ getGoCardlessGymClient: vi.fn(() => "fake-gc-client") }));

vi.mock("@/lib/member-cancellation", () => ({ cancelMemberBilling: vi.fn() }));

import { createServerSupabaseClient } from "@/lib/supabase";
import { getGym, getMember } from "@/lib/queries";
import { getGoCardlessGymClient } from "@/lib/gocardless";
import { cancelMemberBilling } from "@/lib/member-cancellation";
import { cancelMember } from "@/app/actions/members";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createServerSupabaseClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: authedUser } }) },
  } as never);
});

describe("cancelMember", () => {
  it("returns an error and never calls GoCardless when the member isn't found", async () => {
    vi.mocked(getGym).mockResolvedValue({ id: "gym-1", gc_access_token: "tok" } as never);
    vi.mocked(getMember).mockResolvedValue(null);

    const result = await cancelMember("mem-1", "gym-1");

    expect(result).toEqual({ error: "Member not found" });
    expect(cancelMemberBilling).not.toHaveBeenCalled();
  });

  it("passes gcClient=null for a cash member with no mandate, even if the gym is connected", async () => {
    vi.mocked(getGym).mockResolvedValue({ id: "gym-1", gc_access_token: "tok" } as never);
    vi.mocked(getMember).mockResolvedValue({ id: "mem-1", gc_mandate_id: null } as never);
    vi.mocked(cancelMemberBilling).mockResolvedValue({ ok: true });

    await cancelMember("mem-1", "gym-1");

    expect(getGoCardlessGymClient).not.toHaveBeenCalled();
    expect(cancelMemberBilling).toHaveBeenCalledWith(expect.objectContaining({ id: "mem-1" }), "gym-1", expect.anything(), null);
  });

  it("passes gcClient=null when the member has a mandate but the gym was never connected", async () => {
    vi.mocked(getGym).mockResolvedValue({ id: "gym-1", gc_access_token: null } as never);
    vi.mocked(getMember).mockResolvedValue({ id: "mem-1", gc_mandate_id: "MD1" } as never);
    vi.mocked(cancelMemberBilling).mockResolvedValue({ ok: true });

    await cancelMember("mem-1", "gym-1");

    expect(getGoCardlessGymClient).not.toHaveBeenCalled();
    expect(cancelMemberBilling).toHaveBeenCalledWith(expect.anything(), "gym-1", expect.anything(), null);
  });

  it("builds a real gcClient when the member has a mandate and the gym is connected", async () => {
    vi.mocked(getGym).mockResolvedValue({ id: "gym-1", gc_access_token: "tok" } as never);
    vi.mocked(getMember).mockResolvedValue({ id: "mem-1", gc_mandate_id: "MD1" } as never);
    vi.mocked(cancelMemberBilling).mockResolvedValue({ ok: true });

    await cancelMember("mem-1", "gym-1");

    expect(getGoCardlessGymClient).toHaveBeenCalledWith("tok");
    expect(cancelMemberBilling).toHaveBeenCalledWith(expect.anything(), "gym-1", expect.anything(), "fake-gc-client");
  });

  it("passes through a cancelMemberBilling failure rather than claiming success", async () => {
    vi.mocked(getGym).mockResolvedValue({ id: "gym-1", gc_access_token: "tok" } as never);
    vi.mocked(getMember).mockResolvedValue({ id: "mem-1", gc_mandate_id: "MD1" } as never);
    vi.mocked(cancelMemberBilling).mockResolvedValue({ ok: false, error: "GoCardless is unreachable" });

    const result = await cancelMember("mem-1", "gym-1");

    expect(result).toEqual({ error: "GoCardless is unreachable" });
  });
});
