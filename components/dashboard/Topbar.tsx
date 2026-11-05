"use client";

import { useEffect, useState } from "react";
import { APP_TIME_ZONE } from "@/utils";

// The gym's own time, wherever the screen happens to be.
function Clock() {
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    const format = new Intl.DateTimeFormat("en-NZ", {
      timeZone: APP_TIME_ZONE,
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZoneName: "short",
    });
    const tick = () => {
      const parts = Object.fromEntries(format.formatToParts(new Date()).map((part) => [part.type, part.value]));
      setNow(`${parts.weekday} ${parts.day} ${parts.month} / ${parts.hour}:${parts.minute} ${parts.timeZoneName}`);
    };
    tick();
    const timer = setInterval(tick, 15000);
    return () => clearInterval(timer);
  }, []);

  return <p className="label hidden md:block whitespace-nowrap min-h-4">{now}</p>;
}

interface TopbarProps {
  onOpenNav: () => void;
  onOpenSearch: () => void;
}

export function Topbar({ onOpenNav, onOpenSearch }: TopbarProps) {
  const [shortcut, setShortcut] = useState("⌘K");

  useEffect(() => {
    if (!/mac|iphone|ipad/i.test(navigator.userAgent)) setShortcut("Ctrl K");
  }, []);

  return (
    <header className="h-[58px] flex-shrink-0 flex items-center gap-3 px-4 sm:px-8 border-b border-line">
      <button
        onClick={onOpenNav}
        aria-label="Open menu"
        className="lg:hidden size-9 -ml-2 flex items-center justify-center text-fg-2 hover:text-fg flex-shrink-0 cursor-pointer"
      >
        <svg aria-hidden width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M2 5h14M2 9h14M2 13h14" stroke="currentColor" strokeWidth="1.25" />
        </svg>
      </button>
      <button
        onClick={onOpenSearch}
        className="flex-1 sm:flex-none sm:w-[320px] min-w-0 h-9 px-3 flex items-center justify-between gap-3 border border-line-strong rounded-control text-fg-3 hover:text-fg-2 transition-colors duration-150 cursor-pointer"
      >
        <span className="text-[13px] truncate">
          <span className="reo" lang="mi">Rapua · </span>Find a member or page
        </span>
        <kbd className="label hidden sm:block">{shortcut}</kbd>
      </button>
      <div className="flex-1 hidden sm:block" />
      <Clock />
    </header>
  );
}
