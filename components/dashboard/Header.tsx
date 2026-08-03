"use client";

import { cn } from "@/utils";

interface HeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  userEmail?: string;
  userInitials?: string;
}

export function Header({
  title,
  description,
  actions,
  userEmail,
  userInitials = "JO",
}: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-8 py-5 border-b border-[rgba(255,255,255,0.06)] bg-[#0c0c0c]">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-sm font-semibold text-[#f5f5f5] leading-snug">{title}</h1>
        {description && (
          <p className="text-xs text-[#888888]">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {actions}

        {/* Divider */}
        {actions && (
          <div className="w-px h-5 bg-[rgba(255,255,255,0.06)]" />
        )}

        {/* User avatar */}
        <button className="flex items-center gap-2 px-2 py-1.5 rounded-[6px] border border-transparent hover:bg-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.06)] transition-all duration-150 group">
          <div className="w-6 h-6 rounded-full bg-[rgba(232,255,71,0.12)] border border-[rgba(232,255,71,0.2)] flex items-center justify-center flex-shrink-0">
            <span className="text-[9px] font-bold text-[#e8ff47]">{userInitials}</span>
          </div>
          {userEmail && (
            <span className="text-xs text-[#888888] group-hover:text-[#f5f5f5] transition-colors duration-150 max-w-[160px] truncate">
              {userEmail}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
