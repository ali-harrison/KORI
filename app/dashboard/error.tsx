"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button, EmptyState, buttonClass } from "@/components/ui";

// Catches a crash in any /dashboard/* page. A boundary never covers its own
// segment's layout, so a crash in DashboardLayout goes to app/global-error.tsx.
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard render error:", error);
  }, [error]);

  return (
    <EmptyState pageTitle title={{ en: "Something went wrong" }} description="This page hit an unexpected error. Try again, or head back to the overview." className="py-24">
      <div className="flex justify-center gap-2 mt-5">
        <Button onClick={reset}>Try again</Button>
        <Link href="/dashboard" className={buttonClass("ghost")}>Back to overview</Link>
      </div>
    </EmptyState>
  );
}
