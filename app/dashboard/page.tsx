import { getGym, getDashboardStats, getFailedPaymentAlerts, getRecentActivity } from "@/lib/queries";
import { StatCard } from "@/components/dashboard/StatCard";
import { NeedsAttentionCard } from "@/components/dashboard/NeedsAttentionCard";
import { Card, EmptyState, Bilingual } from "@/components/ui";
import { formatCurrency, formatDate, formatRelativeDate } from "@/utils";

export default async function DashboardPage() {
  const gym = await getGym();
  const [stats, failedPaymentAlerts, activity] = await Promise.all([
    getDashboardStats(gym.id),
    getFailedPaymentAlerts(gym.id),
    getRecentActivity(gym.id, 6),
  ]);

  const retentionRate =
    stats.totalMembers > 0 ? Math.round((stats.activeMembers / stats.totalMembers) * 100) : 0;

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

      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Active members" value={stats.activeMembers} subtext={`${retentionRate}% retention`} variant="success" />
        <StatCard label="Total members" value={stats.totalMembers} subtext="all time" />
        <StatCard label="Monthly revenue" value={formatCurrency(stats.monthlyRevenue)} subtext="collected this month" variant="success" />
        <StatCard
          label="Failed or retrying"
          value={stats.failedPayments}
          subtext={stats.failedPayments > 0 ? "needs action" : "all clear"}
          variant={stats.failedPayments > 0 ? "danger" : "default"}
        />
      </div>

      <div className="grid grid-cols-[1.5fr_1fr] gap-3 mt-3 items-start">
        <NeedsAttentionCard alerts={failedPaymentAlerts} gymId={gym.id} />

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
