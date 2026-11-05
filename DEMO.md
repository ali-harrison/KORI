# Demo walkthrough

About five minutes, in demo mode (see the [README](README.md)). Sample data is dated relative to today, so it's always current. Your changes stay in your own browser, and if a run goes sideways, press **Reset demo** in the top banner.

Running it locally, go through it once before presenting: `npm run dev` compiles each page the first time it's opened, so the first visit to a page is slower than the rest.

## Starting point

| | |
| --- | --- |
| Members | 22: 13 active, 4 paused, 3 pending, 2 cancelled |
| Failed payments | 2: Aroha Ngata and Hemi Parata |
| Plans | Weekly Direct Debit $18/wk, 12-Month Paid in Full $799, 3-Month Paid in Full $249 |

The sidebar, Overview, Members and Billing all count from the same rows, so they always agree.

## 1. Overview: what needs doing today

Failed payments are at the top, next to what's due this week and recent activity.

## 2. A failed payment, start to finish

1. Under **Needs attention**, click **Send reminder** next to Aroha. It confirms with **Sent**. The wording comes from the template in Settings.
2. Click **View** to open Aroha's profile: the failed charge sits on top of their payment history.
3. Say they've paid cash at the desk. Click **Record payment**, enter `18`, and save. It appears straight away.
4. Click **Reactivate** to set them back to active.
5. Back on **Overview**, Aroha has left Needs attention, Failed payments has dropped to 1, and revenue is up $18.

## 3. Sign up a new member

1. In **Members**, click **Add member** and pick a plan. They appear as Pending, and the count in the sidebar goes up.
2. Open them and click **Set up direct debit**. In production the member goes through GoCardless's hosted bank page here. The demo skips straight to the result: **Pending confirmation**, with a first charge scheduled.
3. Click **Send contract**, then **Download** to see the PDF generated from the gym's template, with the member's details filled in.
4. Click **Mark as signed**.

## 4. Plans

Hover a plan and click **Edit**, or add one with **New plan**. Try **Delete** on Weekly Direct Debit: it refuses, because members are on it.

## 5. Billing

Mandate health across all members, the next two weeks of charges, and recent collection days, including the day that had failures.

## 6. Cancelling

Open any active direct debit member and click **Cancel**. They move to **Cancelling** rather than Cancelled, because the app waits for GoCardless to confirm. Ngahuia Reid already shows that state. In the demo no confirmation arrives, so they stay there until you reset.

## 7. Settings

- **Contract template** and **Overdue payment reminder** preview live as you type.
- Under **Appearance**, turn **Te reo Māori labels** off and on, or change the accent colour.
- Change the gym's name and it updates in the sidebar.

## On a phone

Everything works at phone width, with the menu behind the button at the top left. To show it, narrow the browser window or use the device toolbar in your browser's dev tools.

---

## Demoing against a real database

`npm run seed:demo` loads a separate sample set into Supabase for a click-through with real sign-in. **It deletes the gym's existing plans, members, contracts and payments first**, so only run it on a database with nothing worth keeping. Set `SEED_OWNER_EMAIL` in `.env.local` to the email that owns the gym, and sign in with it at `/auth/login`.
