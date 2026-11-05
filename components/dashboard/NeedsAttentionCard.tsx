"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Card, Badge, EmptyState } from "@/components/ui";
import { sendOverdueReminder } from "@/app/actions/reminders";
import { formatCurrency, formatDate } from "@/utils";
import type { FailedPaymentAlert } from "@/types";

interface Props {
  alerts: FailedPaymentAlert[];
  gymId: string;
}

// Shared by the Overview and Billing pages, which previously duplicated
// this block byte-for-byte. Each row is a flex div rather than a whole-row
// <a> (the old shape) since a <button> can't nest inside an <a> — "View"
// and "Send reminder" are now separate, sibling controls.
export function NeedsAttentionCard({ alerts, gymId }: Props) {
  return (
    <Card padding="none">
      <div className="flex items-center gap-2 px-[18px] py-3.5">
        <span className="text-[13px] font-medium">Needs attention</span>
        {alerts.length > 0 && <Badge variant="danger">{alerts.length}</Badge>}
      </div>
      {alerts.length > 0 ? (
        alerts.map((alert) => <AlertRow key={alert.id} alert={alert} gymId={gymId} />)
      ) : (
        <EmptyState title={{ en: "All payments up to date" }} className="py-8" />
      )}
    </Card>
  );
}

function AlertRow({ alert, gymId }: { alert: FailedPaymentAlert; gymId: string }) {
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
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
    <div className="flex items-start gap-3 px-[18px] py-3 border-t border-[#191e1a]">
      <span className="w-[7px] h-[7px] rounded-full bg-[#cf7263] mt-[5px] flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium">Payment failed — {alert.memberName}</div>
        <div className="text-xs text-[#8f978f] mt-[2px] text-pretty">
          {formatCurrency(alert.amount)} charge failed on {formatDate(alert.failedAt, { day: "numeric", month: "short" })}.
        </div>
        {notice && (
          <div className={`text-xs mt-1 ${notice.type === "success" ? "text-[#5fc9a4]" : "text-[#cf9a90]"}`}>
            {notice.message}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 mt-[1px]">
        {alert.memberId && (
          <button
            onClick={handleSendReminder}
            disabled={isPending || !alert.memberEmail}
            className="text-xs text-[#8f978f] hover:text-[#e7eae8] transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? "Sending…" : "Send reminder"}
          </button>
        )}
        <Link
          href={alert.memberId ? `/dashboard/members/${alert.memberId}` : "/dashboard/members"}
          className="text-xs text-[var(--accent)]"
        >
          View
        </Link>
      </div>
    </div>
  );
}
