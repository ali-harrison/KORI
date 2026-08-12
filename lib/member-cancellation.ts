import { ApiError } from "gocardless-nodejs/errors";
import type { GoCardlessClient } from "gocardless-nodejs";
import { cancelGoCardlessSubscription, cancelGoCardlessMandate } from "@/lib/gocardless";
import type { createServerSupabaseClient } from "@/lib/supabase";

// No Next.js imports here on purpose — same reasoning as
// lib/gocardless-webhook.ts: framework-free so this is directly unit
// testable, with app/actions/members.ts as the thin wrapper that resolves
// the real Supabase/GoCardless clients and calls in.
//
// SOURCE OF TRUTH: GoCardless webhooks remain the only writer of terminal
// mandate/subscription state. This function only ever INITIATES a
// cancellation at GoCardless and, on success, marks cancellation_requested_at
// so the UI can show a transitional "Cancelling" state — it never writes
// members.status = 'cancelled' itself for a direct-debit member. The
// existing mandates.cancelled webhook (handleMandateCancelled in
// lib/gocardless-webhook.ts) is what flips status to its terminal paused/
// null-mandate shape once GoCardless actually confirms it.

export type MembersClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

export interface CancellableMember {
  id: string;
  gc_mandate_id: string | null;
  gc_subscription_id: string | null;
}

export type CancelMemberBillingResult = { ok: true } | { ok: false; error: string };

// GoCardless returns a 422 "invalid_state" error when a cancel call targets
// a mandate/subscription that isn't in a cancellable state — for a cancel
// action that overwhelmingly means "already cancelled". A 404 means the id
// no longer exists at GC at all. Both leave the desired end state (nothing
// to collect against) already true, so both are treated as success-
// equivalent here. NOT verified against a live GoCardless sandbox response
// for this specific action — same caveat already flagged in
// lib/gocardless-webhook.ts for payments-event payload shape. Anything else
// (network error, 5xx, rate limit, auth failure, a genuinely-still-active
// resource that just failed to cancel) falls through as a hard failure.
function isAlreadyCancelledOrMissing(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  if (err.errorType === "invalid_state") return true;
  if (Number(err.code) === 404) return true;
  return false;
}

type StepOutcome = { ok: true; alreadyDone: boolean } | { ok: false; err: unknown };

async function cancelStep(fn: () => Promise<unknown>): Promise<StepOutcome> {
  try {
    await fn();
    return { ok: true, alreadyDone: false };
  } catch (err) {
    if (isAlreadyCancelledOrMissing(err)) {
      return { ok: true, alreadyDone: true };
    }
    return { ok: false, err };
  }
}

// Cancels a member's future billing and collection authority at
// GoCardless, then marks the cancellation as requested locally. Ordering
// is deliberate and explicit (see the task this shipped under): the
// subscription (future scheduled payments) is cancelled before the
// mandate (authority to collect at all), because a member can still be
// charged one-off against a live mandate even with no subscription
// running. If the subscription-cancel step itself hard-fails, the mandate
// step is not attempted — this is a strict sequence, not two independent
// attempts, so a failure partway through never leaves us guessing which
// half succeeded beyond the one explicit partial-state case below.
export async function cancelMemberBilling(
  member: CancellableMember,
  gymId: string,
  supabase: MembersClient,
  gcClient: GoCardlessClient | null
): Promise<CancelMemberBillingResult> {
  // No mandate on file at all (cash/manual payer, or a plan never billed)
  // — nothing to cancel at GoCardless, so there's no async confirmation to
  // wait for. Safe to cancel locally right away.
  if (!member.gc_mandate_id) {
    const { error } = await supabase
      .from("members")
      .update({ status: "cancelled" })
      .eq("id", member.id)
      .eq("gym_id", gymId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  if (!gcClient) {
    return { ok: false, error: "Connect GoCardless in Settings before cancelling a direct-debit member." };
  }

  if (member.gc_subscription_id) {
    const subscriptionOutcome = await cancelStep(() =>
      cancelGoCardlessSubscription(gcClient, member.gc_subscription_id!)
    );
    if (!subscriptionOutcome.ok) {
      console.error(
        `Failed to cancel GoCardless subscription ${member.gc_subscription_id} for member ${member.id} — no local state changed`,
        subscriptionOutcome.err
      );
      return {
        ok: false,
        error: "Failed to cancel the GoCardless subscription. Nothing was changed — try again.",
      };
    }
    console.log(
      `Cancelled GoCardless subscription ${member.gc_subscription_id} for member ${member.id}` +
        (subscriptionOutcome.alreadyDone ? " (already cancelled at GoCardless)" : "")
    );
  }

  const mandateOutcome = await cancelStep(() => cancelGoCardlessMandate(gcClient, member.gc_mandate_id!));
  if (!mandateOutcome.ok) {
    // Loud on purpose: if the subscription cancel above succeeded but this
    // failed, GoCardless is now in a partial state — subscription dead,
    // mandate still live and still capable of being charged one-off. Do
    // NOT write cancellation_requested_at; the badge keeps showing
    // whatever it showed before, which is still true of the mandate. This
    // needs a human to look at it (retry, or cancel the mandate manually
    // in the GoCardless dashboard) — see the reconciliation-job TODO below.
    console.error(
      `PARTIAL CANCELLATION STATE: GoCardless mandate ${member.gc_mandate_id} cancel failed for member ${member.id} after its subscription was already cancelled. The mandate is still live and this member can still be charged. Needs manual follow-up.`,
      mandateOutcome.err
    );
    return {
      ok: false,
      error:
        "The subscription was cancelled but cancelling the direct-debit mandate failed. The member can still be charged — please retry or contact support.",
    };
  }
  console.log(
    `Cancelled GoCardless mandate ${member.gc_mandate_id} for member ${member.id}` +
      (mandateOutcome.alreadyDone ? " (already cancelled at GoCardless)" : "")
  );

  // TODO(reconciliation): this marks the request as in flight and stops.
  // If the confirming mandates.cancelled webhook is ever missed (GC outage,
  // delivery failure, etc.) this member is stuck showing "Cancelling"
  // forever with no local self-correction. A manual "sync from GoCardless"
  // action or periodic reconcile job is the proper backstop for that class
  // of drift — out of scope here, this is just the hook where it would
  // read cancellation_requested_at and re-check the mandate's real status.
  const { error } = await supabase
    .from("members")
    .update({ cancellation_requested_at: new Date().toISOString() })
    .eq("id", member.id)
    .eq("gym_id", gymId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
