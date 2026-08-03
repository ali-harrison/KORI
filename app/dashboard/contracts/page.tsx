import { getGym, getContracts } from "@/lib/queries";
import { Header } from "@/components/dashboard/Header";
import { Card, CardHeader, CardTitle, Badge, Button } from "@/components/ui";
import { formatDate } from "@/utils";

export default async function ContractsPage() {
  const gym = await getGym();
  const contracts = await getContracts(gym.id);

  const signed = contracts.filter((c) => c.status === "signed").length;
  const pending = contracts.filter((c) => c.status === "pending").length;

  return (
    <div>
      <Header
        title="Contracts"
        description="Membership agreements"
        userEmail={gym.email ?? undefined}
        userInitials={gym.name.slice(0, 2).toUpperCase()}
        actions={
          <Button variant="secondary" size="sm">Upload template</Button>
        }
      />

      <div className="px-8 py-7 space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total", value: contracts.length, variant: "default" as const },
            { label: "Signed", value: signed, variant: "success" as const },
            { label: "Awaiting signature", value: pending, variant: "warning" as const },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-[8px] bg-[#111111] border border-[rgba(255,255,255,0.06)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] px-5 py-4 flex items-center justify-between"
            >
              <span className="text-xs text-[#888888]">{stat.label}</span>
              <span
                className={`text-xl font-semibold ${
                  stat.variant === "success"
                    ? "text-[#10b981]"
                    : stat.variant === "warning"
                    ? "text-[#f59e0b]"
                    : "text-[#f5f5f5]"
                }`}
              >
                {stat.value}
              </span>
            </div>
          ))}
        </div>

        {/* Table */}
        <Card padding="none">
          <CardHeader className="px-5 pt-5 pb-4">
            <CardTitle description="All membership agreements">Contracts</CardTitle>
          </CardHeader>

          {contracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-xs text-[#444444]">No contracts yet.</p>
              <p className="text-[10px] text-[#444444] mt-1">
                Contracts are created when members sign up.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.04)]">
                  {["Member", "Plan", "Sent", "Signed", "Status", ""].map((col) => (
                    <th
                      key={col}
                      className="px-5 py-3 text-left text-[10px] font-medium text-[#444444] tracking-wider uppercase"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract, i) => {
                  const member = contract.member as {
                    id: string;
                    first_name: string;
                    last_name: string;
                    plan?: { name: string } | null;
                  };
                  return (
                    <tr
                      key={contract.id}
                      className={`group transition-colors hover:bg-[rgba(255,255,255,0.02)] ${
                        i !== contracts.length - 1 ? "border-b border-[rgba(255,255,255,0.04)]" : ""
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <a
                          href={`/dashboard/members/${member.id}`}
                          className="text-xs text-[#f5f5f5] font-medium hover:text-white transition-colors"
                        >
                          {member.first_name} {member.last_name}
                        </a>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-[#888888]">
                          {member.plan?.name ?? "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-[#888888]">
                          {formatDate(contract.created_at, { day: "numeric", month: "short" })}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-[#888888]">
                          {contract.signed_at
                            ? formatDate(contract.signed_at, { day: "numeric", month: "short" })
                            : "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge
                          variant={contract.status === "signed" ? "success" : "warning"}
                          dot
                        >
                          {contract.status === "signed" ? "Signed" : "Pending"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          {contract.status === "pending" && (
                            <Button variant="ghost" size="sm">Resend</Button>
                          )}
                          {contract.status === "signed" && contract.pdf_url && (
                            <a href={contract.pdf_url} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="sm">Download</Button>
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
