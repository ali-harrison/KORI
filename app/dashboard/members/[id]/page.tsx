import { notFound } from "next/navigation";
import { getGym, getMember, getMemberContracts, getMemberPayments, getPlans } from "@/lib/queries";
import { Card, CardTitle, Badge } from "@/components/ui";
import { MemberStatusActions } from "@/components/dashboard/MemberStatusActions";
import { PaymentsCard } from "@/components/dashboard/PaymentsCard";
import { MembershipCard } from "@/components/dashboard/MembershipCard";
import { ContractActions } from "@/components/dashboard/ContractActions";
import {
  formatDate,
  getInitials,
  getMandateBadgeState,
  MANDATE_STATE_LABEL,
  MANDATE_STATE_VARIANT,
} from "@/utils";
import type { MemberStatus } from "@/types";

const statusVariant: Record<MemberStatus, "success" | "warning" | "muted" | "danger"> = {
  active: "success",
  pending: "warning",
  paused: "muted",
  cancelled: "danger",
  expired: "danger",
};

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const gym = await getGym();
  const member = await getMember(id, gym.id);

  if (!member) notFound();

  const [contracts, payments, plans] = await Promise.all([
    getMemberContracts(member.id),
    getMemberPayments(member.id),
    getPlans(gym.id),
  ]);
  const latestContract = contracts[0] ?? null;
  const mandateState = getMandateBadgeState(member);

  return (
    <div>
      <div className="flex items-start justify-between mb-[22px] gap-4">
        <div>
          <h1 className="text-xl font-medium">
            {member.first_name} {member.last_name}
          </h1>
          <p className="text-[13px] text-[#8f978f] mt-[3px]">{member.email}</p>
        </div>
        <MemberStatusActions
          memberId={member.id}
          gymId={gym.id}
          currentStatus={member.status as MemberStatus}
          mandateState={mandateState}
        />
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Left — member info */}
        <div className="col-span-2 space-y-5">
          <Card>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#171c18] border border-[#232823] flex items-center justify-center flex-shrink-0">
                  <span className="text-base font-medium text-[#99a19b]">
                    {getInitials(member.first_name, member.last_name)}
                  </span>
                </div>
                <div className="space-y-1">
                  <h2 className="text-sm font-medium text-[#e7eae8]">
                    {member.first_name} {member.last_name}
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-[#8f978f]">{member.email}</span>
                    {member.phone && (
                      <>
                        <span className="text-[#646c66]">·</span>
                        <span className="text-xs text-[#8f978f]">{member.phone}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <Badge variant={statusVariant[member.status as MemberStatus]} dot>
                {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-[#1f2420]">
              {[
                {
                  label: "Member since",
                  value: formatDate(member.start_date ?? member.created_at),
                },
                {
                  label: "Next billing",
                  value: member.next_billing_date ? formatDate(member.next_billing_date) : "—",
                },
                {
                  label: "Direct debit",
                  value: <Badge variant={MANDATE_STATE_VARIANT[mandateState]} dot>{MANDATE_STATE_LABEL[mandateState]}</Badge>,
                },
              ].map((item) => (
                <div key={item.label} className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-[#646c66] uppercase tracking-wider font-medium">
                    {item.label}
                  </span>
                  <span className="text-xs text-[#e7eae8]">{item.value}</span>
                </div>
              ))}
            </div>
          </Card>

          <PaymentsCard memberId={member.id} gymId={gym.id} payments={payments} />
        </div>

        {/* Right — plan + contract */}
        <div className="space-y-5">
          <MembershipCard member={member} gymId={gym.id} plans={plans} />

          <Card>
            <CardTitle description="Membership agreement">Contract</CardTitle>
            <div className="mt-4 flex flex-col gap-3">
              {latestContract && (
                <>
                  <div className="flex items-center justify-between py-2 border-b border-[#1f2420]">
                    <span className="text-xs text-[#8f978f]">Status</span>
                    <Badge variant={latestContract.status === "signed" ? "success" : "warning"} dot>
                      {latestContract.status === "signed" ? "Signed" : "Pending signature"}
                    </Badge>
                  </div>
                  {latestContract.signed_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#8f978f]">Signed</span>
                      <span className="text-xs text-[#e7eae8]">
                        {formatDate(latestContract.signed_at)}
                      </span>
                    </div>
                  )}
                </>
              )}
              {!latestContract && <p className="text-xs text-[#646c66] text-center py-2">No contract on file.</p>}
              <ContractActions contract={latestContract} memberId={member.id} gymId={gym.id} layout="stack" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
