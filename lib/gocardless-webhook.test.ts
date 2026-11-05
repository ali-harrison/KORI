import { describe, it, expect, vi } from "vitest";
import { handleGoCardlessEvent } from "@/lib/gocardless-webhook";
import type { GoCardlessClient } from "gocardless-nodejs";
import type { Event } from "gocardless-nodejs/types/Types";
import type { AdminClient } from "@/lib/gocardless-webhook";

// Minimal fake of the two Supabase admin-client query shapes
// handlePaymentEvent actually uses — not a general-purpose mock, just
// enough surface to exercise the real idempotency logic end to end,
// including real ON CONFLICT (gc_event_id) DO NOTHING semantics.
function createFakeSupabase() {
  const payments: Array<Record<string, unknown>> = [];
  const memberStatusUpdates: Array<{ id: string; status: string }> = [];

  const member = { id: "mem-1", gym_id: "gym-1", plan_id: "plan-1" };

  const client = {
    from(table: string) {
      if (table === "members") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: member, error: null }),
            }),
          }),
          update: (values: { status: string }) => ({
            eq: async (_col: string, id: string) => {
              memberStatusUpdates.push({ id, status: values.status });
              return { data: null, error: null };
            },
          }),
        };
      }

      if (table === "payments") {
        return {
          upsert: (
            row: Record<string, unknown>,
            options: { onConflict: string; ignoreDuplicates: boolean }
          ) => ({
            select: async () => {
              const alreadyExists = payments.some((p) => p.gc_event_id === row.gc_event_id);
              if (alreadyExists && options.ignoreDuplicates) {
                // Real Postgres behaviour: ON CONFLICT DO NOTHING never
                // RETURNs the skipped row.
                return { data: [], error: null };
              }
              const inserted = { id: `pay-${payments.length + 1}`, ...row };
              payments.push(inserted);
              return { data: [{ id: inserted.id }], error: null };
            },
          }),
        };
      }

      throw new Error(`Unexpected table in fake Supabase client: ${table}`);
    },
  };

  return { client: client as unknown as AdminClient, payments, memberStatusUpdates };
}

function createFakeGcClient(payment: Record<string, unknown>) {
  return {
    payments: { find: vi.fn(async () => payment) },
  } as unknown as GoCardlessClient;
}

describe("handleGoCardlessEvent — payments.confirmed idempotency", () => {
  it("redelivering the same event inserts exactly one payments row and applies the status flip only once", async () => {
    const { client, payments, memberStatusUpdates } = createFakeSupabase();

    const gcPayment = {
      id: "PM123",
      amount: "1500",
      currency: "NZD",
      charge_date: "2026-06-13",
      links: { mandate: "MD123" },
    };
    const gcClient = createFakeGcClient(gcPayment);

    const event = {
      id: "EV123",
      resource_type: "payments",
      action: "confirmed",
      links: { payment: "PM123" },
      created_at: "2026-06-13T09:00:00Z",
    } as Event;

    // Deliver the same event twice, as GoCardless can on redelivery.
    await handleGoCardlessEvent(event, client, gcClient);
    await handleGoCardlessEvent(event, client, gcClient);

    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({
      gc_event_id: "EV123",
      status: "succeeded",
      amount: 15,
      provider: "gocardless",
      provider_payment_id: "PM123",
    });

    // The member status update rides along with the insert — it must not
    // re-apply on the no-op redelivery.
    expect(memberStatusUpdates).toEqual([{ id: "mem-1", status: "active" }]);
  });
});

// Minimal fake of the "members" table shape handleMandateCancelled uses —
// captures what gets passed to .update() so the test can assert on the
// exact payload rather than just "it didn't throw". The handler tries an
// update scoped to .not("cancellation_requested_at", "is", null) first, then
// an unscoped one, so the two id lists model which update matches anyone.
function createFakeSupabaseForMandateCancel(opts: { requestedByGym?: string[]; unprompted?: string[] }) {
  const { requestedByGym = [], unprompted = [] } = opts;
  const updates: Array<Record<string, unknown>> = [];

  const respond = (values: Record<string, unknown>, ids: string[]) => async () => {
    updates.push(values);
    return { data: ids.map((id) => ({ id })), error: null };
  };

  const client = {
    from(table: string) {
      if (table !== "members") throw new Error(`Unexpected table: ${table}`);
      return {
        update: (values: Record<string, unknown>) => ({
          eq: (_col: string, _value: string) => ({
            not: () => ({ select: respond(values, requestedByGym) }),
            select: respond(values, unprompted),
          }),
        }),
      };
    },
  };

  return { client: client as unknown as AdminClient, updates };
}

describe("handleGoCardlessEvent — mandates.cancelled", () => {
  it("finishes a cancellation the gym asked for: the member ends up cancelled, not paused", async () => {
    const { client, updates } = createFakeSupabaseForMandateCancel({ requestedByGym: ["mem-1"] });

    const event = {
      id: "EV998",
      resource_type: "mandates",
      action: "cancelled",
      links: { mandate: "MD123" },
    } as Event;

    await handleGoCardlessEvent(event, client, null);

    expect(updates).toEqual([
      {
        gc_mandate_id: null,
        gc_subscription_id: null,
        status: "cancelled",
        cancellation_requested_at: null,
      },
    ]);
  });

  it("pauses a member whose mandate died on its own, clearing all three fields together", async () => {
    const { client, updates } = createFakeSupabaseForMandateCancel({ unprompted: ["mem-1"] });

    const event = {
      id: "EV999",
      resource_type: "mandates",
      action: "cancelled",
      links: { mandate: "MD123" },
    } as Event;

    await handleGoCardlessEvent(event, client, null);

    // cancellation_requested_at must be cleared here, not just gc_mandate_id/
    // gc_subscription_id/status — otherwise a member who later gets a brand
    // new mandate would still read as "cancelling" forever, since
    // getMandateBadgeState checks this field ahead of gc_mandate_id.
    expect(updates.at(-1)).toEqual({
      gc_mandate_id: null,
      gc_subscription_id: null,
      status: "paused",
      cancellation_requested_at: null,
    });
  });

  it("no-ops cleanly when no member currently holds the cancelled mandate", async () => {
    const { client, updates } = createFakeSupabaseForMandateCancel({});

    const event = {
      id: "EV1000",
      resource_type: "mandates",
      action: "cancelled",
      links: { mandate: "MD_STALE" },
    } as Event;

    await expect(handleGoCardlessEvent(event, client, null)).resolves.toBeUndefined();
    expect(updates).toHaveLength(2); // both scoped updates tried, neither matched anyone
  });
});
