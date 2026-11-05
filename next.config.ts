import type { NextConfig } from "next";
import { realServiceKeys } from "./lib/demo-mode";

// DEV_BYPASS disables auth (proxy.ts) and swaps every query for sample data
// (lib/queries.ts) — it must never be reachable in a production build/start.
// Fail loudly here rather than let it silently ship.
if (process.env.NODE_ENV === "production" && process.env.DEV_BYPASS === "true") {
  throw new Error(
    "DEV_BYPASS=true is set in a production build/start. Remove it from the " +
      "production environment before building or starting — it disables all " +
      "authentication."
  );
}

// PUBLIC_DEMO also turns sign-in off, which is only safe on a deployment that
// can't reach anything real. lib/demo-mode.ts refuses at runtime as well; this
// is what stops a mistake from shipping at all.
if (process.env.PUBLIC_DEMO === "true" && realServiceKeys().length > 0) {
  throw new Error(
    `PUBLIC_DEMO=true turns off sign-in, but real service keys are set: ${realServiceKeys().join(", ")}. ` +
      "A public demo must have none of them."
  );
}

const nextConfig: NextConfig = {
  // Demo mode runs under `next dev`, and the indicator sits on top of the
  // sidebar's user card. Build and runtime errors still surface without it.
  devIndicators: false,
};

export default nextConfig;
