"use client";

import { useState, useTransition } from "react";
import { Button, Card, CardTitle, PaymentChip, EmptyState, SlideOver, Bilingual } from "@/components/ui";
import { Input } from "@/components/ui/Input";
import { recordPayment } from "@/app/actions/payments";
import { formatCurrency, formatDate, toLocalISODate } from "@/utils";
import type { Payment } from "@/types";
import type { PaymentChipVariant } from "@/components/ui";

interface Props {
  memberId: string;
  gymId: string;
  payments: Payment[];
}

// No "retried" chip — we don't track GoCardless retry attempts locally, so
// there's no real data to back that state (see PaymentChip's own note).
function paymentDisplay(payment: Payment): { label: string; variant: PaymentChipVariant } {
  if (payment.provider === "manual") return { label: "Manual", variant: "manual" };
  switch (payment.status) {
    case "succeeded":
      return { label: "Collected", variant: "collected" };
    case "failed":
      return { label: "Failed", variant: "failed" };
    case "pending":
      return { label: "Pending", variant: "manual" };
    case "refunded":
      return { label: "Refunded", variant: "manual" };
  }
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
      <div className="px-5 pt-5 pb-4 border-b border-[#1f2420] flex items-center justify-between gap-3">
        <CardTitle description="Billing history">Payments</CardTitle>
        <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
          <Bilingual reo="Tāpirihia he utu" en="Record payment" />
        </Button>
      </div>

      {payments.length === 0 ? (
        <EmptyState title={{ reo: "Kāore anō he utu", en: "No payments yet" }} className="py-8" />
      ) : (
        <div className="divide-y divide-[#191e1a]">
          {payments.map((payment) => {
            const display = paymentDisplay(payment);
            return (
              <div key={payment.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-xs text-[#e7eae8] font-medium">
                    {formatCurrency(payment.amount)}
                  </span>
                  <span className="text-[10px] text-[#646c66] truncate">
                    {formatDate(payment.paid_at ?? payment.created_at)}
                    {payment.note ? ` · ${payment.note}` : ""}
                  </span>
                </div>
                <PaymentChip variant={display.variant} className="flex-shrink-0">
                  {display.label}
                </PaymentChip>
              </div>
            );
          })}
        </div>
      )}

      <SlideOver
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
              <Bilingual reo="Tāpirihia he utu" en="Record payment" />
            </Button>
          </>
        }
      >
        <form id="record-payment-form" onSubmit={handleSubmit} className="space-y-4">
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
          <Input label="Date paid" name="paid_at" type="date" defaultValue={toLocalISODate()} required />
          <Input label="Note (optional)" name="note" placeholder="Cash, bank transfer ref #123" />
          {error && <p className="text-xs text-[#cf9a90]">{error}</p>}
        </form>
      </SlideOver>
    </Card>
  );
}
