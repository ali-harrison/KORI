import { gocardless as GoCardless, Environments } from "gocardless-nodejs";

// ── Client (lazy, server-only) ────────────────────────────────────────────────

let _client: ReturnType<typeof GoCardless> | null = null;

export function getGoCardlessClient() {
  if (!_client) {
    _client = GoCardless(
      process.env.GOCARDLESS_ACCESS_TOKEN!,
      Environments.Sandbox
    );
  }
  return _client;
}

// ── Per-gym client (uses gym's own access token) ──────────────────────────────

export function getGoCardlessGymClient(accessToken: string) {
  return GoCardless(accessToken, Environments.Sandbox);
}

// ── OAuth helpers ─────────────────────────────────────────────────────────────

const GC_OAUTH_BASE = "https://connect-sandbox.gocardless.com";
const GC_API_BASE = "https://api-sandbox.gocardless.com";

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
