"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils";
import { Poutama, Wordmark } from "@/components/ui";
import { signOut } from "@/app/actions/auth";
import { NAV_ITEMS } from "./nav";

interface SidebarProps {
  gymName: string;
  memberCount: number;
  userEmail?: string;
  isDemo: boolean;
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ gymName, memberCount, userEmail, isDemo, className, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/dashboard" ? pathname === href : pathname.startsWith(href));

  return (
    <aside className={cn("flex-col w-[240px] flex-shrink-0 h-full bg-bg border-r border-line", className)}>
      <div className="h-[58px] flex-shrink-0 flex items-center px-5 border-b border-line">
        <Link href="/dashboard" onClick={onNavigate}>
          <Wordmark />
        </Link>
      </div>

      <div className="px-5 py-3.5 border-b border-line">
        <p className="truncate">{gymName}</p>
        <p className="label mt-0.5">
          {memberCount} <span className="reo" lang="mi">mema</span>
          <span className="en-only">members</span>
        </p>
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto">
        <ul>
          {NAV_ITEMS.map((item, index) => {
            const active = isActive(item.href);
            return (
              <li key={item.href} className="border-b border-line">
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 h-11 px-5 transition-colors duration-150",
                    active ? "bg-raised text-fg" : "text-fg-2 hover:text-fg hover:bg-glow"
                  )}
                >
                  <span className="label w-4 flex-shrink-0">
                    {active ? <span aria-hidden className="inline-block size-1.5 bg-accent align-middle" /> : String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 truncate">
                    {item.reo ? (
                      <>
                        <span className="reo" lang="mi">{item.reo}</span>
                        <span className="en-only">{item.en}</span>
                      </>
                    ) : (
                      item.en
                    )}
                  </span>
                  {item.reo && <span className="reo label">{item.en}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Poutama width={240} height={36} spacing={24} step={6} className="flex-shrink-0" />

      <div className="flex-shrink-0 border-t border-line px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] truncate">{userEmail ?? "—"}</p>
            <p className="label">
              <span className="reo" lang="mi">Kaiwhakahaere · </span>Owner
            </p>
          </div>
          {/* No session to end in demo mode. */}
          {!isDemo && (
            <form action={signOut}>
              <button type="submit" className="label hover:text-fg cursor-pointer">Sign out</button>
            </form>
          )}
        </div>
        <a href="https://tewairama.digital" target="_blank" rel="noopener" className="label block mt-3 hover:text-fg transition-colors duration-150">
          Te Wairama Digital <span aria-hidden>↗</span>
        </a>
      </div>
    </aside>
  );
}
