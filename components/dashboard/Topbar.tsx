"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
}

export function Topbar({ userEmail }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { bilingual } = useThemeSettings();
  const [search, setSearch] = useState("");

  // Typing anywhere jumps to Members and filters — debounced navigation to
  // /dashboard/members?q=..., which the members page reads server-side and
  // hands to the table as its initial filter.
  useEffect(() => {
    if (!search) return;
    const timer = setTimeout(() => {
      router.push(`/dashboard/members?q=${encodeURIComponent(search)}`);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const route = ROUTE_TITLES.find((r) => r.match(pathname)) ?? { reo: undefined, en: "" };
  const primary = bilingual && route.reo ? route.reo : route.en;
  const secondary = bilingual && route.reo ? route.en : "";

  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "?";

  return (
    <div className="h-[58px] flex-shrink-0 flex items-center gap-4 px-7 border-b border-[#1b201c]">
      <div className="flex items-baseline gap-2">
        <span className="text-[14.5px] font-medium">{primary}</span>
        {secondary && <span className="text-xs text-[#646c66]">{secondary}</span>}
      </div>
      <div className="flex-1" />
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={bilingual ? "Rapua · search members" : "Search members"}
        className="w-[250px] bg-[#101311] border border-[#1f2420] rounded-[8px] px-3 py-[7px] text-[12.5px] text-[#e7eae8] outline-none focus:border-[var(--accent)] placeholder:text-[#59615b] transition-colors duration-150"
      />
      <div className="w-[30px] h-[30px] rounded-full bg-[#151a16] border border-[#232823] text-[#99a19b] text-[11px] flex items-center justify-center flex-shrink-0">
        {initials}
      </div>
    </div>
  );
}
