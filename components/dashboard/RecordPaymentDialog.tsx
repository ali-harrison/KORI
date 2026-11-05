"use client";

import { useState, useTransition } from "react";
import { Bilingual, Button, Dialog, Input } from "@/components/ui";
import { recordPayment } from "@/app/actions/payments";
import { toLocalISODate } from "@/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  memberId: string;
  gymId: string;
  memberName?: string;
  defaultAmount?: number;
}

export function RecordPaymentDialog({ open, onClose, memberId, gymId, memberName, defaultAmount }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function close() {
    setError(null);
    onClose();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get("amount") as string);
    const paidAt = formData.get("paid_at") as string;
    const note = (formData.get("note") as string)?.trim();

    startTransition(async () => {
      const result = await recordPayment(memberId, gymId, { amount, paidAt, note: note || undefined });
      if ("error" in result) {
        setError(result.error);
      } else {
        close();
      }
    });
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      side
      title={memberName ? `Record payment from ${memberName}` : "Record payment"}
      description="Log money received outside GoCardless, like cash or a bank transfer."
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={isPending}>Cancel</Button>
          <Button variant="primary" type="submit" form="record-payment-form" loading={isPending}>
            <Bilingual reo="Tāpirihia he utu" en="Record payment" />
          </Button>
        </>
      }
    >
      <form id="record-payment-form" onSubmit={handleSubmit} className="space-y-4">
        <Input label="Amount (NZD)" name="amount" type="number" placeholder="18" defaultValue={defaultAmount} min="0.01" step="0.01" required />
        <Input label="Date paid" name="paid_at" type="date" defaultValue={toLocalISODate()} required />
        <Input label="Note (optional)" name="note" placeholder="Cash, bank transfer ref #123" />
        {error && <p role="alert" className="text-accent text-[13px]">{error}</p>}
      </form>
    </Dialog>
  );
}
