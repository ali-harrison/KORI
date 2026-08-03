import type { GoCardlessClient } from "gocardless-nodejs";
import type { Event } from "gocardless-nodejs/types/Types";
import type { createAdminClient } from "@/lib/supabase";

// No Next.js imports here on purpose — this is plain, framework-free event
// handling so it can be unit tested directly (next/server doesn't resolve
// outside Next's own runtime, which the route handler needs but this
// doesn't). app/api/webhooks/gocardless/route.ts is the thin HTTP wrapper:
// signature verification, raw body handling, per-event error isolation.

export type AdminClient = ReturnType<typeof createAdminClient>;

export async function handleGoCardlessEvent(
  event: Event,
  supabase: AdminClient,
  gcClient: GoCardlessClient | null
): Promise<void> {
  if (event.resource_type === "payments") {
    await handlePaymentEvent(event, supabase, gcClient);
    return;
  }
  if (event.resource_type === "mandates" && event.action === "cancelled") {
    await handleMandateCancelled(event, supabase);
    return;
  }
  console.log(`Ignoring GoCardless event: resource_type=${event.resource_type} action=${event.action}`, event.id);
}

async function handlePaymentEvent(
  event: Event,
  supabase: AdminClient,
  gcClient: GoCardlessClient | null
): Promise<void> {
  // paid_out is deliberately NOT treated as equivalent to confirmed. It's a
  // distinct, later event in the same payment's lifecycle (money reaching
  // the creditor's payout, days/weeks after confirmation) with its own
  // event.id. Recording it through the same gc_event_id-keyed insert as
  // confirmed would create a SECOND payments row for the same underlying
  // payment — gc_event_id dedup only protects against redelivery of the
  // *same* event, not against two different real events describing one
  // payment. Avoiding that double-count matters more than tracking payout
  // timing for this pilot, so paid_out (and every other payments action:
  // created, submitted, cancelled, customer_approval_denied, ...) is
  // logged and ignored.
  if (event.action !== "confirmed" && event.action !== "failed") {
    console.log(`Ignoring GoCardless payments event action "${event.action}"`, event.id);
    return;
  }

  const paymentId = event.links?.payment;
  if (!paymentId) {
    console.error("GoCardless payments event missing links.payment", event.id);
    return;
  }
  if (!gcClient) {
    console.error(`No GoCardless-connected gym available to resolve payment ${paymentId}`, event.id);
    return;
  }

  // A payments-resource event's links only ever carry { payment }, not the
  // mandate — verified against GoCardless's published example webhook
  // payloads, not a live sandbox event (flagged in the report). Fetching
  // the payment itself is the only way to find which mandate, and
  // therefore which member, it belongs to.
  let payment;
  try {
    payment = await gcClient.payments.find(paymentId);
  } catch (err) {
    console.error(`Failed to fetch GoCardless payment ${paymentId}`, err);
    return;
  }

  const mandateId = payment.links?.mandate;
  if (!mandateId) {
    console.error(`GoCardless payment ${paymentId} has no mandate link`, event.id);
    return;
  }

  const { data: member } = await supabase
    .from("members")
    .select("id, gym_id, plan_id")
    .eq("gc_mandate_id", mandateId)
    .maybeSingle();

  if (!member) {
    console.log(`No member found for GoCardless mandate ${mandateId} — skipping event ${event.id}`);
    return;
  }

  const status = event.action === "confirmed" ? "succeeded" : "failed";
  const amount = payment.amount ? Number(payment.amount) / 100 : 0;

  const { data: inserted, error } = await supabase
    .from("payments")
    .upsert(
      {
        gym_id: member.gym_id,
        member_id: member.id,
        plan_id: member.plan_id,
        amount,
        currency: payment.currency ?? "NZD",
        provider: "gocardless",
        provider_payment_id: paymentId,
        type: payment.links?.subscription ? "recurring" : "one_off",
        status,
        paid_at: status === "succeeded" ? payment.charge_date ?? event.created_at ?? new Date().toISOString() : null,
        gc_event_id: event.id,
      },
      { onConflict: "gc_event_id", ignoreDuplicates: true }
    )
    .select("id");

  if (error) {
    console.error("Failed to insert GoCardless payment ledger row", event.id, error);
    return;
  }

  // ignoreDuplicates means a conflicting row returns nothing from .select()
  // (Postgres never RETURNs rows skipped by ON CONFLICT DO NOTHING) — an
  // empty result here means this exact event was already processed. Skip
  // the status write too, so a stale redelivered event can never clobber a
  // member who has since recovered (e.g. a redelivered old "failed" landing
  // after the member has since paid and gone active again).
  if (!inserted || inserted.length === 0) {
    return;
  }

  await supabase
    .from("members")
    .update({ status: status === "succeeded" ? "active" : "paused" })
    .eq("id", member.id);
}

async function handleMandateCancelled(event: Event, supabase: AdminClient): Promise<void> {
  const mandateId = event.links?.mandate;
  if (!mandateId) {
    console.error("GoCardless mandates.cancelled event missing links.mandate", event.id);
    return;
  }

  // Can't collect against a cancelled mandate — clear the reference and
  // pause the member so the dashboard's "Direct debit" state stops
  // claiming a mandate that no longer exists. gc_subscription_id is
  // cleared too since a subscription can't outlive the mandate it runs
  // against. Matched on the specific mandate id (not just member id) so a
  // stale, out-of-order redelivery for a mandate this member has since
  // replaced can't clobber their current one — the WHERE simply won't
  // match once gc_mandate_id has moved on, making this naturally safe to
  // reprocess or receive out of order.
  const { data, error } = await supabase
    .from("members")
    .update({ gc_mandate_id: null, gc_subscription_id: null, status: "paused" })
    .eq("gc_mandate_id", mandateId)
    .select("id");

  if (error) {
    console.error("Failed to clear cancelled GoCardless mandate", mandateId, error);
    return;
  }

  if (!data || data.length === 0) {
    console.log(`No member currently holds cancelled GoCardless mandate ${mandateId} — skipping`, event.id);
  }
}
