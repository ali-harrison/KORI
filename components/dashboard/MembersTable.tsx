"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge, DataTable, DataTableRow, EmptyState, FilterChips } from "@/components/ui";
import {
  formatDate,
  formatPlanAmount,
  getInitials,
  getMandateBadgeState,
  MANDATE_STATE_LABEL,
  MANDATE_STATE_VARIANT,
  MEMBER_STATUS_LABEL,
  MEMBER_STATUS_VARIANT,
} from "@/utils";
import type { MemberWithPlan } from "@/types";

const FILTERS = ["All", "Active", "Pending", "Paused", "Cancelled"] as const;
type Filter = (typeof FILTERS)[number];

const GRID = "minmax(0,2.2fr) minmax(0,1.4fr) 100px 156px minmax(0,0.8fr) minmax(0,1fr) 40px";

function Avatar({ member }: { member: MemberWithPlan }) {
  return (
    <div className="w-[30px] h-[30px] rounded-full bg-[#171c18] border border-[#232823] text-[#99a19b] text-[11px] flex items-center justify-center flex-shrink-0">
      {getInitials(member.first_name, member.last_name)}
    </div>
  );
}

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

  const summary = (
    <div className="px-4 py-2.5 border-t border-[#191e1a] text-xs text-[#59615b]">
      {rows.length} of {members.length} members
    </div>
  );

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
        <>
          {/* Phone: one compact row per member rather than a squeezed table. */}
          <div className="md:hidden bg-[#111412] border border-[#1f2420] rounded-[10px] overflow-hidden">
            {rows.map((member, index) => (
              <Link
                key={member.id}
                href={`/dashboard/members/${member.id}`}
                className={`flex items-center gap-3 px-4 py-3 ${index > 0 ? "border-t border-[#191e1a]" : ""}`}
              >
                <Avatar member={member} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-medium truncate">{member.first_name} {member.last_name}</div>
                  <div className="text-xs text-[#646c66] truncate">{member.plan?.name ?? "No plan"}</div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <Badge variant={MEMBER_STATUS_VARIANT[member.status]} dot>{MEMBER_STATUS_LABEL[member.status]}</Badge>
                  {member.plan && <span className="text-xs text-[#8f978f] tabular-nums">{formatPlanAmount(member.plan)}</span>}
                </div>
              </Link>
            ))}
            {summary}
          </div>

          <DataTable
            className="hidden md:block"
            gridTemplateColumns={GRID}
            minWidth={880}
            headers={["Member", "Plan", "Status", "Direct debit", "Next payment", "Amount", ""]}
            footer={summary}
          >
            {rows.map((member) => {
              const mandateState = getMandateBadgeState(member);
              return (
                <DataTableRow key={member.id} gridTemplateColumns={GRID} href={`/dashboard/members/${member.id}`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar member={member} />
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-medium truncate">{member.first_name} {member.last_name}</div>
                      <div className="text-xs text-[#646c66] truncate">{member.email}</div>
                    </div>
                  </div>
                  <div className="text-[13px] truncate">{member.plan?.name ?? "—"}</div>
                  <div>
                    <Badge variant={MEMBER_STATUS_VARIANT[member.status]} dot>{MEMBER_STATUS_LABEL[member.status]}</Badge>
                  </div>
                  <div>
                    <Badge variant={MANDATE_STATE_VARIANT[mandateState]}>{MANDATE_STATE_LABEL[mandateState]}</Badge>
                  </div>
                  <div className="text-[13px] text-[#b9c0ba] tabular-nums">
                    {member.next_billing_date ? formatDate(member.next_billing_date, { day: "numeric", month: "short" }) : "—"}
                  </div>
                  <div className="text-[13px] tabular-nums">
                    {member.plan ? formatPlanAmount(member.plan) : "—"}
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-[var(--accent)]">View</span>
                  </div>
                </DataTableRow>
              );
            })}
          </DataTable>
        </>
      )}
    </div>
  );
}
