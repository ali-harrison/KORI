import Link from "next/link";
import { EmptyState, buttonClass } from "@/components/ui";

// Stays inside the dashboard chrome, so there's still a way to navigate out.
export default function DashboardNotFound() {
  return (
    <EmptyState pageTitle title={{ en: "Page not found" }} description="This page doesn't exist, or the link may be out of date." className="py-24">
      <Link href="/dashboard" className={buttonClass("secondary", "md", "mt-5")}>Back to overview</Link>
    </EmptyState>
  );
}
