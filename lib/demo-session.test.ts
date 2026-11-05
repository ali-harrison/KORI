import { deflateRawSync } from "node:zlib";
import { beforeEach, describe, expect, it, vi } from "vitest";

const jar = vi.hoisted(() => new Map<string, string>());

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { value: jar.get(name) } : undefined),
    set: (name: string, value: string) => jar.set(name, value),
    delete: (name: string) => jar.delete(name),
  }),
}));

import { DEMO_FULL_MESSAGE, decodeSession, demoState, demoWrite, encodeSession, replaySession, resetDemoSession } from "@/lib/demo-session";
import { getFailedPaymentAlerts, getMember, getMemberCount, getMembers } from "@/lib/dev-store";

const member = (email: string) => ({ first_name: "Demo", last_name: "Person", email, phone: null, plan_id: null });

beforeEach(() => jar.clear());

describe("a visitor's session", () => {
  it("starts from the sample data with no cookie", async () => {
    expect(getMemberCount(await demoState())).toBe(22);
    expect(jar.size).toBe(0);
  });

  it("keeps writes across requests", async () => {
    await demoWrite("createMember", member("demo@example.com"));
    await demoWrite("setMemberStatus", "mem-1", "paused");

    const state = await demoState();
    expect(getMemberCount(state)).toBe(23);
    expect(getMember(state, "mem-1")?.status).toBe("paused");
  });

  it("gives a replayed row the same id every time", async () => {
    await demoWrite("createMember", member("demo@example.com"));

    const first = getMembers(await demoState())[0].id;
    const second = getMembers(await demoState())[0].id;
    expect(second).toBe(first);
  });

  it("doesn't record a refused write", async () => {
    await demoWrite("createMember", member("demo@example.com"));
    const cookie = [...jar.values()][0];

    expect(await demoWrite("createMember", member("demo@example.com"))).toEqual({
      error: "A member with this email already exists",
    });
    expect([...jar.values()][0]).toBe(cookie);
  });

  it("resets", async () => {
    await demoWrite("createMember", member("demo@example.com"));
    await resetDemoSession();
    expect(getMemberCount(await demoState())).toBe(22);
  });

  // Failed payments are seeded "3 hours ago". If that slid forward with the
  // clock, a failure a visitor had paid off would come back hours later.
  it("keeps sample dates fixed to when the session started", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-10T01:00:00Z"));
    try {
      const [alert] = getFailedPaymentAlerts(await demoState());
      await demoWrite("recordPayment", alert.memberId!, { amount: 18, paidAt: "2026-11-10", note: null });
      const remaining = getFailedPaymentAlerts(await demoState()).length;

      vi.setSystemTime(new Date("2026-11-10T09:00:00Z"));
      expect(getFailedPaymentAlerts(await demoState())).toHaveLength(remaining);
    } finally {
      vi.useRealTimers();
    }
  });

  it("refuses politely rather than losing data when the cookie would overflow", async () => {
    let result;
    for (let i = 0; i < 500 && !result; i++) {
      // Random text doesn't compress, so this reaches the limit quickly.
      result = await demoWrite("updateGym", { contract_template: crypto.randomUUID().repeat(8) + i });
    }

    expect(result).toEqual({ error: DEMO_FULL_MESSAGE });
    expect([...jar.values()][0].length).toBeLessThanOrEqual(3800);
    expect(decodeSession([...jar.values()][0])).not.toBeNull();
  });
});

// The cookie is in the visitor's hands, so all of this is reachable.
describe("a tampered cookie", () => {
  const seededAt = "2026-11-05T00:00:00.000Z";
  const context = { now: seededAt, id: "abc" };

  it("is ignored when it isn't a session at all", () => {
    expect(decodeSession("not-a-real-cookie")).toBeNull();
    expect(decodeSession(undefined)).toBeNull();
    expect(decodeSession(deflateRawSync("[]").toString("base64url"))).toBeNull();
    expect(decodeSession(deflateRawSync('{"seededAt":"nope","writes":[]}').toString("base64url"))).toBeNull();
  });

  // A valid session, so the size limit is the only thing that can reject it.
  it("is ignored when it would inflate to something huge", () => {
    const huge = JSON.stringify({ seededAt, writes: [], padding: "x".repeat(10_000_000) });
    expect(decodeSession(deflateRawSync(huge).toString("base64url"))).toBeNull();
  });

  it.each(["constructor", "__proto__", "toString", "nonsense"])("can't call %s", (name) => {
    const state = replaySession({ seededAt, writes: [{ name, args: [], context }] });
    expect(getMemberCount(state)).toBe(22);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("skips a malformed write and keeps the good ones", () => {
    const state = replaySession({
      seededAt,
      writes: [
        { name: "createMember", args: [null], context },
        { name: "setMemberStatus", args: ["mem-1", "paused"], context },
      ],
    });
    expect(getMember(state, "mem-1")?.status).toBe("paused");
  });

  it("can't set a logo URL for the server to fetch", () => {
    const state = replaySession({
      seededAt,
      writes: [{ name: "updateGym", args: [{ logo_url: "http://169.254.169.254/" }], context }],
    });
    expect(state.gym.logo_url).toBeNull();
  });

  it("round-trips a genuine session", () => {
    const session = { seededAt, writes: [{ name: "setMemberStatus", args: ["mem-1", "paused"], context }] };
    expect(decodeSession(encodeSession(session))).toEqual(session);
  });
});
