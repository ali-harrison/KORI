"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { createMember } from "@/app/actions/members";
import type { Plan } from "@/types";

interface AddMemberModalProps {
  open: boolean;
  onClose: () => void;
  gymId: string;
  plans: Plan[];
}

export function AddMemberModal({ open, onClose, gymId, plans }: AddMemberModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createMember(gymId, formData);
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
      title="Add member"
      description="Manually add a new member to your gym."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button variant="primary" type="submit" form="add-member-form" loading={isPending}>
            Add member
          </Button>
        </>
      }
    >
      <form id="add-member-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="First name" name="first_name" placeholder="Sarah" required autoFocus />
          <Input label="Last name" name="last_name" placeholder="Mitchell" required />
        </div>
        <Input label="Email" name="email" type="email" placeholder="sarah@example.com" required />
        <Input label="Phone" name="phone" type="tel" placeholder="+64 21 000 0000" />
        <Select label="Plan" name="plan_id" options={planOptions} />
        {error && <p className="text-xs text-[#ef4444]">{error}</p>}
      </form>
    </Modal>
  );
}
