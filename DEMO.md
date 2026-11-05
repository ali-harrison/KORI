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

## 1. Overview: the state of the gym in a sentence

The headline says what needs you and how the month is going. Kōkōwai only ever marks what needs attention, so the eye goes straight to it.

The chart steps up on charge days, this month against last. Hover it, or focus it and use the arrow keys, to read any day.

**Every number shows its working.** Click **Collected this month**: it opens the payments behind that figure, with a total that matches, and **Export CSV** adds up to the same amount.

## 2. A failed payment, without leaving the page

1. Under **Needs attention**, click **Send reminder** next to Aroha. It confirms with **Sent**. The wording comes from the template in Settings.
2. Say they've paid cash at the desk. Click **Record payment** on the same row. The amount is already filled in, so just save.
3. Aroha leaves the list, the headline drops to 1 payment, and revenue goes up by $18.
4. Open Aroha's profile, the payment is in their history. Click **Reactivate** to set them back to active.

## Finding anyone, fast

Press `⌘K` (`Ctrl K` on Windows) from any screen, type a few letters of a name, and press Enter.

## 3. Sign up a new member

1. In **Members**, click **Add member** and pick a plan. They appear as Pending, and the count in the sidebar goes up.
2. Open them and click **Set up direct debit**. In production the member goes through GoCardless's hosted bank page here. The demo skips straight to the result: **Pending confirmation**, with a first charge scheduled.
3. Click **Send contract**, then **Download** to see the PDF generated from the gym's template, with the member's details filled in.
4. Click **Mark as signed**.

## 4. Plans

Hover a plan and click **Edit**, or add one with **New plan**. Try **Delete** on Weekly Direct Debit: it refuses, because members are on it.

## 5. Billing

Direct debit status across all members, the next two weeks of charges, every payment collected this month, and recent collection days.

## 6. Cancelling

Open any active direct debit member and click **Cancel**. They move to **Cancelling** rather than Cancelled, because the app waits for GoCardless to confirm. Ngahuia Reid already shows that state. In the demo no confirmation arrives, so they stay there until you reset.

## 7. Settings

- **Contract template** and **Overdue payment reminder** preview live as you type.
- Under **Appearance**, switch between dark and light, and turn **Te reo Māori labels** and the **Poutama pattern** off and on.
- Change the gym's name and it updates in the sidebar.

## On a phone

Everything works at phone width, with the menu behind the button at the top left. To show it, narrow the browser window or use the device toolbar in your browser's dev tools.

---

## Demoing against a real database

`npm run seed:demo` loads a separate sample set into Supabase for a click-through with real sign-in. **It deletes the gym's existing plans, members, contracts and payments first**, so only run it on a database with nothing worth keeping. Set `SEED_OWNER_EMAIL` in `.env.local` to the email that owns the gym, and sign in with it at `/auth/login`.
