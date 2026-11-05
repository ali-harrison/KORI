# kori/os

Gym management for NZ gyms: members, plans, GoCardless direct debit, contracts and overdue reminders. Built for one pilot gym, Southerly Strength in Southport.

**Stack:** Next.js 16 (App Router), TypeScript, Tailwind 4, Supabase (Postgres, Auth, Storage), GoCardless, Resend, `@react-pdf/renderer`. Deployed on Vercel.

## Run the demo

No accounts or credentials needed. Demo mode runs on sample data held in memory.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. [DEMO.md](DEMO.md) has a five-minute walkthrough.

Everything you click works and persists until the server restarts or you press **Reset demo**. Nothing leaves your machine: no emails, no payments, no database.

## Run against real services

Set `DEV_BYPASS=false` in `.env.local` and fill in the rest of the values, then follow the checklist below.

`DEV_BYPASS` turns off all authentication, so it only works under `next dev`, and `next.config.ts` refuses to build or start production with it on. To run a production build locally while your `.env.local` has it on:

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
| `lib/dev-data.ts`, `lib/dev-store.ts` | Demo mode's sample data and in-memory store |
| `lib/gocardless-webhook.ts`, `lib/member-cancellation.ts` | Billing logic, kept framework-free so it's unit testable |
| `supabase/migrations/` | Schema |

[AUDIT.md](AUDIT.md) is the running record of what's been verified, what's known to be missing, and why decisions were made.
