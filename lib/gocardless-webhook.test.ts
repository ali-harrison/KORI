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
