import { NextRequest, NextResponse } from "next/server";
import { parse } from "gocardless-nodejs/webhooks";
import { createAdminClient } from "@/lib/supabase";
import { getGoCardlessGymClient } from "@/lib/gocardless";
import { handleGoCardlessEvent } from "@/lib/gocardless-webhook";
import type { Event } from "gocardless-nodejs/types/Types";

// Fail closed: if this is ever unset, every request 500s before we look at
// the body or signature — we never fall through to processing unverified.
const webhookSecret = process.env.GOCARDLESS_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    console.error("GOCARDLESS_WEBHOOK_SECRET is not set — refusing to process GoCardless webhooks");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signatureHeader = request.headers.get("Webhook-Signature");
  // .text() first, always — .json() would re-serialise and change the exact
  // bytes the HMAC was computed over, breaking verification.
  const rawBody = await request.text();

  if (!signatureHeader) {
    return new NextResponse(null, { status: 401 });
  }

  let events: Event[];
  try {
    // gocardless-nodejs's own verifySignature does HMAC-SHA256 of the raw
    // body against GOCARDLESS_WEBHOOK_SECRET and compares with
    // crypto.timingSafeEqual — exactly what's needed here, so this uses
    // that rather than reimplementing it. parse() verifies first and only
    // JSON.parses the body once verification has passed.
    events = parse(rawBody, webhookSecret, signatureHeader);
  } catch (err) {
    console.error("GoCardless webhook signature verification failed:", err);
    return new NextResponse(null, { status: 498 });
  }

  const supabase = createAdminClient();

  // Single-tenant pilot: exactly one gym exists, so its access token is
  // what we use for any GoCardless API calls needed to resolve an event
  // (e.g. fetching a payment to find which mandate — and therefore which
  // member — it belongs to). Revisit this lookup if this ever needs to
  // support more than one gym.
  const { data: gym } = await supabase
    .from("gyms")
    .select("gc_access_token")
    .not("gc_access_token", "is", null)
    .limit(1)
    .maybeSingle();

  const gcClient = gym?.gc_access_token ? getGoCardlessGymClient(gym.gc_access_token) : null;

  // A webhook body carries many events in one batch. One bad event must not
  // abort the rest — catch per-event, log, keep going — and we return 200
  // once the whole batch has been handled (successfully or logged-and-
  // skipped) so GoCardless doesn't redeliver the batch.
  for (const event of events ?? []) {
    try {
      await handleGoCardlessEvent(event, supabase, gcClient);
    } catch (err) {
      console.error("Error handling GoCardless event", {
        id: event?.id,
        resource_type: event?.resource_type,
        action: event?.action,
      }, err);
    }
  }

  return NextResponse.json({ received: true });
}
