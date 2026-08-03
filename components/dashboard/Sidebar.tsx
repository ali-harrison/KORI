"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
        <rect x="9" y="2" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
        <rect x="2" y="9" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
        <rect x="9" y="9" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
      </svg>
    ),
  },
  {
    href: "/dashboard/members",
    label: "Members",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.25" />
        <path d="M2 13c0-2.21 1.79-4 4-4s4 1.79 4 4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        <path d="M11 7.5c1.1.3 2 1.3 2 2.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        <circle cx="12" cy="4.5" r="1.5" stroke="currentColor" strokeWidth="1.25" />
      </svg>
    ),
  },
  {
    href: "/dashboard/plans",
    label: "Plans",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.25" />
        <path d="M5 7h6M5 10h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/dashboard/contracts",
    label: "Contracts",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M4 2h6l4 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.25" />
        <path d="M9 2v4h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 9h6M5 11.5h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.25" />
        <path
          d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M11.9 3.4l-.7.7M4.1 11.9l-.7.7"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

interface SidebarProps {
  gymName?: string;
}

export function Sidebar({ gymName = "Southerly Strength" }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <aside className="flex flex-col w-[220px] flex-shrink-0 h-full bg-[#111111] border-r border-[rgba(255,255,255,0.06)]">
      {/* Logo / Gym name */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[rgba(255,255,255,0.06)]">
        <div className="w-7 h-7 rounded-[6px] bg-[#e8ff47] flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-black text-[#0c0c0c] tracking-tight">KG</span>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold text-[#f5f5f5] truncate leading-tight">
            {gymName}
          </span>
          <span className="text-[10px] text-[#444444] leading-tight">Admin</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-xs font-medium",
                    "transition-all duration-150",
                    active
                      ? "bg-[rgba(232,255,71,0.08)] text-[#e8ff47] border border-[rgba(232,255,71,0.12)]"
                      : "text-[#888888] border border-transparent hover:bg-[rgba(255,255,255,0.04)] hover:text-[#f5f5f5] hover:border-[rgba(255,255,255,0.06)]"
                  )}
                >
                  <span
                    className={cn(
                      "flex-shrink-0 transition-colors duration-150",
                      active ? "text-[#e8ff47]" : "text-[#444444]"
                    )}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-[6px] bg-[rgba(16,185,129,0.06)] border border-[rgba(16,185,129,0.12)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] flex-shrink-0" />
          <span className="text-[10px] text-[#10b981] font-medium">Trial active</span>
        </div>
      </div>
    </aside>
  );
}
