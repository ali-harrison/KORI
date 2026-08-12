"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge, DataTable, DataTableRow, EmptyState, FilterChips } from "@/components/ui";
import { formatDate, getMandateBadgeState, MANDATE_STATE_LABEL, MANDATE_STATE_VARIANT, formatPlanPrice } from "@/utils";
import type { MemberWithPlan } from "@/types";

const FILTERS = ["All", "Active", "Pending", "Paused", "Cancelled"] as const;
type Filter = (typeof FILTERS)[number];

const GRID = "2.2fr 1.3fr 1.2fr 1.1fr 0.9fr 56px";

interface MembersTableProps {
  members: MemberWithPlan[];
}

export function MembersTable({ members }: MembersTableProps) {
  const [filter, setFilter] = useState<Filter>("All");
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") ?? "").toLowerCase().trim();

  const rows = useMemo(() => {
    return members.filter((m) => {
      const matchesFilter = filter === "All" || m.status === filter.toLowerCase();
      const matchesSearch =
        !q ||
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.plan?.name.toLowerCase().includes(q) ?? false);
      return matchesFilter && matchesSearch;
    });
  }, [members, filter, q]);

  return (
    <div>
      <FilterChips options={FILTERS} value={filter} onChange={setFilter} className="mb-3" />

      {rows.length === 0 ? (
        <div className="bg-[#111412] border border-[#1f2420] rounded-[10px]">
          <EmptyState
            title={{ en: "No members match" }}
            description="Try a different filter or search term."
          />
        </div>
      ) : (
        <DataTable
          gridTemplateColumns={GRID}
          headers={["Member", "Plan", "Mandate", "Next payment", "Amount", ""]}
          footer={
            <div className="px-4 py-2.5 border-t border-[#191e1a] text-xs text-[#59615b] flex justify-between">
              <span>{rows.length} of {members.length} members</span>
            </div>
          }
        >
          {rows.map((member) => {
            const mandateState = getMandateBadgeState(member);
            return (
              <DataTableRow key={member.id} gridTemplateColumns={GRID} onClick={() => (window.location.href = `/dashboard/members/${member.id}`)}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-[30px] h-[30px] rounded-full bg-[#171c18] border border-[#232823] text-[#99a19b] text-[11px] flex items-center justify-center flex-shrink-0">
                    {member.first_name[0]}{member.last_name[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-medium truncate">{member.first_name} {member.last_name}</div>
                    <div className="text-xs text-[#646c66] truncate">{member.email}</div>
                  </div>
                </div>
                <div className="text-[13px] truncate">{member.plan?.name ?? "—"}</div>
                <div>
                  <Badge variant={MANDATE_STATE_VARIANT[mandateState]} dot>
                    {MANDATE_STATE_LABEL[mandateState]}
                  </Badge>
                </div>
                <div className="text-[13px] text-[#b9c0ba] tabular-nums">
                  {member.next_billing_date ? formatDate(member.next_billing_date, { day: "numeric", month: "short" }) : "—"}
                </div>
                <div className="text-[13px] tabular-nums">
                  {member.plan ? formatPlanPrice(member.plan) : "—"}
                </div>
                <div className="text-right">
                  <span className="text-xs text-[var(--accent)]">View</span>
                </div>
              </DataTableRow>
            );
          })}
        </DataTable>
      )}
    </div>
  );
}
