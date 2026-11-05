"use client";

import { useState } from "react";
import { Badge, Button, Panel } from "@/components/ui";
import { DirectDebitSetup } from "@/components/dashboard/DirectDebitSetup";
import { ChangePlanModal } from "@/components/dashboard/ChangePlanModal";
import { formatCurrency, formatBillingIntervalSuffix, MEMBER_STATUS_LABEL, MEMBER_STATUS_VARIANT } from "@/utils";
import type { MemberWithPlan, Plan } from "@/types";

interface Props {
  member: MemberWithPlan;
  gymId: string;
  plans: Plan[];
}

export function MembershipCard({ member, gymId, plans }: Props) {
  const [showChangePlan, setShowChangePlan] = useState(false);

  return (
    <Panel title="Membership" className="border-b border-line">
      <div className="p-4">
        {member.plan ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0">{member.plan.name}</p>
              <Badge variant={MEMBER_STATUS_VARIANT[member.status]}>{MEMBER_STATUS_LABEL[member.status]}</Badge>
            </div>
            <p className="mt-3 flex items-baseline gap-1.5">
              <span className="text-3xl leading-none tracking-[-0.03em] tabular-nums">{formatCurrency(member.plan.price)}</span>
              <span className="label">
                {member.plan.pricing_model === "recurring"
                  ? `/ ${formatBillingIntervalSuffix(member.plan.billing_interval)}`
                  : `upfront, ${member.plan.term_months} mo`}
              </span>
            </p>
            <Button size="sm" className="w-full mt-4" onClick={() => setShowChangePlan(true)}>Change plan</Button>
            <DirectDebitSetup memberId={member.id} hasMandate={!!member.gc_mandate_id} />
          </>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="text-fg-3">No plan assigned.</p>
            <Button size="sm" onClick={() => setShowChangePlan(true)}>Assign plan</Button>
          </div>
        )}
      </div>

      <ChangePlanModal
        key={String(showChangePlan)}
        open={showChangePlan}
        onClose={() => setShowChangePlan(false)}
        memberId={member.id}
        gymId={gymId}
        currentPlanId={member.plan_id}
        plans={plans}
        hasSubscription={!!member.gc_subscription_id}
      />
    </Panel>
  );
}
