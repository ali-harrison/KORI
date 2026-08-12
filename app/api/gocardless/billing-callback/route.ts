import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { getGoCardlessGymClient, fulfilBillingRequest, createGoCardlessSubscription } from "@/lib/gocardless";
import type { SubscriptionIntervalUnit } from "gocardless-nodejs/types/Types";

// GoCardless redirects the member's (or admin's) browser here after the
// hosted Billing Request Flow completes, appending outcome=success|failure|
// timeout and id=<billing_request_flow_id>. member_id and billing_request_id
// come from the redirect_uri we supplied when creating the flow, in
// app/actions/gocardless.ts.
//
// GoCardless's own guidance is not to treat this redirect as proof of the
// final money-movement outcome — that's what the webhook (next) is for. What
// this route DOES do authoritatively is call fulfil(), a real API call that
// reflects GoCardless's server-side state at this moment, and persist
// whatever it returns. Whether the mandate goes on to clear with the bank,
// and whether a paid-in-full payment actually settles, is confirmed
// asynchronously by the webhook.
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const { searchParams } = request.nextUrl;
  const memberId = searchParams.get("member_id");
  const billingRequestId = searchParams.get("billing_request_id");
  const outcome = searchParams.get("outcome");

  if (!memberId || !billingRequestId) {
    return NextResponse.redirect(new URL("/dashboard/members?gc_error=missing_params", appUrl));
  }

  if (outcome !== "success") {
    return NextResponse.redirect(
      new URL(`/dashboard/members/${memberId}?gc_error=${encodeURIComponent(outcome ?? "unknown")}`, appUrl)
    );
  }

  // No user session can be assumed here — GoCardless may redirect the
  // member's own device, not the admin's — so this uses the service-role
  // client. member_id/billing_request_id from the URL are cross-checked
  // against the billing request's own metadata below rather than trusted
  // blindly.
  const supabase = createAdminClient();

  const { data: member } = await supabase
    .from("members")
    .select("id, gym_id, plan:plans(price, pricing_model, billing_interval, name)")
    .eq("id", memberId)
    .single();

  if (!member) {
    return NextResponse.redirect(new URL("/dashboard/members?gc_error=member_not_found", appUrl));
  }

  const { data: gym } = await supabase
    .from("gyms")
    .select("gc_access_token")
    .eq("id", member.gym_id)
    .single();

  if (!gym?.gc_access_token) {
    return NextResponse.redirect(new URL(`/dashboard/members/${memberId}?gc_error=gym_not_connected`, appUrl));
  }

  const client = getGoCardlessGymClient(gym.gc_access_token);

  let billingRequest;
  try {
    billingRequest = await fulfilBillingRequest(client, billingRequestId);
  } catch (err) {
    console.error("GoCardless fulfil error:", err);
    return NextResponse.redirect(new URL(`/dashboard/members/${memberId}?gc_error=fulfil_failed`, appUrl));
  }

  if (billingRequest.metadata?.member_id !== memberId) {
    console.error("GoCardless billing request metadata mismatch", { memberId, billingRequestId });
    return NextResponse.redirect(new URL(`/dashboard/members/${memberId}?gc_error=identity_mismatch`, appUrl));
  }

  const gcCustomerId = billingRequest.links?.customer ?? null;
  const gcMandateId = billingRequest.links?.mandate_request_mandate ?? null;

  // Save the customer + mandate immediately — fulfil() succeeded, so this is
  // real GoCardless state regardless of what happens with the subscription
  // step below.
  const { error: updateError } = await supabase
    .from("members")
    .update({ gc_customer_id: gcCustomerId, gc_mandate_id: gcMandateId })
    .eq("id", memberId);

  if (updateError) {
    console.error("Failed to store GoCardless customer/mandate:", updateError);
    return NextResponse.redirect(new URL(`/dashboard/members/${memberId}?gc_error=save_failed`, appUrl));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plan = member.plan as any;

  // Weekly (recurring) plans: set up ongoing billing now that the mandate
  // exists. Paid-in-full plans already collected their one-off payment as
  // part of this same billing request (payment_request) — nothing further.
  if (plan?.pricing_model === "recurring" && gcMandateId) {
    try {
      const amountMinorUnits = String(Math.round(plan.price * 100));
      const intervalUnit = (
        plan.billing_interval === "annual" ? "yearly" : plan.billing_interval
      ) as SubscriptionIntervalUnit;

      const subscription = await createGoCardlessSubscription(client, {
        mandateId: gcMandateId,
        amountMinorUnits,
        intervalUnit,
        name: plan.name,
      });

      // GoCardless returns the subscription's own schedule — use it rather
      // than computing a date ourselves, so this stays correct even if GC's
      // collection-day logic doesn't match a naive "+7 days" assumption.
      const nextBillingDate = subscription.upcoming_payments?.[0]?.charge_date ?? null;

      await supabase
        .from("members")
        .update({ gc_subscription_id: subscription.id ?? null, next_billing_date: nextBillingDate })
        .eq("id", memberId);
    } catch (err) {
      console.error("GoCardless subscription creation failed:", err);
      // The mandate is real and already saved above — only the subscription
      // step failed, so say so specifically rather than implying the whole
      // setup was lost.
      return NextResponse.redirect(
        new URL(`/dashboard/members/${memberId}?gc_error=subscription_failed`, appUrl)
      );
    }
  }

  return NextResponse.redirect(new URL(`/dashboard/members/${memberId}?gc_connected=1`, appUrl));
}
