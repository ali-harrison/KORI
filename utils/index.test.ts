import { describe, it, expect } from "vitest";
import { getMandateBadgeState } from "@/utils";

describe("getMandateBadgeState", () => {
  it("no mandate, not paused-by-cancellation → none", () => {
    expect(getMandateBadgeState({ gc_mandate_id: null, status: "pending", cancellation_requested_at: null })).toBe(
      "none"
    );
  });

  it("no mandate, status paused → cancelled (handleMandateCancelled's signature combination)", () => {
    expect(getMandateBadgeState({ gc_mandate_id: null, status: "paused", cancellation_requested_at: null })).toBe(
      "cancelled"
    );
  });

  it("mandate present, cancellation_requested_at set → cancelling, regardless of status", () => {
    expect(
      getMandateBadgeState({ gc_mandate_id: "MD1", status: "active", cancellation_requested_at: "2026-01-01T00:00:00Z" })
    ).toBe("cancelling");
  });

  // Locks in the fix for the bug where a member who cancels and later gets a
  // brand new mandate would read as "cancelling" forever because
  // cancellation_requested_at was never cleared. Both write paths
  // (lib/gocardless-webhook.ts:handleMandateCancelled and the billing-callback
  // route) now null it out, so a fresh mandate with no in-flight cancellation
  // must read as a normal status-derived state, not "cancelling".
  it("mandate present, cancellation_requested_at cleared → derives from status normally", () => {
    expect(
      getMandateBadgeState({ gc_mandate_id: "MD2", status: "active", cancellation_requested_at: null })
    ).toBe("active");
  });

  it("mandate present, active status → active", () => {
    expect(getMandateBadgeState({ gc_mandate_id: "MD1", status: "active", cancellation_requested_at: null })).toBe(
      "active"
    );
  });

  it("mandate present, paused status (payment failure, not cancellation) → failed", () => {
    expect(getMandateBadgeState({ gc_mandate_id: "MD1", status: "paused", cancellation_requested_at: null })).toBe(
      "failed"
    );
  });

  it("mandate present, pending status → pending", () => {
    expect(getMandateBadgeState({ gc_mandate_id: "MD1", status: "pending", cancellation_requested_at: null })).toBe(
      "pending"
    );
  });
});
