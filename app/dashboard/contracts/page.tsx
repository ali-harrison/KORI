import { getGym, getContracts } from "@/lib/queries";
import { Button, DataTable, DataTableRow, EmptyState, Badge } from "@/components/ui";
import { StatCard } from "@/components/dashboard/StatCard";
import { formatDate } from "@/utils";

const GRID = "1.8fr 1.4fr 1fr 1fr 1fr 1fr";

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
        <Button variant="secondary" size="sm">Upload template</Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <StatCard label="Total" value={contracts.length} />
        <StatCard label="Signed" value={signed} variant="success" />
        <StatCard label="Awaiting signature" value={pending} variant="warning" />
      </div>

      {contracts.length === 0 ? (
        <div className="bg-[#111412] border border-[#1f2420] rounded-[10px]">
          <EmptyState
            title={{ en: "No contracts yet" }}
            description="Contracts are created when members sign up."
          />
        </div>
      ) : (
        <DataTable gridTemplateColumns={GRID} headers={["Member", "Plan", "Sent", "Signed", "Status", ""]}>
          {contracts.map((contract) => {
            const member = contract.member as {
              id: string;
              first_name: string;
              last_name: string;
              plan?: { name: string } | null;
            };
            return (
              <DataTableRow key={contract.id} gridTemplateColumns={GRID}>
                <a
                  href={`/dashboard/members/${member.id}`}
                  className="text-[13px] font-medium text-[#e7eae8] hover:text-[var(--accent)] transition-colors duration-150 truncate"
                >
                  {member.first_name} {member.last_name}
                </a>
                <div className="text-[13px] text-[#8f978f] truncate">{member.plan?.name ?? "—"}</div>
                <div className="text-[13px] text-[#8f978f] tabular-nums">
                  {formatDate(contract.created_at, { day: "numeric", month: "short" })}
                </div>
                <div className="text-[13px] text-[#8f978f] tabular-nums">
                  {contract.signed_at ? formatDate(contract.signed_at, { day: "numeric", month: "short" }) : "—"}
                </div>
                <div>
                  <Badge variant={contract.status === "signed" ? "success" : "warning"} dot>
                    {contract.status === "signed" ? "Signed" : "Pending"}
                  </Badge>
                </div>
                <div className="text-right">
                  {contract.status === "pending" && (
                    <Button variant="ghost" size="sm">Resend</Button>
                  )}
                  {contract.status === "signed" && contract.pdf_url && (
                    <a href={contract.pdf_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm">Download</Button>
                    </a>
                  )}
                </div>
              </DataTableRow>
            );
          })}
        </DataTable>
      )}
    </div>
  );
}
