import type { Metadata } from "next";
import Link from "next/link";
import { getGym, getDashboardStats, getFailedPaymentAlerts, getRecentActivity, getUpcomingCharges } from "@/lib/queries";
import { StatCard } from "@/components/dashboard/StatCard";
import { NeedsAttentionCard } from "@/components/dashboard/NeedsAttentionCard";
import { Card, EmptyState, Bilingual } from "@/components/ui";
import { formatCurrency, formatDate, formatRelativeDate } from "@/utils";

export const metadata: Metadata = { title: "Overview" };

const UPCOMING_ROWS = 4;

export default async function DashboardPage() {
  const gym = await getGym();
  const [stats, failedPaymentAlerts, activity, upcomingCharges] = await Promise.all([
    getDashboardStats(gym.id),
    getFailedPaymentAlerts(gym.id),
    getRecentActivity(gym.id, 8),
    getUpcomingCharges(gym.id, 7),
  ]);

  const activeShare =
    stats.totalMembers > 0 ? Math.round((stats.activeMembers / stats.totalMembers) * 100) : 0;
  const upcomingTotal = upcomingCharges.reduce((sum, charge) => sum + charge.amount, 0);

  return (
    <div>
      <div className="mb-[22px]">
        <h1 className="text-xl font-medium">
          {gym.name}
        </h1>
        <p className="text-[13px] text-[#8f978f] mt-[3px]">
          {formatDate(new Date(), { weekday: "long", day: "numeric", month: "long" })}
          {gym.address ? ` · ${gym.address}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Active members" value={stats.activeMembers} subtext={`${activeShare}% of all members`} variant="success" />
        <StatCard label="Total members" value={stats.totalMembers} subtext="all time" />
        <StatCard
          label="Revenue this month"
          value={formatCurrency(stats.monthlyRevenue)}
          subtext={stats.revenueIsEstimate ? "estimated from plans" : "collected so far"}
          variant={stats.revenueIsEstimate ? "default" : "success"}
        />
        <StatCard
          label="Failed payments"
          value={stats.failedPayments}
          subtext={stats.failedPayments > 0 ? "needs action" : "all clear"}
          variant={stats.failedPayments > 0 ? "danger" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-3 mt-3 items-start">
        <div className="space-y-3 min-w-0">
          <NeedsAttentionCard alerts={failedPaymentAlerts} gymId={gym.id} />

          <Card padding="none">
            <div className="flex items-center justify-between gap-3 px-[18px] py-3.5">
              <span className="text-[13px] font-medium">Due in the next 7 days</span>
              {upcomingCharges.length > 0 && (
                <span className="text-xs text-[#8f978f] tabular-nums">{formatCurrency(upcomingTotal)} total</span>
              )}
            </div>
            {upcomingCharges.length > 0 ? (
              <>
                {upcomingCharges.slice(0, UPCOMING_ROWS).map((charge) => (
                  <Link
                    key={`${charge.memberId}-${charge.chargeDate}`}
                    href={`/dashboard/members/${charge.memberId}`}
                    className="flex items-center gap-3 px-[18px] py-2.5 border-t border-[#191e1a] hover:bg-[#121613] transition-colors duration-150"
                  >
                    <span className="text-[11px] text-[#59615b] w-[52px] flex-shrink-0 tabular-nums">
                      {formatDate(charge.chargeDate, { day: "numeric", month: "short" })}
                    </span>
                    <span className="text-[12.5px] text-[#b9c0ba] flex-1 min-w-0 truncate">{charge.memberName}</span>
                    <span className="text-[12.5px] tabular-nums">{formatCurrency(charge.amount)}</span>
                  </Link>
                ))}
                {upcomingCharges.length > UPCOMING_ROWS && (
                  <Link
                    href="/dashboard/billing"
                    className="block px-[18px] py-2.5 border-t border-[#191e1a] text-xs text-[var(--accent)]"
                  >
                    {upcomingCharges.length - UPCOMING_ROWS} more on Billing
                  </Link>
                )}
              </>
            ) : (
              <EmptyState title={{ en: "Nothing due this week" }} className="py-8" />
            )}
          </Card>
        </div>

        {/* Recent activity */}
        <Card padding="none">
          <div className="px-[18px] py-3.5 text-[13px] font-medium">
            <Bilingual reo="Ngā mahi tata" en="Recent activity" />
          </div>
          {activity.length > 0 ? (
            activity.map((item) => (
              <div key={item.id} className="flex gap-3 px-[18px] py-2.5 border-t border-[#191e1a]">
                <span className="text-[11px] text-[#59615b] w-[76px] flex-shrink-0 pt-[1px]">
                  {formatRelativeDate(item.timestamp)}
                </span>
                <span className="text-[12.5px] text-[#b9c0ba] text-pretty">{item.text}</span>
              </div>
            ))
          ) : (
            <EmptyState title={{ en: "No activity yet" }} className="py-8" />
          )}
        </Card>
      </div>
    </div>
  );
}
