# Setup

## Run the demo

No accounts or credentials needed. Demo mode runs on sample data.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. [DEMO.md](../DEMO.md) has a five-minute walkthrough.

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

## Deploying the public demo

The demo is its own Vercel project on the same repo. Its only environment variable is `PUBLIC_DEMO=true`, and it must never hold a real key: the build fails if it does, and the demo turns itself off at runtime if one appears later. See `lib/demo-mode.ts`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm test` | Unit tests |
| `npm run typecheck` | TypeScript check |
| `npm run seed:demo` | **Wipes** the real gym's plans, members, contracts and payments, then loads sample data |
