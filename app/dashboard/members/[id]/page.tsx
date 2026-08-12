import { notFound } from "next/navigation";
import { getGym, getMember, getMemberContracts, getMemberPayments } from "@/lib/queries";
import { Card, CardTitle, Badge, Button } from "@/components/ui";
import { MemberStatusActions } from "@/components/dashboard/MemberStatusActions";
import { PaymentsCard } from "@/components/dashboard/PaymentsCard";
import { DirectDebitSetup } from "@/components/dashboard/DirectDebitSetup";
import {
  formatDate,
  formatCurrency,
  formatBillingIntervalSuffix,
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

  const [contracts, payments] = await Promise.all([
    getMemberContracts(member.id),
    getMemberPayments(member.id),
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
        <MemberStatusActions memberId={member.id} gymId={gym.id} currentStatus={member.status as MemberStatus} />
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
          <Card>
            <CardTitle description="Current plan">Membership</CardTitle>
            {member.plan ? (
              <>
                <div className="mt-4 p-4 rounded-[8px] bg-[#0d100e] border border-[#1f2420]">
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                      <span className="text-sm font-medium text-[#e7eae8]">{member.plan.name}</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-medium text-[#e7eae8]">
                          {formatCurrency(member.plan.price)}
                        </span>
                        <span className="text-xs text-[#8f978f]">
                          {member.plan.pricing_model === "recurring"
                            ? `/${formatBillingIntervalSuffix(member.plan.billing_interval)}`
                            : `upfront (${member.plan.term_months} mo)`}
                        </span>
                      </div>
                    </div>
                    <Badge variant="accent">Active</Badge>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="w-full mt-3">Change plan</Button>
                <DirectDebitSetup memberId={member.id} hasMandate={!!member.gc_mandate_id} />
              </>
            ) : (
              <div className="mt-4 flex flex-col items-center justify-center py-6 text-center gap-2">
                <p className="text-xs text-[#646c66]">No plan assigned.</p>
                <Button variant="secondary" size="sm">Assign plan</Button>
              </div>
            )}
          </Card>

          <Card>
            <CardTitle description="Membership agreement">Contract</CardTitle>
            <div className="mt-4 flex flex-col gap-3">
              {latestContract ? (
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
                  {latestContract.pdf_url ? (
                    <Button variant="ghost" size="sm" className="w-full mt-1">View PDF</Button>
                  ) : (
                    <Button variant="ghost" size="sm" className="w-full mt-1">Resend</Button>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
                  <p className="text-xs text-[#646c66]">No contract on file.</p>
                  <Button variant="secondary" size="sm">Send contract</Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
