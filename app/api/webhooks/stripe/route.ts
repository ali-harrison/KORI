import { NextResponse } from "next/server";
import { constructWebhookEvent } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase";
import type Stripe from "stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(body, signature);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case "invoice.payment_succeeded": {
      // Cast to any to access subscription ID — Stripe types vary by API version
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invoice = event.data.object as any;
      const subscriptionId: string | undefined =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : (invoice.subscription as Stripe.Subscription | null)?.id;

      if (subscriptionId) {
        const periodEnd: number | undefined = invoice.lines?.data?.[0]?.period?.end;
        await supabase
          .from("members")
          .update({
            status: "active",
            next_billing_date: periodEnd
              ? new Date(periodEnd * 1000).toISOString().split("T")[0]
              : undefined,
          })
          .eq("stripe_subscription_id", subscriptionId);
      }
      break;
    }

    case "invoice.payment_failed": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invoice = event.data.object as any;
      const subscriptionId: string | undefined =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : (invoice.subscription as Stripe.Subscription | null)?.id;

      if (subscriptionId) {
        await supabase
          .from("members")
          .update({ status: "paused" })
          .eq("stripe_subscription_id", subscriptionId);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await supabase
        .from("members")
        .update({ status: "cancelled" })
        .eq("stripe_subscription_id", subscription.id);
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
