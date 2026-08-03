"use server";

import { createServerSupabaseClient } from "@/lib/supabase";
import { getGym, getMember } from "@/lib/queries";
import { getGoCardlessGymClient, createBillingRequest, createBillingRequestFlow } from "@/lib/gocardless";
import { redirect } from "next/navigation";

// Starts the GoCardless Billing Request Flow for a member: creates the
// billing request (mandate_request always; payment_request too for
// paid-in-full plans, so the lump sum is collected in the same flow) and its
// hosted flow, then redirects the browser to GoCardless's hosted page. On
// completion GoCardless redirects to app/api/gocardless/billing-callback,
// which fulfils the billing request and stores the resulting identifiers.
export async function startBillingForMember(memberId: string): Promise<{ error: string }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const gym = await getGym();
  if (!gym.gc_access_token || !gym.gc_organisation_id) {
    return { error: "Connect GoCardless in Settings before setting up direct debit." };
  }

  const member = await getMember(memberId, gym.id);
  if (!member) return { error: "Member not found" };
  const plan = member.plan;
  if (!plan) return { error: "Assign a plan to this member before setting up billing" };

  const client = getGoCardlessGymClient(gym.gc_access_token);
  const amountMinorUnits = String(Math.round(plan.price * 100));

  const oneOffPayment =
    plan.pricing_model === "paid_in_full"
      ? { amountMinorUnits, description: `${plan.name} — ${gym.name}` }
      : null;

  let billingRequest;
  try {
    billingRequest = await createBillingRequest(client, {
      memberId: member.id,
      existingCustomerId: member.gc_customer_id,
      oneOffPayment,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create GoCardless billing request" };
  }

  const redirectUri =
    `${process.env.NEXT_PUBLIC_APP_URL}/api/gocardless/billing-callback` +
    `?member_id=${encodeURIComponent(member.id)}&billing_request_id=${encodeURIComponent(billingRequest.id)}`;

  let flow;
  try {
    flow = await createBillingRequestFlow(client, {
      billingRequestId: billingRequest.id,
      redirectUri,
      prefilledCustomer: {
        given_name: member.first_name,
        family_name: member.last_name,
        email: member.email,
      },
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create GoCardless billing request flow" };
  }

  if (!flow.authorisation_url) {
    return { error: "GoCardless did not return an authorisation URL" };
  }

  redirect(flow.authorisation_url);
}
