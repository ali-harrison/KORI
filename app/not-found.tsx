import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/ui";

export const metadata: Metadata = { title: "Page not found" };

// Everything outside /dashboard. Can't reuse EmptyState here — it reads theme
// settings, and that provider only exists inside the dashboard.
export default function NotFound() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 text-center">
      <Wordmark className="mb-8" />
      <h1 className="text-xl font-medium">Page not found</h1>
      <p className="text-sm text-[#8f978f] mt-1.5 mb-6">This page doesn&apos;t exist, or the link may be out of date.</p>
      <Link
        href="/dashboard"
        className="inline-flex items-center h-9 px-3.5 text-[13px] rounded-[8px] bg-[#151a16] border border-[#262b27] hover:border-[#3a403b] transition-colors duration-150"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
