"use client";

import { useState, useTransition } from "react";
import { Button, Dialog, Select } from "@/components/ui";
import { assignMemberPlan } from "@/app/actions/members";
import type { Plan } from "@/types";

interface ChangePlanModalProps {
  open: boolean;
  onClose: () => void;
  memberId: string;
  gymId: string;
  currentPlanId: string | null;
  plans: Plan[];
  hasSubscription: boolean;
}

export function ChangePlanModal({ open, onClose, memberId, gymId, currentPlanId, plans, hasSubscription }: ChangePlanModalProps) {
  const [planId, setPlanId] = useState(currentPlanId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await assignMemberPlan(memberId, gymId, planId || null);
      if ("error" in result) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  }

  const planOptions = [
    { value: "", label: "No plan assigned" },
    // Their current plan stays selectable even if it's since been deactivated.
    ...plans.filter((p) => p.active || p.id === currentPlanId).map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Change plan"
      description={
        hasSubscription
          ? "Changes the plan shown here. Their GoCardless subscription keeps collecting the old amount until it's changed in GoCardless."
          : "Choose which plan this member is on."
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button variant="primary" onClick={handleConfirm} loading={isPending}>Save</Button>
        </>
      }
    >
      <div className="space-y-3">
        <Select label="Plan" options={planOptions} value={planId} onChange={(e) => setPlanId(e.target.value)} />
        {error && <p role="alert" className="text-accent text-[13px]">{error}</p>}
      </div>
    </Dialog>
  );
}
