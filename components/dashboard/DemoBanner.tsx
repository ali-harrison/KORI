"use client";

import { useTransition } from "react";
import { resetDemo } from "@/app/actions/demo";

// Always visible in demo mode, so nobody mistakes sample data for a live gym.
export function DemoBanner() {
  const [isPending, startTransition] = useTransition();

  return (
    <aside aria-label="Demo notice" className="flex-shrink-0 flex items-center justify-between gap-3 px-4 sm:px-8 py-1.5 border-b border-line bg-sunken">
      <p className="label min-w-0 truncate">Demo / sample data / no real emails or payments</p>
      <button
        onClick={() => startTransition(() => resetDemo())}
        disabled={isPending}
        className="label flex-shrink-0 underline underline-offset-2 hover:text-fg transition-colors duration-150 disabled:opacity-50 cursor-pointer"
      >
        {isPending ? "Resetting…" : "Reset demo"}
      </button>
    </aside>
  );
}
