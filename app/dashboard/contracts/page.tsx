import type { Metadata } from "next";
import Link from "next/link";
import { getGym, getContracts } from "@/lib/queries";
import { DataTable, DataTableRow, EmptyState, Badge } from "@/components/ui";
import { StatCard } from "@/components/dashboard/StatCard";
import { ContractActions } from "@/components/dashboard/ContractActions";
import { formatDate } from "@/utils";

export const metadata: Metadata = { title: "Contracts" };

// The last column fits the widest row: Resend, Mark as signed and Download.
const GRID = "minmax(0,1.5fr) minmax(0,1.4fr) 64px 64px 96px 280px";

export default async function ContractsPage() {
  const gym = await getGym();
  const contracts = await getContracts(gym.id);

  const signed = contracts.filter((c) => c.status === "signed").length;
  const pending = contracts.filter((c) => c.status === "pending").length;

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-5">
        <span className="text-[17px] font-medium">Contracts</span>
        <span className="text-[13px] text-[#646c66]">{contracts.length} total</span>
        <div className="flex-1" />
        <Link href="/dashboard/settings#contract-template" className="text-xs text-[var(--accent)] hover:opacity-80 transition-opacity duration-150">
          Edit template
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-5">
        <StatCard label="Total" value={contracts.length} />
        <StatCard label="Signed" value={signed} variant="success" />
        <StatCard label="Awaiting signature" value={pending} variant="warning" />
      </div>

      {contracts.length === 0 ? (
        <div className="bg-[#111412] border border-[#1f2420] rounded-[10px]">
          <EmptyState
            title={{ en: "No contracts yet" }}
            description="Send one from a member's profile and it'll show up here."
          />
        </div>
      ) : (
        <DataTable gridTemplateColumns={GRID} minWidth={860} headers={["Member", "Plan", "Sent", "Signed", "Status", ""]}>
          {contracts.map((contract) => {
            const member = contract.member as {
              id: string;
              first_name: string;
              last_name: string;
              plan?: { name: string } | null;
            };
            return (
              <DataTableRow key={contract.id} gridTemplateColumns={GRID}>
                <Link
                  href={`/dashboard/members/${member.id}`}
                  className="text-[13px] font-medium text-[#e7eae8] hover:text-[var(--accent)] transition-colors duration-150 truncate"
                >
                  {member.first_name} {member.last_name}
                </Link>
                <div className="text-[13px] text-[#8f978f] truncate">{member.plan?.name ?? "—"}</div>
                <div className="text-[13px] text-[#8f978f] tabular-nums">
                  {formatDate(contract.last_sent_at ?? contract.created_at, { day: "numeric", month: "short" })}
                </div>
                <div className="text-[13px] text-[#8f978f] tabular-nums">
                  {contract.signed_at ? formatDate(contract.signed_at, { day: "numeric", month: "short" }) : "—"}
                </div>
                <div>
                  <Badge variant={contract.status === "signed" ? "success" : "warning"} dot>
                    {contract.status === "signed" ? "Signed" : "Pending"}
                  </Badge>
                </div>
                <ContractActions contract={contract} memberId={member.id} gymId={gym.id} />
              </DataTableRow>
            );
          })}
        </DataTable>
      )}
    </div>
  );
}
