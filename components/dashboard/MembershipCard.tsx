"use client";

import { useState } from "react";
import { Card, CardTitle, Badge, Button } from "@/components/ui";
import { DirectDebitSetup } from "@/components/dashboard/DirectDebitSetup";
import { ChangePlanModal } from "@/components/dashboard/ChangePlanModal";
import { formatCurrency, formatBillingIntervalSuffix } from "@/utils";
import type { MemberWithPlan, Plan } from "@/types";

interface Props {
  member: MemberWithPlan;
  gymId: string;
  plans: Plan[];
}

export function MembershipCard({ member, gymId, plans }: Props) {
  const [showChangePlan, setShowChangePlan] = useState(false);

  return (
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
          <Button variant="ghost" size="sm" className="w-full mt-3" onClick={() => setShowChangePlan(true)}>
            Change plan
          </Button>
          <DirectDebitSetup memberId={member.id} hasMandate={!!member.gc_mandate_id} />
        </>
      ) : (
        <div className="mt-4 flex flex-col items-center justify-center py-6 text-center gap-2">
          <p className="text-xs text-[#646c66]">No plan assigned.</p>
          <Button variant="secondary" size="sm" onClick={() => setShowChangePlan(true)}>
            Assign plan
          </Button>
        </div>
      )}

      <ChangePlanModal
        open={showChangePlan}
        onClose={() => setShowChangePlan(false)}
        memberId={member.id}
        gymId={gymId}
        currentPlanId={member.plan_id}
        plans={plans}
      />
    </Card>
  );
}
