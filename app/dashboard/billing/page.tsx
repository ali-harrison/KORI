import type { Metadata } from "next";
import {
  getCollectedThisMonth,
  getFailedPaymentAlerts,
  getGym,
  getMandateSummary,
  getRecentSubmissions,
  getUpcomingCharges,
} from "@/lib/queries";
import { Badge, Bilingual, EmptyState, PageHeader, Panel, RowLink, Table, Td, Th, Tr, buttonClass } from "@/components/ui";
import { NeedsAttentionCard } from "@/components/dashboard/NeedsAttentionCard";
import { MandateBreakdown } from "@/components/dashboard/MandateBreakdown";
import { formatCurrency, formatDate } from "@/utils";
import type { SubmissionDaySummary } from "@/types";

export const metadata: Metadata = { title: "Billing" };

const SUBMISSION_STATUS: Record<SubmissionDaySummary["status"], { label: string; variant: "success" | "warning" | "danger" }> = {
  clear: { label: "All succeeded", variant: "success" },
  partial_failures: { label: "Some failed", variant: "warning" },
  all_failed: { label: "All failed", variant: "danger" },
};

export default async function BillingPage() {
  const gym = await getGym();
  const [upcoming, submissions, mandates, alerts, collected] = await Promise.all([
    getUpcomingCharges(gym.id),
    getRecentSubmissions(gym.id),
    getMandateSummary(gym.id),
    getFailedPaymentAlerts(gym.id),
    getCollectedThisMonth(gym.id),
  ]);

  const nextDate = upcoming[0]?.chargeDate;
  const nextBatch = upcoming.filter((charge) => charge.chargeDate === nextDate);
  const collectedTotal = collected.reduce((sum, payment) => sum + payment.amount, 0);
  const upcomingTotal = upcoming.reduce((sum, charge) => sum + charge.amount, 0);

  return (
    <div>
      <PageHeader
        eyebrow={<Bilingual reo="Utu" en="Billing" />}
        title={
          nextDate
            ? `${formatCurrency(nextBatch.reduce((sum, charge) => sum + charge.amount, 0))} goes out ${formatDate(nextDate, { weekday: "long", day: "numeric", month: "long" })}.`
            : "No charges due in the next 14 days."
        }
        lede={nextDate ? `${nextBatch.length} ${nextBatch.length === 1 ? "member" : "members"} on the next run.` : undefined}
      />

      <div className="seams enter grid-cols-1 lg:grid-cols-12">
        <Panel title="Direct debit status" meta={`${mandates.total} members`} className="lg:col-span-4">
          <MandateBreakdown summary={mandates} />
        </Panel>

        <NeedsAttentionCard alerts={alerts} gymId={gym.id} className="lg:col-span-8" />

        <Panel id="due" title="Next charges" meta={upcoming.length > 0 ? `${formatCurrency(upcomingTotal)} over 14 days` : undefined} className="lg:col-span-12">
          {upcoming.length === 0 ? (
            <EmptyState title={{ en: "No charges due in the next 14 days" }} />
          ) : (
            <Table caption="Next charges due" minWidth={520}>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Member</Th>
                  <Th>Plan</Th>
                  <Th align="right">Amount</Th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((charge) => (
                  <Tr key={`${charge.memberId}-${charge.chargeDate}`} clickable>
                    <Td className="label whitespace-nowrap">{formatDate(charge.chargeDate, { day: "numeric", month: "short" })}</Td>
                    <Td><RowLink href={`/dashboard/members/${charge.memberId}`}>{charge.memberName}</RowLink></Td>
                    <Td className="text-fg-2 text-[13px]">{charge.planName}</Td>
                    <Td align="right">{formatCurrency(charge.amount)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>

        <Panel
          id="collected"
          title="Collected this month"
          meta={`${collected.length} payments`}
          action={
            collected.length > 0 ? (
              <a href="/dashboard/billing/export" download className={buttonClass("secondary", "sm")}>Export CSV</a>
            ) : undefined
          }
          className="lg:col-span-12"
        >
          {collected.length === 0 ? (
            <EmptyState title={{ en: "Nothing collected yet this month" }} />
          ) : (
            <Table caption="Payments collected this month" minWidth={600}>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Member</Th>
                  <Th>Method</Th>
                  <Th>Note</Th>
                  <Th align="right">Amount</Th>
                </tr>
              </thead>
              <tbody>
                {collected.map((payment) => (
                  <Tr key={payment.id} clickable={!!payment.memberId}>
                    <Td className="label whitespace-nowrap">{formatDate(payment.paidAt, { day: "numeric", month: "short" })}</Td>
                    <Td>
                      {payment.memberId ? <RowLink href={`/dashboard/members/${payment.memberId}`}>{payment.memberName}</RowLink> : payment.memberName}
                    </Td>
                    <Td className="text-fg-2 text-[13px]">{payment.provider === "gocardless" ? "Direct debit" : "Manual"}</Td>
                    <Td className="text-fg-3 text-[13px]">{payment.note ?? "—"}</Td>
                    <Td align="right">{formatCurrency(payment.amount)}</Td>
                  </Tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" colSpan={4} className="label font-normal text-left px-4 py-3 border-t border-line-strong">Total</th>
                  <td className="px-4 py-3 border-t border-line-strong text-right tabular-nums" data-collected-total>{formatCurrency(collectedTotal)}</td>
                </tr>
              </tfoot>
            </Table>
          )}
        </Panel>

        <Panel title="Collection days" meta="Last 14 days" className="lg:col-span-12">
          <p className="text-xs text-fg-3 px-4 pt-3">Grouped from recorded payments by charge date, not a GoCardless batch report.</p>
          {submissions.length === 0 ? (
            <EmptyState title={{ en: "No submissions in the last 14 days" }} />
          ) : (
            <Table caption="Collection days in the last 14 days" minWidth={560}>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Charges</Th>
                  <Th>Failed</Th>
                  <Th>Result</Th>
                  <Th align="right">Collected</Th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((day) => {
                  const status = SUBMISSION_STATUS[day.status];
                  return (
                    <Tr key={day.date}>
                      <Td className="label whitespace-nowrap">{formatDate(day.date, { day: "numeric", month: "short" })}</Td>
                      <Td className="tabular-nums">{day.chargeCount}</Td>
                      <Td className="tabular-nums">{day.failedCount}</Td>
                      <Td><Badge variant={status.variant}>{status.label}</Badge></Td>
                      <Td align="right">{formatCurrency(day.succeededValue)}</Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Panel>
      </div>
    </div>
  );
}
