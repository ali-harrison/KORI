"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Card, EmptyState, Button } from "@/components/ui";

// Catches a render/data-fetch crash in any /dashboard/* page (e.g. a
// Supabase call throwing) so it shows the same on-brand fallback as
// not-found.tsx instead of Next's default error screen. Client component —
// required by the error.tsx contract. Doesn't catch a crash in
// DashboardLayout itself (getGym/getUser/getMemberCount) since an error
// boundary never covers its own segment's layout — that bubbles up to
// app/global-error.tsx instead.
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
    <Card>
      <EmptyState
        title={{ en: "Something went wrong" }}
        description="This page hit an unexpected error. Try again, or head back to the dashboard."
      />
      <div className="flex justify-center gap-2 pb-6 -mt-4">
        <Button variant="secondary" size="sm" onClick={reset}>Try again</Button>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">Back to dashboard</Button>
        </Link>
      </div>
    </Card>
  );
}
