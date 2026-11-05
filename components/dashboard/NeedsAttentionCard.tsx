"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button, EmptyState, Panel, buttonClass } from "@/components/ui";
import { RecordPaymentDialog } from "@/components/dashboard/RecordPaymentDialog";
import { sendOverdueReminder } from "@/app/actions/reminders";
import { cn, formatCurrency, formatDate } from "@/utils";
import type { FailedPaymentAlert } from "@/types";

interface Props {
  alerts: FailedPaymentAlert[];
  gymId: string;
  className?: string;
}

// Everything needed to fix a failed payment is on the row, so recovering one
// never means leaving the page.
export function NeedsAttentionCard({ alerts, gymId, className }: Props) {
  const total = alerts.reduce((sum, alert) => sum + alert.amount, 0);

  return (
    <Panel
      id="attention"
      title="Needs attention"
      meta={alerts.length > 0 ? `${alerts.length} / ${formatCurrency(total)}` : undefined}
      className={className}
    >
      {alerts.length > 0 ? (
        <ul>
          {alerts.map((alert) => <AlertRow key={alert.id} alert={alert} gymId={gymId} />)}
        </ul>
      ) : (
        <EmptyState title={{ en: "All payments up to date" }} className="py-12" />
      )}
    </Panel>
  );
}

function AlertRow({ alert, gymId }: { alert: FailedPaymentAlert; gymId: string }) {
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [recording, setRecording] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSendReminder() {
    if (!alert.memberId) return;
    setNotice(null);
    startTransition(async () => {
      const result = await sendOverdueReminder(alert.memberId!, gymId);
      if ("error" in result) {
        setNotice({ type: "error", message: result.error });
      } else {
        setNotice({ type: "success", message: "Sent" });
        setTimeout(() => setNotice(null), 2500);
      }
    });
  }

  return (
    <li className="px-4 py-3.5 border-b border-line last:border-b-0">
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0">
          <span aria-hidden className="inline-block size-1.5 bg-accent align-middle mr-2 -mt-0.5" />
          Payment failed — {alert.memberName}
        </p>
        <p className="tabular-nums flex-shrink-0">{formatCurrency(alert.amount)}</p>
      </div>
      <p className="label mt-1 ml-3.5">Failed {formatDate(alert.failedAt, { day: "numeric", month: "short" })}</p>

      {alert.memberId && (
        <div className="flex flex-wrap items-center gap-2 mt-3 ml-3.5">
          <Button variant="secondary" size="sm" onClick={handleSendReminder} disabled={isPending || !alert.memberEmail}>
            {isPending ? "Sending…" : "Send reminder"}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setRecording(true)}>Record payment</Button>
          <Link href={`/dashboard/members/${alert.memberId}`} className={buttonClass("ghost", "sm")}>View</Link>
        </div>
      )}
      {notice && (
        <p role="status" className={cn("text-xs mt-2 ml-3.5", notice.type === "success" ? "text-ok" : "text-accent")}>{notice.message}</p>
      )}

      {alert.memberId && (
        <RecordPaymentDialog
          open={recording}
          onClose={() => setRecording(false)}
          memberId={alert.memberId}
          gymId={gymId}
          memberName={alert.memberName}
          defaultAmount={alert.amount}
        />
      )}
    </li>
  );
}
