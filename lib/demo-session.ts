import { cookies } from "next/headers";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import { createDemoData, type DemoState } from "./dev-data";
import { demoWrites, type DemoWriteArgs, type DemoWriteName, type WriteContext, type WriteResult } from "./dev-store";

// Each visitor's demo lives in their own browser, as a cookie holding the list
// of changes they've made, replayed over the sample data on every request.
// The server keeps nothing, which matters on a public page: one visitor can
// never see what another typed, there's nothing to clean up, and it works on
// Vercel, where consecutive requests can land on different servers.

const COOKIE_NAME = "kori_demo";
// Browsers cap a cookie at about 4KB, name and attributes included.
const MAX_COOKIE_LENGTH = 3800;
const MAX_DECODED_BYTES = 64 * 1024;
const ONE_DAY_SECONDS = 60 * 60 * 24;

export const DEMO_FULL_MESSAGE = "This demo has reached its limit. Press Reset demo to start again.";

interface LoggedWrite {
  name: string;
  args: unknown[];
  context: WriteContext;
}

export interface DemoSession {
  // Sample data is dated relative to this rather than to right now. A failed
  // payment seeded at "3 hours ago" would otherwise keep sliding forward and
  // reappear after a visitor had already paid it off.
  seededAt: string;
  writes: LoggedWrite[];
}

export function encodeSession(session: DemoSession): string {
  return deflateRawSync(JSON.stringify(session)).toString("base64url");
}

// The cookie comes from the browser, so nothing in it can be trusted. Anything
// that doesn't decode cleanly is treated as no session, which is the worst a
// visitor can do to themselves by editing it.
export function decodeSession(value: string | undefined): DemoSession | null {
  if (!value) return null;
  try {
    const decoded = inflateRawSync(Buffer.from(value, "base64url"), { maxOutputLength: MAX_DECODED_BYTES });
    const session = JSON.parse(decoded.toString());
    if (Number.isNaN(Date.parse(session.seededAt)) || !Array.isArray(session.writes)) return null;
    return session;
  } catch {
    return null;
  }
}

function applyWrite(state: DemoState, write: LoggedWrite): WriteResult {
  // hasOwn, so a tampered name like "constructor" can't reach anything.
  if (!Object.hasOwn(demoWrites, write.name)) return;
  const apply = demoWrites[write.name as DemoWriteName] as (
    state: DemoState,
    context: WriteContext,
    ...args: unknown[]
  ) => WriteResult;
  return apply(state, write.context, ...write.args);
}

export function replaySession(session: DemoSession): DemoState {
  const state = createDemoData(new Date(session.seededAt));
  for (const write of session.writes) {
    try {
      applyWrite(state, write);
    } catch {
      // A malformed entry from an edited cookie. Skip it and keep going.
    }
  }
  return state;
}

export async function demoState(): Promise<DemoState> {
  const session = decodeSession((await cookies()).get(COOKIE_NAME)?.value);
  return session ? replaySession(session) : createDemoData();
}

export async function demoWrite<K extends DemoWriteName>(name: K, ...args: DemoWriteArgs<K>): Promise<WriteResult> {
  const jar = await cookies();
  const session = decodeSession(jar.get(COOKIE_NAME)?.value) ?? { seededAt: new Date().toISOString(), writes: [] };
  const write: LoggedWrite = {
    name,
    args,
    context: { now: new Date().toISOString(), id: crypto.randomUUID().slice(0, 8) },
  };

  const refused = applyWrite(replaySession(session), write);
  if (refused) return refused;

  const value = encodeSession({ ...session, writes: [...session.writes, write] });
  if (value.length > MAX_COOKIE_LENGTH) return { error: DEMO_FULL_MESSAGE };

  jar.set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_DAY_SECONDS,
    path: "/",
  });
}

export async function resetDemoSession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}
