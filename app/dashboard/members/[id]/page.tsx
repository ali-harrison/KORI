import type { Metadata } from "next";
import Link from "next/link";
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
  MEMBER_STATUS_LABEL,
  MEMBER_STATUS_VARIANT,
} from "@/utils";
import type { MemberWithPlan } from "@/types";

export const metadata: Metadata = { title: "Member" };

// Paid-in-full members never have a next charge — when their term runs out is
// the date that matters to the gym instead.
function billingDateDetail(member: MemberWithPlan): { label: string; value: string } {
  if (member.plan?.pricing_model === "paid_in_full" && member.start_date) {
    const paidUntil = new Date(member.start_date);
    paidUntil.setUTCMonth(paidUntil.getUTCMonth() + member.plan.term_months);
    return { label: "Paid until", value: formatDate(paidUntil) };
  }
  return {
    label: "Next billing",
    value: member.next_billing_date ? formatDate(member.next_billing_date) : "—",
  };
}

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
  const billingDate = billingDateDetail(member);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 min-h-7">
        <Link href="/dashboard/members" className="text-xs text-[#8f978f] hover:text-[#e7eae8] transition-colors duration-150">
          ← All members
        </Link>
        <MemberStatusActions
          memberId={member.id}
          gymId={gym.id}
          currentStatus={member.status}
          mandateState={mandateState}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left — member info */}
        <div className="lg:col-span-2 space-y-5 min-w-0">
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-full bg-[#171c18] border border-[#232823] flex items-center justify-center flex-shrink-0">
                  <span className="text-base font-medium text-[#99a19b]">
                    {getInitials(member.first_name, member.last_name)}
                  </span>
                </div>
                <div className="space-y-1 min-w-0">
                  <h1 className="text-lg font-medium text-[#e7eae8] leading-tight">
                    {member.first_name} {member.last_name}
                  </h1>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-x-2">
                    <span className="text-xs text-[#8f978f] break-all">{member.email}</span>
                    {member.phone && (
                      <>
                        <span className="hidden sm:inline text-[#646c66]">·</span>
                        <span className="text-xs text-[#8f978f]">{member.phone}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <Badge variant={MEMBER_STATUS_VARIANT[member.status]} dot className="flex-shrink-0">
                {MEMBER_STATUS_LABEL[member.status]}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-5 border-t border-[#1f2420]">
              {[
                {
                  label: "Member since",
                  value: formatDate(member.start_date ?? member.created_at),
                },
                billingDate,
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
        <div className="space-y-5 min-w-0">
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
