"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { DemoBanner } from "./DemoBanner";
import { ThemeSettingsProvider } from "@/components/providers/ThemeSettingsProvider";

interface AppShellProps {
  gymName: string;
  memberCount: number;
  userEmail?: string;
  isDemo: boolean;
  children: React.ReactNode;
}

// Persistent chrome across every /dashboard/* route — sidebar + topbar +
// scrollable content. Page-specific action buttons (Add member, Record
// payment, New plan) live in each page's own content, not here — the
// topbar has no actions slot in this design, only title + global search.
// Below lg the sidebar becomes a drawer opened from the topbar.
export function AppShell({ gymName, memberCount, userEmail, isDemo, children }: AppShellProps) {
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!navOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [navOpen]);

  const sidebarProps = { gymName, memberCount, userEmail, isDemo };

  return (
    <ThemeSettingsProvider>
      <div className="flex h-dvh bg-[#0b0d0c] text-[14px]">
        <Sidebar {...sidebarProps} className="hidden lg:flex" />

        {navOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              aria-label="Close menu"
              onClick={() => setNavOpen(false)}
              className="absolute inset-0 bg-[rgba(5,7,6,0.62)] animate-[so-fade_150ms_ease]"
            />
            <Sidebar
              {...sidebarProps}
              className="flex relative animate-[so-fade_150ms_ease]"
              onNavigate={() => setNavOpen(false)}
            />
          </div>
        )}

        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {isDemo && <DemoBanner />}
          <Topbar userEmail={userEmail} onOpenNav={() => setNavOpen(true)} />
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-[1120px] mx-auto px-4 sm:px-7 py-5 sm:py-[26px] pb-12">{children}</div>
          </main>
        </div>
      </div>
    </ThemeSettingsProvider>
  );
}
