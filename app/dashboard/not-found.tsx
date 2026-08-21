import Link from "next/link";
import { Card, EmptyState, Button } from "@/components/ui";

// Catches notFound() from any /dashboard/* page (currently only
// members/[id] calls it) — without this, Next falls back to its bare
// generic 404, jarringly out of place next to the rest of the dashboard.
// Stays inside DashboardLayout's AppShell since this file lives in the
// /dashboard segment, so the sidebar/header are still there to navigate
// from.
export default function DashboardNotFound() {
  return (
    <Card>
      <EmptyState
        title={{ en: "Page not found" }}
        description="This page doesn't exist, or the link may be out of date."
      />
      <div className="flex justify-center pb-6 -mt-4">
        <Link href="/dashboard">
          <Button variant="secondary" size="sm">Back to dashboard</Button>
        </Link>
      </div>
    </Card>
  );
}
