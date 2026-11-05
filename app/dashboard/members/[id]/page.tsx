import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGym, getMember, getMemberContracts, getMemberPayments, getPlans } from "@/lib/queries";
import { Badge, PageHeader, Panel } from "@/components/ui";
import { MemberStatusActions } from "@/components/dashboard/MemberStatusActions";
import { PaymentsCard } from "@/components/dashboard/PaymentsCard";
import { MembershipCard } from "@/components/dashboard/MembershipCard";
import { ContractActions } from "@/components/dashboard/ContractActions";
import {
  formatDate,
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

  const facts: { label: string; value: React.ReactNode }[] = [
    { label: "Status", value: <Badge variant={MEMBER_STATUS_VARIANT[member.status]}>{MEMBER_STATUS_LABEL[member.status]}</Badge> },
    { label: "Direct debit", value: <Badge variant={MANDATE_STATE_VARIANT[mandateState]}>{MANDATE_STATE_LABEL[mandateState]}</Badge> },
    { label: "Member since", value: formatDate(member.start_date ?? member.created_at) },
    billingDate,
  ];

  return (
    <div>
      <PageHeader
        eyebrow={
          <Link href="/dashboard/members" className="hover:text-fg transition-colors duration-150">
            <span aria-hidden>← </span>All members
          </Link>
        }
        title={`${member.first_name} ${member.last_name}`}
        lede={[member.email, member.phone].filter(Boolean).join(" / ")}
        actions={
          <MemberStatusActions memberId={member.id} gymId={gym.id} currentStatus={member.status} mandateState={mandateState} />
        }
      />

      <div className="seams enter grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-8 min-w-0 bg-bg">
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-line border-b border-line">
            {facts.map((fact) => (
              <div key={fact.label} className="bg-bg px-4 py-3.5 min-w-0">
                <dt className="label">{fact.label}</dt>
                <dd className="mt-1.5 text-[13px]">{fact.value}</dd>
              </div>
            ))}
          </dl>
          <PaymentsCard memberId={member.id} gymId={gym.id} payments={payments} />
        </div>

        <div className="lg:col-span-4 min-w-0 bg-bg">
          <MembershipCard member={member} gymId={gym.id} plans={plans} />

          <Panel title="Contract">
            <div className="p-4 flex flex-col gap-3">
              {latestContract ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-fg-3 text-[13px]">Status</span>
                    <Badge variant={latestContract.status === "signed" ? "success" : "warning"}>
                      {latestContract.status === "signed" ? "Signed" : "Pending signature"}
                    </Badge>
                  </div>
                  {latestContract.signed_at && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-fg-3 text-[13px]">Signed</span>
                      <span className="text-[13px]">{formatDate(latestContract.signed_at)}</span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-fg-3">No contract on file.</p>
              )}
              <ContractActions contract={latestContract} memberId={member.id} gymId={gym.id} layout="stack" />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
