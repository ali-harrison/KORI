# kori/os

Gym management for NZ gyms: members, plans, GoCardless direct debit, contracts and overdue reminders.

## What it does

- **Overview** of what needs doing today: failed payments, charges due this week, recent activity
- **Members** with plans, payment history, direct debit status and contracts
- **Plans** that bill weekly, monthly, annually, or paid in full up front
- **Direct debit** through GoCardless: mandates, subscriptions, and a webhook that keeps payments in sync
- **Contracts** generated as PDFs from a template the gym edits, with a live preview
- **Overdue reminders** the gym can word themselves and send in one click
- **Te reo Māori** labels throughout, which can be turned off, and a layout that works on a phone

**Stack:** Next.js 16 (App Router), TypeScript, Tailwind 4, Supabase (Postgres, Auth, Storage), GoCardless, Resend, `@react-pdf/renderer`. Deployed on Vercel.

## Run the demo

No accounts or credentials needed.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. [DEMO.md](DEMO.md) has a five-minute walkthrough.

Everything you click works and persists until you press **Reset demo**. Nothing leaves your browser: no emails, no payments, no database.

### How the demo works

Each visitor's changes are saved in a cookie as a list of what they did, and replayed over the sample data on every request. The server stores nothing, so one visitor never sees another's changes, and it works on serverless hosting where requests can land on different machines.

Demo mode turns off sign-in, so it's only allowed where nothing real can be reached:

- `DEV_BYPASS=true` only works under `next dev`. The build refuses it for production.
- `PUBLIC_DEMO=true` is for the public deployment. It's refused at build time if any Supabase, GoCardless or Resend key is set, and turns itself off at runtime if one appears later.

See `lib/demo-mode.ts`.

## Run against real services

Set `DEV_BYPASS=false` in `.env.local` and fill in the rest of the values, then follow the checklist below. To run a production build locally while your `.env.local` has it on:

```bash
DEV_BYPASS=false npm run build
```

## Going live

1. **Database.** Link a Supabase project and apply every migration:
   ```bash
   npx supabase login
   ```
   ```bash
   npx supabase link --project-ref <ref>
   ```
   ```bash
   npx supabase db push
   ```
2. **Auth.** In Supabase, add the deployed URL to Authentication → URL Configuration. Without it, magic links won't redirect back.
3. **Email.** Verify a sending domain in Resend, then set `RESEND_API_KEY` and `EMAIL_FROM`.
4. **GoCardless.** Create a sandbox app and set `GOCARDLESS_CLIENT_ID`, `GOCARDLESS_CLIENT_SECRET` and `GOCARDLESS_WEBHOOK_SECRET`. Point its webhook at `/api/webhooks/gocardless`. Connect the gym from Settings, then run one real mandate, payment and cancellation through the sandbox. **This loop has never run against real GoCardless.**
5. **Go live with money** by setting `GOCARDLESS_ENVIRONMENT=live`. Anything else stays on sandbox.

Every variable also needs to be set in Vercel. Pushing to `main` deploys.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm test` | Unit tests |
| `npm run typecheck` | TypeScript check |
| `npm run seed:demo` | **Wipes** the real gym's plans, members, contracts and payments, then loads sample data |

## Layout

| Path | Contents |
| --- | --- |
| `app/dashboard/` | The admin app |
| `app/actions/` | Server Actions, one file per area |
| `app/api/` | GoCardless OAuth, billing callback and webhook |
| `lib/queries.ts` | All reads |
| `lib/reporting.ts` | Pure aggregation shared by real and demo data |
| `lib/demo-mode.ts` | When demo mode is allowed to be on |
| `lib/dev-data.ts`, `lib/dev-store.ts`, `lib/demo-session.ts` | Demo sample data, its reads and writes, and the per-visitor cookie |
| `lib/gocardless-webhook.ts`, `lib/member-cancellation.ts` | Billing logic, kept framework-free so it's unit testable |
| `supabase/migrations/` | Schema |
