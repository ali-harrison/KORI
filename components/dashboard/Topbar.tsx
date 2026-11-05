"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useThemeSettings } from "@/components/providers/ThemeSettingsProvider";

// No fabricated te reo for Plans/Contracts — same call as the Sidebar nav.
const ROUTE_TITLES: { match: (path: string) => boolean; reo?: string; en: string }[] = [
  { match: (p) => p === "/dashboard", reo: "Tirohanga whānui", en: "Overview" },
  { match: (p) => p === "/dashboard/members", reo: "Mema", en: "Members" },
  { match: (p) => p.startsWith("/dashboard/members/"), reo: "Mema", en: "Member profile" },
  { match: (p) => p.startsWith("/dashboard/plans"), en: "Plans" },
  { match: (p) => p.startsWith("/dashboard/billing"), reo: "Utu", en: "Billing & payments" },
  { match: (p) => p.startsWith("/dashboard/contracts"), en: "Contracts" },
  { match: (p) => p.startsWith("/dashboard/settings"), reo: "Tautuhinga", en: "Settings" },
];

interface TopbarProps {
  userEmail?: string;
  onOpenNav: () => void;
}

const MEMBERS_PATH = "/dashboard/members";

export function Topbar({ userEmail, onOpenNav }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { bilingual } = useThemeSettings();
  const inputRef = useRef<HTMLInputElement>(null);

  const onMembers = pathname === MEMBERS_PATH;
  const urlQuery = onMembers ? searchParams.get("q") ?? "" : "";
  const [search, setSearch] = useState(urlQuery);

  // Follow the URL when it changes under us (navigating away clears the box),
  // but never while someone's typing — a slow navigation landing mid-word
  // would overwrite what they've just typed.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) setSearch(urlQuery);
  }, [urlQuery]);

  // Typing anywhere jumps to Members and filters; clearing the box clears the
  // filter. Debounced, and replaces rather than pushes once on Members, so the
  // back button doesn't step through every keystroke.
  useEffect(() => {
    if (search === urlQuery) return;
    const timer = setTimeout(() => {
      const target = search ? `${MEMBERS_PATH}?q=${encodeURIComponent(search)}` : MEMBERS_PATH;
      if (onMembers) router.replace(target);
      else if (search) router.push(target);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const route = ROUTE_TITLES.find((r) => r.match(pathname)) ?? { reo: undefined, en: "" };
  const primary = bilingual && route.reo ? route.reo : route.en;
  const secondary = bilingual && route.reo ? route.en : "";

  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "?";

  return (
    <div className="h-[58px] flex-shrink-0 flex items-center gap-3 sm:gap-4 px-4 sm:px-7 border-b border-[#1b201c]">
      <button
        onClick={onOpenNav}
        aria-label="Open menu"
        className="lg:hidden w-9 h-9 -ml-1.5 flex items-center justify-center rounded-[8px] text-[#99a19b] hover:text-[#e7eae8] flex-shrink-0"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      <div className="hidden sm:flex items-baseline gap-2 min-w-0">
        <span className="text-[14.5px] font-medium truncate">{primary}</span>
        {secondary && <span className="text-xs text-[#646c66] truncate">{secondary}</span>}
      </div>
      <div className="hidden sm:block flex-1" />
      <input
        ref={inputRef}
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search members"
        placeholder={bilingual ? "Rapua · search members" : "Search members"}
        className="w-full min-w-0 sm:w-[250px] bg-[#101311] border border-[#1f2420] rounded-[8px] px-3 py-[7px] text-[12.5px] text-[#e7eae8] outline-none focus:border-[var(--accent)] placeholder:text-[#59615b] transition-colors duration-150"
      />
      <div className="hidden sm:flex w-[30px] h-[30px] rounded-full bg-[#151a16] border border-[#232823] text-[#99a19b] text-[11px] items-center justify-center flex-shrink-0">
        {initials}
      </div>
    </div>
  );
}
