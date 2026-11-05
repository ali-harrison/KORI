import { describe, it, expect, vi, afterEach } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatRelativeDate,
  getMandateBadgeState,
  safeRedirectPath,
  toClientGym,
  toLocalISODate,
} from "@/utils";
import type { Gym } from "@/types";

type BadgeInput = Parameters<typeof getMandateBadgeState>[0];

function badge(overrides: Partial<BadgeInput>) {
  return getMandateBadgeState({
    gc_mandate_id: null,
    gc_customer_id: null,
    status: "active",
    cancellation_requested_at: null,
    ...overrides,
  });
}

describe("getMandateBadgeState", () => {
  it("no mandate and never had one → none", () => {
    expect(badge({ status: "pending" })).toBe("none");
  });

  it("no mandate but a customer on file, paused → cancelled (a mandate died on its own)", () => {
    expect(badge({ gc_customer_id: "CU1", status: "paused" })).toBe("cancelled");
  });

  it("no mandate but a customer on file, cancelled → cancelled (the webhook's terminal state)", () => {
    expect(badge({ gc_customer_id: "CU1", status: "cancelled" })).toBe("cancelled");
  });

  it("cash member paused or cancelled → none, since they never had a mandate to lose", () => {
    expect(badge({ status: "paused" })).toBe("none");
    expect(badge({ status: "cancelled" })).toBe("none");
  });

  it("mandate present, cancellation_requested_at set → cancelling, regardless of status", () => {
    expect(badge({ gc_mandate_id: "MD1", cancellation_requested_at: "2026-01-01T00:00:00Z" })).toBe("cancelling");
  });

  // Locks in the fix for the bug where a member who cancels and later gets a
  // brand new mandate would read as "cancelling" forever because
  // cancellation_requested_at was never cleared. Both write paths
  // (lib/gocardless-webhook.ts:handleMandateCancelled and the billing-callback
  // route) now null it out, so a fresh mandate with no in-flight cancellation
  // must read as a normal status-derived state, not "cancelling".
  it("mandate present, cancellation_requested_at cleared → derives from status normally", () => {
    expect(badge({ gc_mandate_id: "MD2" })).toBe("active");
  });

  // Pausing someone by hand must not paint a healthy mandate as a failure.
  it("mandate present, paused → on_hold, whether by hand or a failed payment", () => {
    expect(badge({ gc_mandate_id: "MD1", status: "paused" })).toBe("on_hold");
  });

  it("mandate present, pending status → pending", () => {
    expect(badge({ gc_mandate_id: "MD1", status: "pending" })).toBe("pending");
  });
});

// Vercel runs in UTC, 13 hours behind NZ in summer. 8am Thursday in NZ is
// still 7pm Wednesday on the server.
describe("dates follow the gym's calendar, not the server's", () => {
  afterEach(() => vi.useRealTimers());

  const nzMorning = "2026-11-04T19:00:00Z";

  it("toLocalISODate gives the NZ date", () => {
    expect(toLocalISODate(nzMorning)).toBe("2026-11-05");
  });

  it("toLocalISODate defaults to today in NZ", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(nzMorning));
    expect(toLocalISODate()).toBe("2026-11-05");
  });

  it("formatDate shows the NZ day", () => {
    expect(formatDate(nzMorning, { weekday: "long" })).toBe("Thursday");
  });

  it("a bare date stays on that date", () => {
    expect(toLocalISODate("2026-11-12")).toBe("2026-11-12");
    expect(formatDate("2026-11-12", { day: "numeric", month: "short" })).toBe("12 Nov");
  });

  it("formatRelativeDate counts calendar days, not elapsed hours", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(nzMorning)); // 8am Thursday NZ
    expect(formatRelativeDate("2026-11-04T10:00:00Z")).toBe("Yesterday"); // 11pm Wednesday, 9 hours earlier
    expect(formatRelativeDate("2026-11-04T18:00:00Z")).toBe("Today");
  });
});

describe("formatCurrency", () => {
  it("keeps whole dollars clean", () => {
    expect(formatCurrency(15)).toBe("$15");
    expect(formatCurrency(799)).toBe("$799");
  });

  it("always shows two digits of cents", () => {
    expect(formatCurrency(13.5)).toBe("$13.50");
    expect(formatCurrency(12.25)).toBe("$12.25");
  });
});

describe("safeRedirectPath", () => {
  it("allows a path on this site", () => {
    expect(safeRedirectPath("/dashboard/members", "/dashboard")).toBe("/dashboard/members");
  });

  it("falls back when nothing was requested", () => {
    expect(safeRedirectPath(null, "/dashboard")).toBe("/dashboard");
  });

  it.each(["@evil.com", ".evil.com", "//evil.com", "/\\evil.com", "https://evil.com"])("refuses %s", (path) => {
    expect(safeRedirectPath(path, "/dashboard")).toBe("/dashboard");
  });
});

describe("toClientGym", () => {
  it("strips the GoCardless access token before a gym reaches the browser", () => {
    const gym = { id: "gym-1", name: "Southerly Strength", gc_organisation_id: "OR1", gc_access_token: "live_secret" } as Gym;

    const clientGym = toClientGym(gym);

    expect(JSON.stringify(clientGym)).not.toContain("live_secret");
    expect(clientGym.gc_organisation_id).toBe("OR1");
  });
});
