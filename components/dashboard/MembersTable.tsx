"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge, EmptyState, FilterTabs, Panel, RowLink, Table, Td, Th, Tr } from "@/components/ui";
import {
  formatDate,
  formatPlanAmount,
  getMandateBadgeState,
  MANDATE_STATE_LABEL,
  MANDATE_STATE_VARIANT,
  MEMBER_STATUS_LABEL,
  MEMBER_STATUS_VARIANT,
} from "@/utils";
import type { MemberStatus, MemberWithPlan } from "@/types";

type Filter = "all" | Extract<MemberStatus, "active" | "pending" | "paused" | "cancelled">;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "paused", label: "Paused" },
  { value: "cancelled", label: "Cancelled" },
];

interface MembersTableProps {
  members: MemberWithPlan[];
}

export function MembersTable({ members }: MembersTableProps) {
  const searchParams = useSearchParams();
  const fromLink = FILTERS.find((option) => option.value === searchParams.get("status"))?.value;
  const [filter, setFilter] = useState<Filter>(fromLink ?? "all");
  const [search, setSearch] = useState("");

  const q = search.toLowerCase().trim();
  const matching = useMemo(
    () =>
      members.filter(
        (m) =>
          !q ||
          `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          (m.plan?.name.toLowerCase().includes(q) ?? false)
      ),
    [members, q]
  );
  const rows = filter === "all" ? matching : matching.filter((m) => m.status === filter);

  const options = FILTERS.map((option) => ({
    ...option,
    count: option.value === "all" ? matching.length : matching.filter((m) => m.status === option.value).length,
  }));

  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-x-4 border-b border-line">
        <FilterTabs label="Filter members by status" options={options} value={filter} onChange={setFilter} />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search members"
          placeholder="Search name, email or plan"
          className="w-full sm:w-64 h-11 px-4 sm:px-3 bg-transparent text-[13px] text-fg border-t sm:border-t-0 sm:border-l border-line focus-visible:-outline-offset-2"
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState title={{ en: "No members match" }} description="Try a different filter or search." />
      ) : (
        <>
          {/* Phone: one compact row per member rather than a squeezed table. */}
          <ul className="md:hidden">
            {rows.map((member) => (
              <li key={member.id} className="border-b border-line">
                <Link href={`/dashboard/members/${member.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-glow">
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{member.first_name} {member.last_name}</p>
                    <p className="text-xs text-fg-3 truncate">{member.plan?.name ?? "No plan"}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <Badge variant={MEMBER_STATUS_VARIANT[member.status]}>{MEMBER_STATUS_LABEL[member.status]}</Badge>
                    {member.plan && <span className="text-xs text-fg-3 tabular-nums">{formatPlanAmount(member.plan)}</span>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <Table caption="Members" minWidth={880}>
              <thead>
                <tr>
                  <Th className="w-12">No.</Th>
                  <Th>Member</Th>
                  <Th>Plan</Th>
                  <Th>Status</Th>
                  <Th>Direct debit</Th>
                  <Th>Next payment</Th>
                  <Th align="right">Amount</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((member, index) => {
                  const mandateState = getMandateBadgeState(member);
                  return (
                    <Tr key={member.id} clickable>
                      <Td className="label">{String(index + 1).padStart(2, "0")}</Td>
                      <Td>
                        <RowLink href={`/dashboard/members/${member.id}`}>{member.first_name} {member.last_name}</RowLink>
                        <p className="text-xs text-fg-3 truncate max-w-56">{member.email}</p>
                      </Td>
                      <Td className="text-fg-2 text-[13px]">{member.plan?.name ?? "—"}</Td>
                      <Td><Badge variant={MEMBER_STATUS_VARIANT[member.status]}>{MEMBER_STATUS_LABEL[member.status]}</Badge></Td>
                      <Td><Badge variant={MANDATE_STATE_VARIANT[mandateState]}>{MANDATE_STATE_LABEL[mandateState]}</Badge></Td>
                      <Td className="text-fg-2 text-[13px] tabular-nums">
                        {member.next_billing_date ? formatDate(member.next_billing_date, { day: "numeric", month: "short" }) : "—"}
                      </Td>
                      <Td align="right" className="text-[13px]">{member.plan ? formatPlanAmount(member.plan) : "—"}</Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </div>

          <p className="label px-4 py-2.5 border-t border-line">{rows.length} of {members.length} members</p>
        </>
      )}
    </Panel>
  );
}
