import type { Metadata } from "next";
import Link from "next/link";
import { getGym, getContracts } from "@/lib/queries";
import { Badge, EmptyState, PageHeader, Panel, Table, Td, Th, Tr, buttonClass } from "@/components/ui";
import { ContractActions } from "@/components/dashboard/ContractActions";
import { formatDate } from "@/utils";

export const metadata: Metadata = { title: "Contracts" };

export default async function ContractsPage() {
  const gym = await getGym();
  const contracts = await getContracts(gym.id);

  const signed = contracts.filter((c) => c.status === "signed").length;
  const pending = contracts.filter((c) => c.status === "pending").length;

  return (
    <div>
      <PageHeader
        eyebrow="Contracts"
        title={`${signed} signed, ${pending} waiting on a signature`}
        actions={<Link href="/dashboard/settings#contract-template" className={buttonClass("secondary")}>Edit template</Link>}
      />

      <div className="seams enter grid-cols-1">
        <Panel>
          {contracts.length === 0 ? (
            <EmptyState title={{ en: "No contracts yet" }} description="Send one from a member's profile and it'll show up here." />
          ) : (
            <Table caption="Contracts" minWidth={860}>
              <thead>
                <tr>
                  <Th>Member</Th>
                  <Th>Plan</Th>
                  <Th>Sent</Th>
                  <Th>Signed</Th>
                  <Th>Status</Th>
                  <Th><span className="sr-only">Actions</span></Th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => {
                  const member = contract.member as {
                    id: string;
                    first_name: string;
                    last_name: string;
                    plan?: { name: string } | null;
                  };
                  return (
                    <Tr key={contract.id}>
                      <Td>
                        <Link href={`/dashboard/members/${member.id}`} className="hover:text-accent transition-colors duration-150">
                          {member.first_name} {member.last_name}
                        </Link>
                      </Td>
                      <Td className="text-fg-2 text-[13px]">{member.plan?.name ?? "—"}</Td>
                      <Td className="label whitespace-nowrap">{formatDate(contract.last_sent_at ?? contract.created_at, { day: "numeric", month: "short" })}</Td>
                      <Td className="label whitespace-nowrap">{contract.signed_at ? formatDate(contract.signed_at, { day: "numeric", month: "short" }) : "—"}</Td>
                      <Td>
                        <Badge variant={contract.status === "signed" ? "success" : "warning"}>
                          {contract.status === "signed" ? "Signed" : "Pending"}
                        </Badge>
                      </Td>
                      <Td><ContractActions contract={contract} memberId={member.id} gymId={gym.id} /></Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Panel>
      </div>
    </div>
  );
}
