"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils";
import { PuhoroMotif } from "@/components/ui";
import { useThemeSettings } from "@/components/providers/ThemeSettingsProvider";

interface NavItem {
  href: string;
  reo?: string; // No fabricated te reo for items the design reference didn't cover
  en: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    reo: "Tirohanga",
    en: "Overview",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <rect x="2.5" y="2.5" width="4.6" height="4.6" rx="1.3" fill="currentColor" />
        <rect x="9" y="2.5" width="4.6" height="4.6" rx="1.3" fill="currentColor" opacity="0.45" />
        <rect x="2.5" y="9" width="4.6" height="4.6" rx="1.3" fill="currentColor" opacity="0.45" />
        <rect x="9" y="9" width="4.6" height="4.6" rx="1.3" fill="currentColor" opacity="0.45" />
      </svg>
    ),
  },
  {
    href: "/dashboard/members",
    reo: "Mema",
    en: "Members",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="5.2" r="2.6" stroke="currentColor" strokeWidth="1.4" fill="none" />
        <path d="M3.4 13.2c.9-2.7 2.5-4 4.6-4s3.7 1.3 4.6 4" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/dashboard/plans",
    en: "Plans",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.25" />
        <path d="M5 7h6M5 10h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/dashboard/billing",
    reo: "Utu",
    en: "Billing",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="3.5" width="12" height="9" rx="1.8" stroke="currentColor" strokeWidth="1.4" fill="none" />
        <path d="M2 6.6H14" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    ),
  },
  {
    href: "/dashboard/contracts",
    en: "Contracts",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M4 2h6l4 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.25" />
        <path d="M9 2v4h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/dashboard/settings",
    reo: "Tautuhinga",
    en: "Settings",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="5.4" stroke="currentColor" strokeWidth="1.4" fill="none" />
        <circle cx="8" cy="8" r="1.7" fill="currentColor" />
      </svg>
    ),
  },
];

interface SidebarProps {
  gymName?: string;
  memberCount?: number;
  userEmail?: string;
}

export function Sidebar({ gymName = "Southerly Strength", memberCount, userEmail }: SidebarProps) {
  const pathname = usePathname();
  const { bilingual, motif } = useThemeSettings();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "?";

  return (
    <aside className="flex flex-col w-[228px] flex-shrink-0 h-full bg-[#0b0d0c] border-r border-[#1b201c] px-3 py-5">
      {/* Brand */}
      <div className="px-2">
        <div className="text-base font-medium tracking-tight">
          kori<span className="text-[var(--accent)]">/os</span>
        </div>
        <div className="text-[11px] text-[#59615b] mt-0.5">gym operations</div>
      </div>

      {/* Gym switcher — single-tenant, nothing to switch to. Visual only. */}
      <div className="mt-5 flex items-center gap-2.5 px-2.5 py-2 border border-[#1f2420] rounded-[9px]">
        <div className="w-[26px] h-[26px] rounded-[7px] bg-[#151a16] border border-[#232823] text-[var(--accent)] text-xs font-medium flex items-center justify-center flex-shrink-0">
          {gymName[0]?.toUpperCase() ?? "P"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-[#e7eae8] truncate">{gymName}</div>
          <div className="text-[11px] text-[#646c66] truncate">
            {memberCount !== undefined ? `${memberCount} mema` : " "}
          </div>
        </div>
        <svg width="12" height="12" viewBox="0 0 12 12" className="flex-shrink-0">
          <path d="M3 4.5 6 7.5 9 4.5" stroke="#646c66" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Nav */}
      <nav className="flex-1 mt-6 overflow-y-auto">
        <ul className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const label = bilingual && item.reo ? item.reo : item.en;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-[13px]",
                    "transition-colors duration-150",
                    active ? "bg-[#151a16] text-[#e7eae8]" : "text-[#99a19b] hover:bg-[#111412]"
                  )}
                >
                  <span className={active ? "text-[var(--accent)]" : "text-[#646c66]"}>{item.icon}</span>
                  <span className="flex-1">{label}</span>
                  {bilingual && item.reo && (
                    <span className="text-[11px] text-[#59615b]">{item.en}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex-1" />

      {motif && (
        <div className="h-[84px] overflow-hidden relative -mx-3 opacity-50">
          <PuhoroMotif variant="sidebar" />
        </div>
      )}

      {/* User card */}
      <div className="flex items-center gap-2.5 px-2 pt-2.5 border-t border-[#1b201c]">
        <div className="w-7 h-7 rounded-full bg-[#151a16] border border-[#232823] text-[#99a19b] text-[11px] flex items-center justify-center flex-shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium truncate">{userEmail ?? "—"}</div>
          <div className="text-[11px] text-[#646c66]">
            {bilingual ? "Kaiwhakahaere · owner" : "Owner"}
          </div>
        </div>
      </div>
    </aside>
  );
}
