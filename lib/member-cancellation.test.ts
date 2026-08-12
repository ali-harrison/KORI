import { describe, it, expect, vi } from "vitest";
import { ApiError } from "gocardless-nodejs/errors";
import { cancelMemberBilling } from "@/lib/member-cancellation";
import type { MembersClient, CancellableMember } from "@/lib/member-cancellation";
import type { GoCardlessClient } from "gocardless-nodejs";

// Minimal fake of the one Supabase query shape cancelMemberBilling
// actually uses (members.update().eq().eq()) — mirrors the fake in
// lib/gocardless-webhook.test.ts.
function createFakeSupabase() {
  const updates: Array<Record<string, unknown>> = [];

  const client = {
    from(table: string) {
      if (table !== "members") throw new Error(`Unexpected table in fake Supabase client: ${table}`);
      return {
        update: (values: Record<string, unknown>) => ({
          eq: (_col1: string, _val1: string) => ({
            eq: async (_col2: string, _val2: string) => {
              updates.push(values);
              return { data: null, error: null };
            },
          }),
        }),
      };
    },
  };

  return { client: client as unknown as MembersClient, updates };
}

function createFakeGcClient(opts: {
  subscriptionCancel?: () => Promise<unknown>;
  mandateCancel?: () => Promise<unknown>;
}) {
  return {
    subscriptions: { cancel: vi.fn(opts.subscriptionCancel ?? (async () => ({}))) },
    mandates: { cancel: vi.fn(opts.mandateCancel ?? (async () => ({}))) },
  } as unknown as GoCardlessClient;
}

// Real ApiError instance shaped like GoCardless's 422 "can't cancel,
// already in a terminal state" response — the same class
// isAlreadyCancelledOrMissing checks against.
function invalidStateError(message: string) {
  return new ApiError({
    body: {
      error: {
        message,
        errors: [],
        type: "invalid_state",
        request_id: "req_1",
        code: 422,
      },
    },
  });
}

const member: CancellableMember = { id: "mem-1", gc_mandate_id: "MD1", gc_subscription_id: "SB1" };

describe("cancelMemberBilling", () => {
  it("a successful cancel writes cancellation_requested_at, never a terminal status", async () => {
    const { client, updates } = createFakeSupabase();
    const gcClient = createFakeGcClient({});

    const result = await cancelMemberBilling(member, "gym-1", client, gcClient);

    expect(result).toEqual({ ok: true });
    expect(gcClient.subscriptions.cancel).toHaveBeenCalledWith("SB1", {});
    expect(gcClient.mandates.cancel).toHaveBeenCalledWith("MD1", {});

    // Exactly one local write, and it's the in-flight marker — never the
    // webhook's terminal status. The local action initiates, the webhook
    // confirms (see lib/member-cancellation.ts's header comment).
    expect(updates).toHaveLength(1);
    expect(updates[0]).toHaveProperty("cancellation_requested_at");
    expect(updates[0]).not.toHaveProperty("status");
  });

  it("a hard GoCardless failure writes nothing locally", async () => {
    const { client, updates } = createFakeSupabase();
    const gcClient = createFakeGcClient({
      mandateCancel: async () => {
        throw new Error("ECONNRESET");
      },
    });

    const result = await cancelMemberBilling(member, "gym-1", client, gcClient);

    expect(result.ok).toBe(false);
    // The opposite bug is the one to guard against here: a hard failure
    // must never leave the UI claiming a cancellation happened.
    expect(updates).toHaveLength(0);
  });

  it("GoCardless reporting the mandate already cancelled is treated as success", async () => {
    const { client, updates } = createFakeSupabase();
    const gcClient = createFakeGcClient({
      mandateCancel: async () => {
        throw invalidStateError("Mandate is already cancelled");
      },
    });

    const result = await cancelMemberBilling(member, "gym-1", client, gcClient);

    expect(result).toEqual({ ok: true });
    expect(updates).toHaveLength(1);
    expect(updates[0]).toHaveProperty("cancellation_requested_at");
  });

  it("a member with no mandate on file cancels locally with no GoCardless call", async () => {
    const { client, updates } = createFakeSupabase();
    const gcClient = createFakeGcClient({});
    const cashMember: CancellableMember = { id: "mem-2", gc_mandate_id: null, gc_subscription_id: null };

    const result = await cancelMemberBilling(cashMember, "gym-1", client, gcClient);

    expect(result).toEqual({ ok: true });
    expect(gcClient.subscriptions.cancel).not.toHaveBeenCalled();
    expect(gcClient.mandates.cancel).not.toHaveBeenCalled();
    expect(updates).toEqual([{ status: "cancelled" }]);
  });
});
