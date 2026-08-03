import Stripe from "stripe";

// Lazily instantiated — avoids throwing at build time when STRIPE_SECRET_KEY is unset
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-03-25.dahlia",
      typescript: true,
    });
  }
  return _stripe;
}

// Keep a named export for direct use in server code (never called at module level)
export const stripe = {
  get instance() {
    return getStripe();
  },
};

// ── Create a Stripe Connect account for a gym ────────────────────────────────
export async function createConnectAccount(email: string, gymName: string) {
  const account = await getStripe().accounts.create({
    type: "express",
    email,
    business_type: "individual",
    business_profile: { name: gymName },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
  return account;
}

// ── Generate an onboarding link for a Connect account ───────────────────────
export async function createAccountLink(accountId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  const link = await getStripe().accountLinks.create({
    account: accountId,
    refresh_url: `${baseUrl}/dashboard/settings?stripe=refresh`,
    return_url: `${baseUrl}/dashboard/settings?stripe=success`,
    type: "account_onboarding",
  });
  return link;
}

// ── Create a customer for a member ──────────────────────────────────────────
export async function createCustomer(
  email: string,
  name: string,
  connectedAccountId: string
) {
  const customer = await getStripe().customers.create(
    { email, name },
    { stripeAccount: connectedAccountId }
  );
  return customer;
}

// ── Create a subscription for a member ──────────────────────────────────────
export async function createSubscription(
  customerId: string,
  priceId: string,
  connectedAccountId: string,
  applicationFeePercent = 5
) {
  const subscription = await getStripe().subscriptions.create(
    {
      customer: customerId,
      items: [{ price: priceId }],
      application_fee_percent: applicationFeePercent,
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
    },
    { stripeAccount: connectedAccountId }
  );
  return subscription;
}

// ── Construct and verify a webhook event ─────────────────────────────────────
export function constructWebhookEvent(payload: string, signature: string) {
  return getStripe().webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}
