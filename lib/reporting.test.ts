import { describe, it, expect } from "vitest";
import { buildActivity, filterOpenFailures, summarizeMandates, summarizeSubmissions } from "@/lib/reporting";

describe("filterOpenFailures", () => {
  const failure = { id: "pay-1", memberId: "mem-1", failedAt: "2026-11-03T08:00:00Z" };

  it("keeps a failure nobody has paid off", () => {
    expect(filterOpenFailures([failure], [])).toEqual([failure]);
  });

  it("clears a failure once that member has a later success", () => {
    const successes = [{ member_id: "mem-1", created_at: "2026-11-04T08:00:00Z" }];
    expect(filterOpenFailures([failure], successes)).toEqual([]);
  });

  it("ignores a success from before the failure", () => {
    const successes = [{ member_id: "mem-1", created_at: "2026-10-27T08:00:00Z" }];
    expect(filterOpenFailures([failure], successes)).toEqual([failure]);
  });

  it("ignores another member's success", () => {
    const successes = [{ member_id: "mem-2", created_at: "2026-11-04T08:00:00Z" }];
    expect(filterOpenFailures([failure], successes)).toEqual([failure]);
  });
});

describe("summarizeSubmissions", () => {
  const row = (status: "succeeded" | "failed", at: string, amount = 15) => ({
    amount,
    status,
    paid_at: status === "succeeded" ? at : null,
    created_at: at,
  });

  it("groups by day and works out each day's status", () => {
    const summary = summarizeSubmissions(
      [
        row("succeeded", "2026-11-03T00:00:00Z"),
        row("succeeded", "2026-11-03T00:00:00Z"),
        row("failed", "2026-11-03T02:00:00Z"),
        row("failed", "2026-11-01T02:00:00Z"),
        row("succeeded", "2026-10-30T00:00:00Z"),
      ],
      14
    );

    expect(summary.map((day) => [day.date, day.status])).toEqual([
      ["2026-11-03", "partial_failures"],
      ["2026-11-01", "all_failed"],
      ["2026-10-30", "clear"],
    ]);
    expect(summary[0]).toMatchObject({ chargeCount: 3, succeededCount: 2, succeededValue: 30, failedCount: 1 });
  });

  it("puts a failure on the NZ day it was recorded, not the UTC one", () => {
    const [day] = summarizeSubmissions([row("failed", "2026-11-04T19:00:00Z")], 14);
    expect(day.date).toBe("2026-11-05");
  });

  it("keeps only the most recent days", () => {
    const summary = summarizeSubmissions(
      [row("succeeded", "2026-11-03T00:00:00Z"), row("succeeded", "2026-11-02T00:00:00Z")],
      1
    );
    expect(summary.map((day) => day.date)).toEqual(["2026-11-03"]);
  });
});

describe("summarizeMandates", () => {
  it("counts every member exactly once", () => {
    const base = { gc_customer_id: null, cancellation_requested_at: null };
    const summary = summarizeMandates([
      { ...base, gc_mandate_id: "MD1", status: "active" },
      { ...base, gc_mandate_id: "MD2", status: "paused" },
      { ...base, gc_mandate_id: null, status: "active" },
    ]);
    expect(summary).toEqual({ active: 1, pending: 0, cancelling: 0, on_hold: 1, cancelled: 0, none: 1, total: 3 });
  });
});

describe("buildActivity", () => {
  const member = { first_name: "Aroha", last_name: "Ngata" };

  it("merges payments and signups, newest first, up to the limit", () => {
    const items = buildActivity(
      [{ id: "1", amount: 15, status: "succeeded", created_at: "2026-11-03T00:00:00Z", member }],
      [{ id: "m1", ...member, created_at: "2026-11-04T00:00:00Z", plan: { name: "Weekly" } }],
      1
    );
    expect(items.map((item) => item.text)).toEqual(["Aroha Ngata joined on the Weekly plan"]);
  });

  it("only reports a failure for a payment that actually failed", () => {
    const items = buildActivity(
      [
        { id: "1", amount: 15, status: "failed", created_at: "2026-11-03T00:00:00Z", member },
        { id: "2", amount: 15, status: "pending", created_at: "2026-11-02T00:00:00Z", member },
        { id: "3", amount: 15, status: "refunded", created_at: "2026-11-01T00:00:00Z", member },
      ],
      [],
      10
    );
    expect(items.map((item) => item.text)).toEqual(["Payment failed — Aroha Ngata"]);
  });
});
