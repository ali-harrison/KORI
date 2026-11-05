// Demo mode swaps Supabase, GoCardless and email for sample data and turns off
// sign-in, so it must never run anywhere that can reach anything real. No
// imports here: next.config.ts and proxy.ts both use this file, and it's the
// one definition of when demo mode is on.

// Setting any of these means this deployment can reach real data or real money.
const REAL_SERVICE_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GOCARDLESS_ACCESS_TOKEN",
  "GOCARDLESS_CLIENT_ID",
  "GOCARDLESS_CLIENT_SECRET",
  "GOCARDLESS_WEBHOOK_SECRET",
  "RESEND_API_KEY",
];

type Env = Record<string, string | undefined>;

export function realServiceKeys(env: Env = process.env): string[] {
  return REAL_SERVICE_KEYS.filter((key) => !!env[key]);
}

// The public showcase deployment. Needs PUBLIC_DEMO=true and no real keys at
// all, so adding one by mistake turns the demo off rather than exposing
// anything: next.config.ts fails the build, and this fails at runtime too in
// case a key is added to a deployment that's already live.
export function isPublicDemo(env: Env = process.env): boolean {
  return env.PUBLIC_DEMO === "true" && realServiceKeys(env).length === 0;
}

// DEV_BYPASS is the local version, and only ever works under `next dev`.
export function isDemoMode(env: Env = process.env): boolean {
  return isPublicDemo(env) || (env.NODE_ENV === "development" && env.DEV_BYPASS === "true");
}
