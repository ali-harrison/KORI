import { describe, expect, it } from "vitest";
import { isDemoMode, isPublicDemo, realServiceKeys } from "@/lib/demo-mode";

describe("isDemoMode", () => {
  it("is off by default", () => {
    expect(isDemoMode({})).toBe(false);
    expect(isDemoMode({ NODE_ENV: "production" })).toBe(false);
  });

  it("DEV_BYPASS works under next dev only", () => {
    expect(isDemoMode({ NODE_ENV: "development", DEV_BYPASS: "true" })).toBe(true);
    expect(isDemoMode({ NODE_ENV: "production", DEV_BYPASS: "true" })).toBe(false);
  });

  it("PUBLIC_DEMO works in production when nothing real is configured", () => {
    expect(isDemoMode({ NODE_ENV: "production", PUBLIC_DEMO: "true" })).toBe(true);
    expect(isPublicDemo({ NODE_ENV: "production", PUBLIC_DEMO: "true" })).toBe(true);
  });

  it("only the exact value counts", () => {
    expect(isPublicDemo({ PUBLIC_DEMO: "1" })).toBe(false);
    expect(isPublicDemo({ PUBLIC_DEMO: "TRUE" })).toBe(false);
  });

  // The safety property: sign-in can only be off where nothing real exists.
  it.each([
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "GOCARDLESS_ACCESS_TOKEN",
    "GOCARDLESS_CLIENT_ID",
    "GOCARDLESS_CLIENT_SECRET",
    "GOCARDLESS_WEBHOOK_SECRET",
    "RESEND_API_KEY",
  ])("PUBLIC_DEMO turns itself off if %s is set", (key) => {
    const env = { NODE_ENV: "production", PUBLIC_DEMO: "true", [key]: "anything" };
    expect(isDemoMode(env)).toBe(false);
    expect(realServiceKeys(env)).toEqual([key]);
  });

  it("an empty key doesn't count as real", () => {
    expect(isPublicDemo({ PUBLIC_DEMO: "true", RESEND_API_KEY: "" })).toBe(true);
  });
});
