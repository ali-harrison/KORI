import type { Metadata } from "next";
import Link from "next/link";
import { getGym, getDashboardStats, getFailedPaymentAlerts, getRecentActivity, getRevenueSeries, getUpcomingCharges } from "@/lib/queries";
import { paceAgainstLastMonth } from "@/lib/reporting";
import { NeedsAttentionCard } from "@/components/dashboard/NeedsAttentionCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { Stat } from "@/components/dashboard/Stat";
import { Bilingual, EmptyState, PageHeader, Panel, RowLink, Table, Td, Th, Tr } from "@/components/ui";
import { formatCurrency, formatDate, formatRelativeDate } from "@/utils";

export const metadata: Metadata = { title: "Overview" };

const UPCOMING_ROWS = 5;

function paceNote(pace: number | null): string {
  if (pace === null) return "collected so far";
  if (pace === 0) return "level with last month";
  return `${Math.abs(pace)}% ${pace > 0 ? "ahead of" : "behind"} last month at this point`;
}

export default async function DashboardPage() {
  const gym = await getGym();
  const [stats, alerts, activity, upcoming, series] = await Promise.all([
    getDashboardStats(gym.id),
    getFailedPaymentAlerts(gym.id),
    getRecentActivity(gym.id, 7),
    getUpcomingCharges(gym.id, 7),
    getRevenueSeries(gym.id),
  ]);

  const dueTotal = upcoming.reduce((sum, charge) => sum + charge.amount, 0);
  const atRisk = alerts.reduce((sum, alert) => sum + alert.amount, 0);
  const hasRevenue = series.current.some(Boolean) || series.previous.some(Boolean);

  return (
    <div>
      {/* The state of the gym in a sentence, before any tile asks to be read. */}
      <PageHeader
        eyebrow={
          <>
            <Bilingual reo="Tirohanga whānui" en="Overview" /> / {formatDate(new Date(), { weekday: "long", day: "numeric", month: "long" })}
          </>
        }
        title={
          <>
            {alerts.length > 0 ? (
              <span className="text-accent">
                {alerts.length === 1 ? "1 payment needs you." : `${alerts.length} payments need you.`}
              </span>
            ) : (
              "Nothing needs you right now."
            )}{" "}
            {formatCurrency(stats.monthlyRevenue)} {stats.revenueIsEstimate ? "estimated" : "collected"} this month, {formatCurrency(dueTotal)} due this week.
          </>
        }
      />

      {/* Two independent columns, each filling its height, so neither leaves a
          hole however many alerts or charges there are. On a phone the right one
          comes first: what needs doing beats how it's going. */}
      <div className="seams enter grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-8 lg:order-1 flex flex-col gap-px bg-line min-w-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px">
            <Stat
              label="Collected this month"
              value={formatCurrency(stats.monthlyRevenue)}
              note={stats.revenueIsEstimate ? "estimated from plans" : paceNote(paceAgainstLastMonth(series))}
              href="/dashboard/billing#collected"
            />
            <Stat label="Due in 7 days" value={formatCurrency(dueTotal)} note={`${upcoming.length} ${upcoming.length === 1 ? "charge" : "charges"}`} href="/dashboard/billing#due" />
            <Stat
              label="Failed payments"
              value={stats.failedPayments}
              note={stats.failedPayments > 0 ? `${formatCurrency(atRisk)} at risk` : "all clear"}
              href="/dashboard/billing#attention"
              attention={stats.failedPayments > 0}
            />
            <Stat label="Active members" value={stats.activeMembers} note={`of ${stats.totalMembers} members`} href="/dashboard/members?status=active" />
          </div>

          <Panel title="Collected by day">
            {hasRevenue ? <RevenueChart series={series} /> : <EmptyState title={{ en: "No payments yet" }} className="py-16" />}
          </Panel>

          <Panel title={<Bilingual reo="Ngā mahi tata" en="Recent activity" />} className="flex-1">
            {activity.length > 0 ? (
              <ul>
                {activity.map((item) => (
                  <li key={item.id} className="flex gap-4 px-4 py-3 border-b border-line last:border-b-0">
                    <span className="label w-24 flex-shrink-0 pt-px">{formatRelativeDate(item.timestamp)}</span>
                    <span className="text-[13px] text-fg-2 min-w-0 text-pretty">{item.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title={{ en: "No activity yet" }} className="py-12" />
            )}
          </Panel>
        </div>

        <div className="lg:col-span-4 lg:order-2 -order-1 flex flex-col gap-px bg-line min-w-0">
          <NeedsAttentionCard alerts={alerts} gymId={gym.id} />

          <Panel title="Due in the next 7 days" meta={upcoming.length > 0 ? `${formatCurrency(dueTotal)} total` : undefined} className="flex-1">
            {upcoming.length > 0 ? (
              <>
                <Table caption="Charges due in the next 7 days">
                  <thead>
                    <tr>
                      <Th className="w-20">Date</Th>
                      <Th>Member</Th>
                      <Th align="right">Amount</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcoming.slice(0, UPCOMING_ROWS).map((charge) => (
                      <Tr key={`${charge.memberId}-${charge.chargeDate}`} clickable>
                        <Td className="label whitespace-nowrap">{formatDate(charge.chargeDate, { day: "numeric", month: "short" })}</Td>
                        <Td><RowLink href={`/dashboard/members/${charge.memberId}`}>{charge.memberName}</RowLink></Td>
                        <Td align="right">{formatCurrency(charge.amount)}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
                {upcoming.length > UPCOMING_ROWS && (
                  <Link href="/dashboard/billing#due" className="label block px-4 py-2.5 border-t border-line hover:text-fg transition-colors duration-150">
                    {upcoming.length - UPCOMING_ROWS} more on Billing
                  </Link>
                )}
              </>
            ) : (
              <EmptyState title={{ en: "Nothing due this week" }} className="py-12" />
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
