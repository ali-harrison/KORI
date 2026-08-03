import { gocardless as GoCardless, Environments, GoCardlessClient } from "gocardless-nodejs";
import type { SubscriptionIntervalUnit } from "gocardless-nodejs/types/Types";

// GOCARDLESS_ENVIRONMENT defaults to sandbox so a missing/unset env var can
// never accidentally point at live money — it must be explicitly set to
// "live" to leave sandbox.
const IS_LIVE = process.env.GOCARDLESS_ENVIRONMENT === "live";
const GC_ENVIRONMENT = IS_LIVE ? Environments.Live : Environments.Sandbox;
const GC_OAUTH_BASE = IS_LIVE ? "https://connect.gocardless.com" : "https://connect-sandbox.gocardless.com";
const GC_API_BASE = IS_LIVE ? "https://api.gocardless.com" : "https://api-sandbox.gocardless.com";

// ── Client (lazy, server-only) ────────────────────────────────────────────────

let _client: GoCardlessClient | null = null;

export function getGoCardlessClient(): GoCardlessClient {
  if (!_client) {
    _client = GoCardless(process.env.GOCARDLESS_ACCESS_TOKEN!, GC_ENVIRONMENT);
  }
  return _client;
}

// ── Per-gym client (uses gym's own access token) ──────────────────────────────

export function getGoCardlessGymClient(accessToken: string): GoCardlessClient {
  return GoCardless(accessToken, GC_ENVIRONMENT);
}

// ── OAuth helpers ─────────────────────────────────────────────────────────────

export function buildOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOCARDLESS_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/gocardless/callback`,
    response_type: "code",
    scope: "read_write",
    state,
  });
  return `${GC_OAUTH_BASE}/oauth/authorize?${params.toString()}`;
}

export async function exchangeOAuthCode(code: string): Promise<{
  access_token: string;
  organisation_id: string;
}> {
  const res = await fetch(`${GC_API_BASE}/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOCARDLESS_CLIENT_ID!,
      client_secret: process.env.GOCARDLESS_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/gocardless/callback`,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GoCardless OAuth exchange failed: ${text}`);
  }

  return res.json();
}

// ── Billing Request Flow (mandate setup, + first payment for PIF plans) ───────
//
// Uses the current Billing Request Flow API, not the deprecated redirect_flow
// service the SDK still exposes. One Billing Request always carries a
// mandate_request (Direct Debit fundamentally requires a mandate underneath
// even for a single payment — there's no mandate-less one-shot debit). A
// payment_request is added alongside it only for paid-in-full plans, so the
// lump sum gets collected in the same hosted flow as the mandate — one link,
// one session for the member, rather than mandate-setup-then-separate-charge.
//
// mandate_request.scheme is deliberately left unset — the hosted flow
// determines the correct local scheme (e.g. becs_nz) from the bank details
// the member actually enters, which is more robust than us guessing it from
// the gym's country upfront.

export async function createBillingRequest(
  client: GoCardlessClient,
  params: {
    memberId: string;
    existingCustomerId: string | null;
    oneOffPayment: { amountMinorUnits: string; description: string } | null;
  }
) {
  return client.billingRequests.create({
    mandate_request: {
      currency: "NZD",
    },
    payment_request: params.oneOffPayment
      ? {
          amount: params.oneOffPayment.amountMinorUnits,
          currency: "NZD",
          description: params.oneOffPayment.description,
        }
      : undefined,
    links: params.existingCustomerId ? { customer: params.existingCustomerId } : undefined,
    metadata: { member_id: params.memberId },
  });
}

export async function createBillingRequestFlow(
  client: GoCardlessClient,
  params: {
    billingRequestId: string;
    redirectUri: string;
    prefilledCustomer: { given_name: string; family_name: string; email: string };
  }
) {
  return client.billingRequestFlows.create({
    links: { billing_request: params.billingRequestId },
    redirect_uri: params.redirectUri,
    prefilled_customer: params.prefilledCustomer,
    lock_customer_details: true,
    // Explicit fulfil in our own callback (not auto_fulfil) — see
    // app/api/gocardless/billing-callback/route.ts for why.
    auto_fulfil: false,
  });
}

export async function fulfilBillingRequest(client: GoCardlessClient, billingRequestId: string) {
  return client.billingRequests.fulfil(billingRequestId, {});
}

export async function createGoCardlessSubscription(
  client: GoCardlessClient,
  params: {
    mandateId: string;
    amountMinorUnits: string;
    intervalUnit: SubscriptionIntervalUnit;
    name: string;
  }
) {
  return client.subscriptions.create({
    amount: params.amountMinorUnits,
    currency: "NZD",
    interval_unit: params.intervalUnit,
    interval: "1",
    name: params.name,
    links: { mandate: params.mandateId },
  });
}
