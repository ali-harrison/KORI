"use client";

import { useState, useTransition } from "react";
import { Button, Card, CardTitle, Badge, Modal } from "@/components/ui";
import { Input } from "@/components/ui/Input";
import { recordPayment } from "@/app/actions/payments";
import { formatCurrency, formatDate } from "@/utils";
import type { Payment, PaymentStatus } from "@/types";

interface Props {
  memberId: string;
  gymId: string;
  payments: Payment[];
}

const STATUS_LABEL: Record<PaymentStatus, string> = {
  succeeded: "Paid",
  pending: "Pending",
  failed: "Failed",
  refunded: "Refunded",
};

const STATUS_VARIANT: Record<PaymentStatus, "success" | "warning" | "danger" | "default"> = {
  succeeded: "success",
  pending: "warning",
  failed: "danger",
  refunded: "default",
};

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export function PaymentsCard({ memberId, gymId, payments }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function closeForm() {
    setShowForm(false);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get("amount") as string);
    const paidAt = formData.get("paid_at") as string;
    const note = (formData.get("note") as string)?.trim();

    startTransition(async () => {
      const result = await recordPayment(memberId, gymId, {
        amount,
        paidAt,
        note: note || undefined,
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        closeForm();
      }
    });
  }

  return (
    <Card padding="none">
      <div className="px-5 pt-5 pb-4 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between">
        <CardTitle description="Billing history">Payments</CardTitle>
        <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
          Record payment
        </Button>
      </div>

      {payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-xs text-[#444444]">No payments recorded yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-[rgba(255,255,255,0.06)]">
          {payments.map((payment) => (
            <div key={payment.id} className="px-5 py-3 flex items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-xs text-[#f5f5f5] font-medium">
                  {formatCurrency(payment.amount)}
                </span>
                <span className="text-[10px] text-[#444444] truncate">
                  {formatDate(payment.paid_at ?? payment.created_at)}
                  {payment.note ? ` · ${payment.note}` : ""}
                </span>
              </div>
              <Badge variant={STATUS_VARIANT[payment.status]} dot className="flex-shrink-0">
                {STATUS_LABEL[payment.status]}
              </Badge>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={closeForm}
        title="Record payment"
        description="Log a payment received outside GoCardless — cash, bank transfer, etc."
        footer={
          <>
            <Button variant="ghost" onClick={closeForm} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="record-payment-form" loading={isPending}>
              Record payment
            </Button>
          </>
        }
      >
        <form id="record-payment-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount (NZD)"
              name="amount"
              type="number"
              placeholder="15"
              min="0.01"
              step="0.01"
              required
              autoFocus
            />
            <Input label="Date paid" name="paid_at" type="date" defaultValue={todayISO()} required />
          </div>
          <Input label="Note (optional)" name="note" placeholder="Cash, bank transfer ref #123" />
          {error && <p className="text-xs text-[#ef4444]">{error}</p>}
        </form>
      </Modal>
    </Card>
  );
}
