"use client";

import { useState } from "react";
import { Badge, Bilingual, Button, EmptyState, Panel, Table, Td, Th, Tr } from "@/components/ui";
import { RecordPaymentDialog } from "@/components/dashboard/RecordPaymentDialog";
import { formatCurrency, formatDate } from "@/utils";
import type { Payment } from "@/types";

interface Props {
  memberId: string;
  gymId: string;
  payments: Payment[];
}

// No "retried" state: we don't track GoCardless retry attempts locally, so
// there's no real data to back one.
function paymentDisplay(payment: Payment): { label: string; variant: "success" | "danger" | "default" | "warning" | "muted" } {
  if (payment.provider === "manual") return { label: "Manual", variant: "default" };
  switch (payment.status) {
    case "succeeded":
      return { label: "Collected", variant: "success" };
    case "failed":
      return { label: "Failed", variant: "danger" };
    case "pending":
      return { label: "Pending", variant: "warning" };
    case "refunded":
      return { label: "Refunded", variant: "muted" };
  }
}

export function PaymentsCard({ memberId, gymId, payments }: Props) {
  const [showForm, setShowForm] = useState(false);

  return (
    <Panel
      title="Payments"
      meta={payments.length > 0 ? String(payments.length) : undefined}
      action={
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Bilingual reo="Tāpirihia he utu" en="Record payment" />
        </Button>
      }
    >
      {payments.length === 0 ? (
        <EmptyState title={{ reo: "Kāore anō he utu", en: "No payments yet" }} className="py-12" />
      ) : (
        <Table caption="Payment history">
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Status</Th>
              <Th className="hidden sm:table-cell">Note</Th>
              <Th align="right">Amount</Th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => {
              const display = paymentDisplay(payment);
              return (
                <Tr key={payment.id}>
                  <Td className="text-fg-2 text-[13px] tabular-nums whitespace-nowrap">{formatDate(payment.paid_at ?? payment.created_at)}</Td>
                  <Td><Badge variant={display.variant}>{display.label}</Badge></Td>
                  <Td className="hidden sm:table-cell text-fg-3 text-[13px]">{payment.note ?? "—"}</Td>
                  <Td align="right">{formatCurrency(payment.amount)}</Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}

      <RecordPaymentDialog open={showForm} onClose={() => setShowForm(false)} memberId={memberId} gymId={gymId} />
    </Panel>
  );
}
