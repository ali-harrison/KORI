import type { Metadata } from "next";
import {
  getGym,
  getUpcomingCharges,
  getRecentSubmissions,
  getMandateSummary,
  getFailedPaymentAlerts,
} from "@/lib/queries";
import { Card, CardTitle, Badge, DataTable, DataTableRow, EmptyState, MandateBar } from "@/components/ui";
import { NeedsAttentionCard } from "@/components/dashboard/NeedsAttentionCard";
import { formatCurrency, formatDate } from "@/utils";
import type { SubmissionDaySummary } from "@/types";

export const metadata: Metadata = { title: "Billing" };

const SUBMISSION_STATUS: Record<SubmissionDaySummary["status"], { label: string; variant: "success" | "warning" | "danger" }> = {
  clear: { label: "All succeeded", variant: "success" },
  partial_failures: { label: "Some failed", variant: "warning" },
  all_failed: { label: "All failed", variant: "danger" },
};

const CHARGES_GRID = "minmax(0,2fr) minmax(0,1.6fr) minmax(0,1fr) minmax(0,1fr)";
const SUBMISSIONS_GRID = "minmax(0,1.2fr) minmax(0,0.9fr) minmax(0,1fr) minmax(0,0.9fr) minmax(0,1.4fr)";

export default async function BillingPage() {
  const gym = await getGym();
  const [upcomingCharges, recentSubmissions, mandateSummary, failedPaymentAlerts] = await Promise.all([
    getUpcomingCharges(gym.id),
    getRecentSubmissions(gym.id),
    getMandateSummary(gym.id),
    getFailedPaymentAlerts(gym.id),
  ]);

  const nextCharge = upcomingCharges[0] ?? null;

  return (
    <div>
      <div className="mb-[22px]">
        <h1 className="text-xl font-medium">
          {nextCharge
            ? `Next charge due ${formatDate(nextCharge.chargeDate, { weekday: "long", day: "numeric", month: "short" })}`
            : "No upcoming charges"}
        </h1>
        <p className="text-[13px] text-[#8f978f] mt-[3px]">
          {nextCharge ? `${nextCharge.memberName} · ${formatCurrency(nextCharge.amount)}` : "Nothing due in the next 14 days."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-3 items-start">
        <Card>
          <CardTitle description="By member, all time">Mandate status</CardTitle>
          <MandateBar summary={mandateSummary} />
        </Card>

        <NeedsAttentionCard alerts={failedPaymentAlerts} gymId={gym.id} />
      </div>

      <div className="mt-5">
        <h2 className="text-[15px] font-medium mb-3">Next charges due</h2>
        {upcomingCharges.length === 0 ? (
          <div className="bg-[#111412] border border-[#1f2420] rounded-[10px]">
            <EmptyState title={{ en: "No charges due in the next 14 days" }} />
          </div>
        ) : (
          <DataTable gridTemplateColumns={CHARGES_GRID} minWidth={520} headers={["Member", "Plan", "Amount", "Charge date"]}>
            {upcomingCharges.map((charge) => (
              <DataTableRow
                key={`${charge.memberId}-${charge.chargeDate}`}
                gridTemplateColumns={CHARGES_GRID}
                href={`/dashboard/members/${charge.memberId}`}
              >
                <div className="text-[13px] font-medium truncate">{charge.memberName}</div>
                <div className="text-[13px] text-[#b9c0ba] truncate">{charge.planName}</div>
                <div className="text-[13px] tabular-nums">{formatCurrency(charge.amount)}</div>
                <div className="text-[13px] text-[#b9c0ba] tabular-nums">
                  {formatDate(charge.chargeDate, { day: "numeric", month: "short" })}
                </div>
              </DataTableRow>
            ))}
          </DataTable>
        )}
      </div>

      <div className="mt-5">
        <h2 className="text-[15px] font-medium mb-3">Recent submissions</h2>
        <p className="text-xs text-[#646c66] -mt-2 mb-3">
          Grouped from recorded payments by charge date — not a direct GoCardless batch report.
        </p>
        {recentSubmissions.length === 0 ? (
          <div className="bg-[#111412] border border-[#1f2420] rounded-[10px]">
            <EmptyState title={{ en: "No submissions in the last 14 days" }} />
          </div>
        ) : (
          <DataTable
            gridTemplateColumns={SUBMISSIONS_GRID}
            minWidth={560}
            headers={["Date", "Charges", "Succeeded", "Failed", "Status"]}
          >
            {recentSubmissions.map((day) => {
              const status = SUBMISSION_STATUS[day.status];
              return (
                <DataTableRow key={day.date} gridTemplateColumns={SUBMISSIONS_GRID}>
                  <div className="text-[13px] tabular-nums">{formatDate(day.date, { day: "numeric", month: "short" })}</div>
                  <div className="text-[13px] tabular-nums">{day.chargeCount}</div>
                  <div className="text-[13px] tabular-nums">
                    {day.succeededCount} · {formatCurrency(day.succeededValue)}
                  </div>
                  <div className="text-[13px] tabular-nums">{day.failedCount}</div>
                  <div>
                    <Badge variant={status.variant} dot>{status.label}</Badge>
                  </div>
                </DataTableRow>
              );
            })}
          </DataTable>
        )}
      </div>
    </div>
  );
}
