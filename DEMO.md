# Southerly Strength — click-through demo checklist

Run `node --env-file=.env.local scripts/seed-demo.mjs` first (see its header
comment for details). It's safe to re-run any time you want a clean demo
state back — it always wipes and reseeds Southerly Strength's plans, members, and
payments.

The expected values below assume the seed data is fresh. If you've been
clicking around and changing things, re-run the seed script to reset before
checking pass/fail against these numbers.

## 1. Log in
Go to `/auth/login`, enter `owner@example.com`, click the magic link
in your email.
**Correct:** you land on `/dashboard` showing "Southerly Strength" in the header —
not an empty state, not an onboarding prompt.

## 2. Dashboard stats
**Correct — each stat card reads:**
- Total Members: **10**
- Active Members: **6**, with retention around **60%**
- Monthly Revenue: a non-zero dollar figure (from this calendar month's
  succeeded payments only — a couple of weekly payments plus one 12-month
  paid-in-full lump sum land in the current month by design)
- Failed Payments: **1**, marked red / "need attention"

## 3. Members list → member detail → payment history
Go to **Members**, open **Emma Thompson**.
**Correct:** status badge "Active", plan "Weekly Direct Debit" at
**$18/wk**, and a Payments card showing **3** succeeded entries (most
recent first), each with a note ("Bank transfer").

Also open **Grace Wallace**: plan "12-Month Paid in Full" showing
**$799 upfront (12 mo)**, one succeeded payment in her history.

## 4. Record a manual payment
On any active member's page, click **Record payment**, enter an amount and
date, submit.
**Correct:** the new entry appears at the top of that member's payment
history immediately, and the dashboard's Monthly Revenue figure increases
by that amount if you recorded it with today's date.

## 5. Add a new member
From **Members**, click **Add member**, fill in a name/email and assign
any plan.
**Correct:** they appear in the members list with status "Pending" and the
correct plan name/price shown; Total Members on the dashboard increments
by one.

## 6. Change a member's status
Open a member, use the status actions (e.g. Pause an active member).
**Correct:** the badge updates immediately on their detail page, and the
change is reflected in the Members list and in Active Members / retention
% on the dashboard without needing a manual refresh.

## 7. Needs Attention — the paused/failed member
Go back to the dashboard.
**Correct:** the Alerts panel shows **Mitchell Corbett — $18 failed**
with a recent date, linking through to his member page. His status badge
there reads "Paused", and his profile shows "Direct debit: Mandate active"
(a placeholder mandate ID was seeded — no live GoCardless call happens in
this pass).

## 8. Every plan shape displays correctly
Go to **Plans**.
**Correct — three cards:**
- "Weekly Direct Debit" — **$18/wk**
- "12-Month Paid in Full" — **$799 upfront**, with a "12-month term, paid
  in full" note
- "3-Month Paid in Full" — **$249 upfront**, with a "3-month term, paid in
  full" note

Click **New plan**: the Recurring/Paid-in-full toggle swaps between a
billing-interval dropdown (weekly/monthly/annual) and a term-length field.
