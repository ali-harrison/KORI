"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { assignMemberPlan } from "@/app/actions/members";
import type { Plan } from "@/types";

interface ChangePlanModalProps {
  open: boolean;
  onClose: () => void;
  memberId: string;
  gymId: string;
  currentPlanId: string | null;
  plans: Plan[];
}

export function ChangePlanModal({ open, onClose, memberId, gymId, currentPlanId, plans }: ChangePlanModalProps) {
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
    ...plans.map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Change plan"
      description="Update which plan this member is billed on."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button variant="primary" onClick={handleConfirm} loading={isPending}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Select label="Plan" options={planOptions} value={planId} onChange={(e) => setPlanId(e.target.value)} />
        {error && <p className="text-xs text-[#cf7263]">{error}</p>}
      </div>
    </Modal>
  );
}
