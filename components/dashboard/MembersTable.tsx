"use client";

import { useState, useMemo } from "react";
import { Badge, Button } from "@/components/ui";
import { formatDate, formatCurrency, formatBillingIntervalSuffix } from "@/utils";
import type { MemberWithPlan, MemberStatus } from "@/types";

const statusVariant: Record<MemberStatus, "success" | "warning" | "default" | "danger"> = {
  active: "success",
  pending: "warning",
  paused: "default",
  cancelled: "danger",
  expired: "danger",
};

const ALL_FILTERS = ["all", "active", "pending", "paused", "cancelled"] as const;
type Filter = (typeof ALL_FILTERS)[number];

interface MembersTableProps {
  members: MemberWithPlan[];
  onAddMember: () => void;
}

export function MembersTable({ members, onAddMember }: MembersTableProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    return members.filter((m) => {
      const matchesFilter = filter === "all" || m.status === filter;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.plan?.name.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [members, search, filter]);

  return (
    <div className="rounded-[8px] bg-[#111111] border border-[rgba(255,255,255,0.06)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[rgba(255,255,255,0.06)]">
        <div className="relative flex-1 max-w-xs">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444444]">
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.25" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 bg-[#0c0c0c] text-[#f5f5f5] text-xs border border-[rgba(255,255,255,0.08)] rounded-[6px] pl-8 pr-3 placeholder:text-[#444444] outline-none focus:border-[rgba(255,255,255,0.2)] transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {ALL_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 text-xs rounded-[4px] transition-all duration-150 ${
                filter === f
                  ? "bg-[rgba(232,255,71,0.08)] text-[#e8ff47] border border-[rgba(232,255,71,0.12)]"
                  : "text-[#888888] hover:text-[#f5f5f5] hover:bg-[rgba(255,255,255,0.04)] border border-transparent"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-xs text-[#444444]">
            {search || filter !== "all" ? "No members match your search." : "No members yet."}
          </p>
          {!search && filter === "all" && (
            <button
              onClick={onAddMember}
              className="mt-2 text-xs text-[#888888] hover:text-[#f5f5f5] transition-colors"
            >
              Add your first member →
            </button>
          )}
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.04)]">
              {["Member", "Plan", "Joined", "Next Billing", "Status", ""].map((col) => (
                <th key={col} className="px-5 py-3 text-left text-[10px] font-medium text-[#444444] tracking-wider uppercase">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((member, i) => (
              <tr
                key={member.id}
                className={`group transition-colors duration-100 hover:bg-[rgba(255,255,255,0.02)] ${
                  i !== filtered.length - 1 ? "border-b border-[rgba(255,255,255,0.04)]" : ""
                }`}
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-semibold text-[#888888]">
                        {member.first_name[0]}{member.last_name[0]}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-[#f5f5f5] font-medium">{member.first_name} {member.last_name}</span>
                      <span className="text-[10px] text-[#444444]">{member.email}</span>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  {member.plan ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-[#f5f5f5]">{member.plan.name}</span>
                      <span className="text-[10px] text-[#444444]">
                        {member.plan.pricing_model === "recurring"
                          ? `${formatCurrency(member.plan.price)}/${formatBillingIntervalSuffix(member.plan.billing_interval)}`
                          : `${formatCurrency(member.plan.price)} upfront`}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-[#444444]">—</span>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-xs text-[#888888]">
                    {formatDate(member.start_date ?? member.created_at, { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-xs text-[#888888]">
                    {member.next_billing_date
                      ? formatDate(member.next_billing_date, { day: "numeric", month: "short" })
                      : "—"}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <Badge variant={statusVariant[member.status as MemberStatus]} dot>
                    {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                  </Badge>
                </td>
                <td className="px-5 py-3.5">
                  <a
                    href={`/dashboard/members/${member.id}`}
                    className="text-xs text-[#444444] hover:text-[#888888] opacity-0 group-hover:opacity-100 transition-all duration-150"
                  >
                    View →
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
