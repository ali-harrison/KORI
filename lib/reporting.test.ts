import { describe, it, expect } from "vitest";
import {
  buildActivity,
  buildRevenueSeries,
  collectedToCsv,
  filterOpenFailures,
  paceAgainstLastMonth,
  summarizeMandates,
  summarizeSubmissions,
} from "@/lib/reporting";
import type { CollectedPayment } from "@/types";

describe("buildRevenueSeries", () => {
  const now = new Date("2026-11-05T02:00:00Z");
  const paid = (date: string, amount: number) => ({ amount, paid_at: `${date}T00:00:00.000Z` });

  it("accumulates this month day by day, up to today", () => {
    const series = buildRevenueSeries([paid("2026-11-02", 10), paid("2026-11-02", 5), paid("2026-11-04", 20)], now);
    expect(series.current).toEqual([0, 15, 15, 35, 35]);
    expect(series.daysInMonth).toBe(30);
  });

  it("runs last month to its final day, and keeps the months apart", () => {
    const series = buildRevenueSeries([paid("2026-10-31", 40), paid("2026-11-01", 10)], now);
    expect(series.previous).toHaveLength(31);
    expect(series.previous.at(-1)).toBe(40);
    expect(series.current[0]).toBe(10);
  });

  it("handles January reaching back into December", () => {
    const series = buildRevenueSeries([paid("2025-12-15", 30)], new Date("2026-01-10T00:00:00Z"));
    expect(series.previous.at(-1)).toBe(30);
    expect(series.previousLabel).toBe("December");
  });

  it("ignores payments with no paid date", () => {
    expect(buildRevenueSeries([{ amount: 10, paid_at: null }], now).current.at(-1)).toBe(0);
  });
});

describe("paceAgainstLastMonth", () => {
  const series = (current: number[], previous: number[]) => ({
    current, previous, daysInMonth: 30, currentLabel: "November", previousLabel: "October",
  });

  it("compares the same day in each month", () => {
    expect(paceAgainstLastMonth(series([50, 150], [100, 100, 900]))).toBe(50);
    expect(paceAgainstLastMonth(series([50, 50], [100, 100, 900]))).toBe(-50);
  });

  it("has nothing to say without last month's data", () => {
    expect(paceAgainstLastMonth(series([50], [0]))).toBeNull();
  });

  it("copes with today being later in the month than last month ran", () => {
    expect(paceAgainstLastMonth(series(new Array(31).fill(100), new Array(30).fill(100)))).toBe(0);
  });
});

describe("collectedToCsv", () => {
  const payment = (overrides: Partial<CollectedPayment>): CollectedPayment => ({
    id: "1", memberId: "m", memberName: "Aroha Ngata", amount: 18, paidAt: "2026-11-02T00:00:00.000Z", provider: "gocardless", note: null, ...overrides,
  });

  it("writes a header and one row per payment", () => {
    expect(collectedToCsv([payment({})])).toBe("Date,Member,Amount (NZD),Method,Note\r\n2026-11-02,Aroha Ngata,18.00,Direct debit,\r\n");
  });

  it("quotes commas, quotes and line breaks", () => {
    const row = collectedToCsv([payment({ provider: "manual", note: 'Cash, "desk"\nmorning' })]).split("\r\n")[1];
    expect(row).toBe('2026-11-02,Aroha Ngata,18.00,Manual,"Cash, ""desk""\nmorning"');
  });

  // Names and notes are typed by people, and spreadsheets execute these.
  it.each(["=HYPERLINK(1)", "+1+1", "-1+1", "@SUM(1)"])("neutralises a formula: %s", (note) => {
    const row = collectedToCsv([payment({ note })]).split("\r\n")[1];
    expect(row.endsWith(`,'${note}`)).toBe(true);
  });
});

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
