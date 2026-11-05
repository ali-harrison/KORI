"use client";

import { useTransition } from "react";
import { resetDemo } from "@/app/actions/demo";

// Always visible in demo mode, so nobody mistakes sample data for a live gym.
export function DemoBanner() {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex-shrink-0 flex items-center justify-between gap-3 px-4 sm:px-7 py-1.5 text-xs text-[#cba55e] bg-[rgba(203,165,94,0.07)] border-b border-[rgba(203,165,94,0.16)]">
      <span className="min-w-0 truncate">Demo mode — sample data, no real emails or payments.</span>
      <button
        onClick={() => startTransition(() => resetDemo())}
        disabled={isPending}
        className="flex-shrink-0 underline underline-offset-2 hover:text-[#e7eae8] transition-colors duration-150 disabled:opacity-50"
      >
        {isPending ? "Resetting…" : "Reset demo"}
      </button>
    </div>
  );
}
