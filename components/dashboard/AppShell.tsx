"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { DemoBanner } from "./DemoBanner";
import { CommandPalette } from "./CommandPalette";

interface AppShellProps {
  gymName: string;
  memberCount: number;
  userEmail?: string;
  isDemo: boolean;
  children: React.ReactNode;
}

// Persistent chrome across every /dashboard/* route. Below lg the sidebar
// becomes a drawer opened from the topbar.
export function AppShell({ gymName, memberCount, userEmail, isDemo, children }: AppShellProps) {
  const [navOpen, setNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    function handler(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") setNavOpen(false);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const sidebarProps = { gymName, memberCount, userEmail, isDemo };

  return (
    <div className="flex h-dvh bg-bg">
      <a href="#content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-raised focus:px-3 focus:py-2">
        Skip to content
      </a>

      <Sidebar {...sidebarProps} className="hidden lg:flex" />

      {navOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Close menu"
            onClick={() => setNavOpen(false)}
            className="absolute inset-0 bg-[var(--scrim)] animate-[fade_150ms_ease] cursor-pointer"
          />
          <Sidebar {...sidebarProps} className="flex relative animate-[fade_150ms_ease]" onNavigate={() => setNavOpen(false)} />
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {isDemo && <DemoBanner />}
        <Topbar onOpenNav={() => setNavOpen(true)} onOpenSearch={() => setSearchOpen(true)} />
        <main id="content" tabIndex={-1} className="flex-1 overflow-y-auto outline-none">
          <div className="max-w-[1240px] mx-auto px-4 sm:px-8 py-6 sm:py-9 pb-14">{children}</div>
        </main>
      </div>

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
