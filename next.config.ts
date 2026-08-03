import type { NextConfig } from "next";

// DEV_BYPASS disables auth (proxy.ts) and swaps every query for hardcoded
// fixtures (lib/queries.ts) — it must never be reachable in a production
// build/start. Fail loudly here rather than let it silently ship.
if (process.env.NODE_ENV === "production" && process.env.DEV_BYPASS === "true") {
  throw new Error(
    "DEV_BYPASS=true is set in a production build/start. Remove it from the " +
      "production environment before building or starting — it disables all " +
      "authentication."
  );
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
