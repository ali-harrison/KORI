import { notFound } from "next/navigation";
import { getGym, getMember, getMemberContracts, getMemberPayments } from "@/lib/queries";
import { Header } from "@/components/dashboard/Header";
import { Card, CardTitle, Badge, Button } from "@/components/ui";
import { MemberStatusActions } from "@/components/dashboard/MemberStatusActions";
import { PaymentsCard } from "@/components/dashboard/PaymentsCard";
import { formatDate, formatCurrency, formatBillingIntervalSuffix } from "@/utils";
import type { MemberStatus } from "@/types";

const statusVariant: Record<MemberStatus, "success" | "warning" | "default" | "danger"> = {
  active: "success",
  pending: "warning",
  paused: "default",
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

  return (
    <div>
      <Header
        title={`${member.first_name} ${member.last_name}`}
        description={member.email}
        userEmail={gym.email ?? undefined}
        userInitials={gym.name.slice(0, 2).toUpperCase()}
        actions={
          <MemberStatusActions
            memberId={member.id}
            gymId={gym.id}
            currentStatus={member.status as MemberStatus}
          />
        }
      />

      <div className="px-8 py-7">
        <div className="grid grid-cols-3 gap-5">
          {/* Left — member info */}
          <div className="col-span-2 space-y-5">
            {/* Profile card */}
            <Card>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center flex-shrink-0">
                    <span className="text-base font-semibold text-[#888888]">
                      {member.first_name[0]}{member.last_name[0]}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-sm font-semibold text-[#f5f5f5]">
                      {member.first_name} {member.last_name}
                    </h2>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-[#888888]">{member.email}</span>
                      {member.phone && (
                        <>
                          <span className="text-[#444444]">·</span>
                          <span className="text-xs text-[#888888]">{member.phone}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Badge variant={statusVariant[member.status as MemberStatus]} dot>
                  {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-[rgba(255,255,255,0.06)]">
                {[
                  {
                    label: "Member since",
                    value: formatDate(member.start_date ?? member.created_at),
                  },
                  {
                    label: "Next billing",
                    value: member.next_billing_date
                      ? formatDate(member.next_billing_date)
                      : "—",
                  },
                  {
                    label: "Stripe",
                    value: member.stripe_subscription_id ? "Connected" : "Not linked",
                  },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col gap-1">
                    <span className="text-[10px] text-[#444444] uppercase tracking-wider font-medium">
                      {item.label}
                    </span>
                    <span className="text-xs text-[#f5f5f5]">{item.value}</span>
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
                  <div className="mt-4 p-4 rounded-[6px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]">
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <span className="text-sm font-semibold text-[#f5f5f5]">{member.plan.name}</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-semibold text-[#f5f5f5]">
                            {formatCurrency(member.plan.price)}
                          </span>
                          <span className="text-xs text-[#888888]">
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
                </>
              ) : (
                <div className="mt-4 flex flex-col items-center justify-center py-6 text-center gap-2">
                  <p className="text-xs text-[#444444]">No plan assigned.</p>
                  <Button variant="secondary" size="sm">Assign plan</Button>
                </div>
              )}
            </Card>

            <Card>
              <CardTitle description="Membership agreement">Contract</CardTitle>
              <div className="mt-4 flex flex-col gap-3">
                {latestContract ? (
                  <>
                    <div className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.06)]">
                      <span className="text-xs text-[#888888]">Status</span>
                      <Badge variant={latestContract.status === "signed" ? "success" : "warning"} dot>
                        {latestContract.status === "signed" ? "Signed" : "Pending signature"}
                      </Badge>
                    </div>
                    {latestContract.signed_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#888888]">Signed</span>
                        <span className="text-xs text-[#f5f5f5]">
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
                    <p className="text-xs text-[#444444]">No contract on file.</p>
                    <Button variant="secondary" size="sm">Send contract</Button>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
