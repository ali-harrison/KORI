import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, Wordmark, buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-6">
      <Wordmark className="mb-4" />
      <EmptyState pageTitle title={{ en: "Page not found" }} description="This page doesn't exist, or the link may be out of date.">
        <Link href="/dashboard" className={buttonClass("secondary", "md", "mt-5")}>Back to dashboard</Link>
      </EmptyState>
    </main>
  );
}
