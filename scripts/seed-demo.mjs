#!/usr/bin/env node
//
// DEV/DEMO ONLY. Rebrands the pilot's one gym row as Southerly Strength (idempotent)
// and wipes + reseeds its plans, members, and payments with realistic demo
// data for a click-through walkthrough. Safe to re-run any time you want a
// clean demo state — it always deletes-then-reinserts rather than upserting.
//
// Refuses to run with NODE_ENV=production (hosting platforms set this
// automatically; a plain local run never has it set, so this never gets in
// your way for its actual purpose).
//
// Run from the project root:
//   node --env-file=.env.local scripts/seed-demo.mjs

import { createClient } from "@supabase/supabase-js";

if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to run the demo seed script with NODE_ENV=production.");
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set — run with " +
      "`node --env-file=.env.local scripts/seed-demo.mjs` from the project root."
  );
}

// The pilot's owner account. Update this if that ever changes.
const OWNER_EMAIL = "owner@example.com";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function daysAgoDate(n) {
  return new Date(Date.now() - n * 86400000).toISOString().split("T")[0];
}

function daysAgoIso(n) {
  return new Date(Date.now() - n * 86400000).toISOString();
}

async function main() {
  console.log(`Seeding demo data into ${SUPABASE_URL}`);
  console.log("This DELETES all existing contracts/payments/members/plans for the pilot's gym, then inserts fresh demo data.");
  console.log("Ctrl+C now to cancel — continuing in 5 seconds...");
  await sleep(5000);

  // ── 1. Find the gym row and sanity-check ownership ──────────────────────
  const { data: gym, error: gymError } = await supabase
    .from("gyms")
    .select("id, owner_id")
    .limit(1)
    .maybeSingle();

  if (gymError) throw gymError;
  if (!gym) {
    throw new Error(
      `No gym row exists yet. Sign in once at /auth/login with ${OWNER_EMAIL} and complete ` +
        "onboarding to create it, then re-run this script."
    );
  }

  const { data: ownerData, error: ownerError } = await supabase.auth.admin.getUserById(gym.owner_id);
  if (ownerError) throw ownerError;
  if (ownerData.user?.email !== OWNER_EMAIL) {
    console.warn(
      `WARNING: the gym row (${gym.id}) is owned by ${ownerData.user?.email ?? "an unknown account"}, ` +
        `not ${OWNER_EMAIL}. Continuing anyway — double check this is the right gym before demoing it.`
    );
  } else {
    console.log(`Confirmed: gym ${gym.id} is owned by ${OWNER_EMAIL}.`);
  }

  const gymId = gym.id;

  // ── 2. Rebrand as Southerly Strength (idempotent) ────────────────────────────────
  const { error: updateGymError } = await supabase
    .from("gyms")
    .update({
      name: "Southerly Strength",
      slug: "southerly-strength",
      address: "12 Harbour Road, Southport",
      phone: "+64 21 555 0100",
      email: "hello@example.com",
    })
    .eq("id", gymId);
  if (updateGymError) throw updateGymError;
  console.log("Gym row rebranded to Southerly Strength.");

  // ── 3. Wipe existing demo data (respecting FK order) ─────────────────────
  await supabase.from("payments").delete().eq("gym_id", gymId);
  await supabase.from("contracts").delete().eq("gym_id", gymId);
  await supabase.from("members").delete().eq("gym_id", gymId);
  await supabase.from("plans").delete().eq("gym_id", gymId);
  console.log("Cleared existing plans/members/contracts/payments for this gym.");

  // ── 4. Seed plans — the three real Southerly Strength pricing shapes ─────────────
  const { data: plans, error: plansError } = await supabase
    .from("plans")
    .insert([
      {
        gym_id: gymId,
        name: "Weekly Direct Debit",
        description: "Full gym access, billed weekly",
        price: 18,
        pricing_model: "recurring",
        billing_interval: "weekly",
        active: true,
      },
      {
        gym_id: gymId,
        name: "12-Month Paid in Full",
        description: "Best value — pay upfront and save",
        price: 799,
        pricing_model: "paid_in_full",
        term_months: 12,
        active: true,
      },
      {
        gym_id: gymId,
        name: "3-Month Paid in Full",
        description: "Short-term commitment, paid upfront",
        price: 249,
        pricing_model: "paid_in_full",
        term_months: 3,
        active: true,
      },
    ])
    .select();
  if (plansError) throw plansError;

  const weekly = plans.find((p) => p.name === "Weekly Direct Debit");
  const pif12 = plans.find((p) => p.name === "12-Month Paid in Full");
  const pif3 = plans.find((p) => p.name === "3-Month Paid in Full");
  console.log(`Seeded ${plans.length} plans.`);

  // ── 5. Seed members — spread across plans and states ─────────────────────
  const membersToInsert = [
    { first_name: "Emma", last_name: "Thompson", email: "emma.thompson@example.com", phone: "+64 21 555 0101", plan_id: weekly.id, status: "active", start_date: daysAgoDate(90) },
    { first_name: "Jayden", last_name: "Ropata", email: "jayden.ropata@example.com", phone: "+64 21 555 0102", plan_id: weekly.id, status: "active", start_date: daysAgoDate(60) },
    { first_name: "Grace", last_name: "Wallace", email: "grace.wallace@example.com", phone: "+64 27 555 0103", plan_id: pif12.id, status: "active", start_date: daysAgoDate(120) },
    { first_name: "Kane", last_name: "Fa'amausili", email: "kane.faamausili@example.com", phone: "+64 27 555 0104", plan_id: pif12.id, status: "active", start_date: daysAgoDate(150) },
    { first_name: "Chloe", last_name: "Anderson", email: "chloe.anderson@example.com", phone: "+64 21 555 0105", plan_id: pif3.id, status: "active", start_date: daysAgoDate(30) },
    {
      first_name: "Mitchell", last_name: "Corbett", email: "mitchell.corbett@example.com", phone: "+64 22 555 0106",
      plan_id: weekly.id, status: "paused", start_date: daysAgoDate(60),
      gc_customer_id: "CU0012345678", gc_mandate_id: "MD0087654321",
    },
    { first_name: "Zara", last_name: "Patel", email: "zara.patel@example.com", phone: "+64 21 555 0107", plan_id: weekly.id, status: "pending", start_date: daysAgoDate(1) },
    { first_name: "Ethan", last_name: "Wiremu", email: "ethan.wiremu@example.com", phone: "+64 27 555 0108", plan_id: pif3.id, status: "pending", start_date: daysAgoDate(2) },
    { first_name: "Olivia", last_name: "Chen", email: "olivia.chen@example.com", phone: "+64 21 555 0109", plan_id: weekly.id, status: "cancelled", start_date: daysAgoDate(180) },
    { first_name: "Ben", last_name: "Richardson", email: "ben.richardson@example.com", phone: "+64 22 555 0110", plan_id: pif12.id, status: "active", start_date: daysAgoDate(2) },
  ].map((m) => ({ ...m, gym_id: gymId }));

  const { data: members, error: membersError } = await supabase
    .from("members")
    .insert(membersToInsert)
    .select();
  if (membersError) throw membersError;
  console.log(`Seeded ${members.length} members.`);

  const byFirstName = (name) => {
    const m = members.find((m) => m.first_name === name);
    if (!m) throw new Error(`Seeded member "${name}" not found — insert order changed?`);
    return m;
  };

  // ── 6. Seed payments — mostly manual (pre-GoCardless cash/bank transfer),
  // one gocardless/failed to populate the Needs Attention list ─────────────
  const payments = [];
  const addSucceeded = (member, plan, amount, ago, note) =>
    payments.push({
      gym_id: gymId, member_id: member.id, plan_id: plan.id, amount, currency: "NZD",
      provider: "manual", type: plan.pricing_model === "recurring" ? "recurring" : "one_off",
      status: "succeeded", paid_at: daysAgoIso(ago), note,
    });

  addSucceeded(byFirstName("Emma"), weekly, 18, 1, "Bank transfer");
  addSucceeded(byFirstName("Emma"), weekly, 18, 8, "Bank transfer");
  addSucceeded(byFirstName("Emma"), weekly, 18, 15, "Bank transfer");

  addSucceeded(byFirstName("Jayden"), weekly, 18, 2, "Cash");
  addSucceeded(byFirstName("Jayden"), weekly, 18, 9, "Cash");

  addSucceeded(byFirstName("Grace"), pif12, 799, 120, "Bank transfer — 12-month PIF");
  addSucceeded(byFirstName("Kane"), pif12, 799, 150, "Bank transfer — 12-month PIF");
  addSucceeded(byFirstName("Chloe"), pif3, 249, 30, "Cash — 3-month PIF");
  addSucceeded(byFirstName("Ben"), pif12, 799, 2, "Bank transfer — 12-month PIF");

  addSucceeded(byFirstName("Mitchell"), weekly, 18, 53, "Cash");
  addSucceeded(byFirstName("Mitchell"), weekly, 18, 46, "Cash");
  payments.push({
    gym_id: gymId,
    member_id: byFirstName("Mitchell").id,
    plan_id: weekly.id,
    amount: 15,
    currency: "NZD",
    provider: "gocardless",
    provider_payment_id: "PM0011223344",
    type: "recurring",
    status: "failed",
    paid_at: null,
    created_at: daysAgoIso(1),
  });

  for (let i = 0; i < 8; i++) {
    addSucceeded(byFirstName("Olivia"), weekly, 18, 35 + i * 7, "Cash");
  }

  const { data: insertedPayments, error: paymentsError } = await supabase
    .from("payments")
    .insert(payments)
    .select();
  if (paymentsError) throw paymentsError;
  console.log(`Seeded ${insertedPayments.length} payments.`);

  console.log(`\nDone. Log in at ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/login with ${OWNER_EMAIL}.`);
}

main().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
