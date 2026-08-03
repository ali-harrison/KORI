import { getGym, getDashboardStats, getRecentMembers, getFailedPaymentAlerts } from "@/lib/queries";
import { Header } from "@/components/dashboard/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardHeader, CardTitle, Badge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/utils";
import type { MemberStatus } from "@/types";

const statusVariant: Record<MemberStatus, "success" | "warning" | "default" | "danger"> = {
  active: "success",
  pending: "warning",
  paused: "default",
  cancelled: "danger",
  expired: "danger",
};

export default async function DashboardPage() {
  const gym = await getGym();
  const [stats, recentMembers, failedPaymentAlerts] = await Promise.all([
    getDashboardStats(gym.id),
    getRecentMembers(gym.id, 5),
    getFailedPaymentAlerts(gym.id),
  ]);

  const retentionRate =
    stats.totalMembers > 0
      ? Math.round((stats.activeMembers / stats.totalMembers) * 100)
      : 0;

  return (
    <div>
      <Header
        title="Overview"
        description={gym.name + (gym.address ? ` — ${gym.address}` : "")}
        userEmail={gym.email ?? undefined}
        userInitials={gym.name.slice(0, 2).toUpperCase()}
      />

      <div className="px-8 py-7 space-y-7">
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            label="Total Members"
            value={stats.totalMembers}
            subtext="all time"
            icon={
              <svg viewBox="0 0 16 16" fill="none">
                <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.25" />
                <path d="M2 13c0-2.21 1.79-4 4-4s4 1.79 4 4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                <path d="M11 7.5c1.1.3 2 1.3 2 2.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                <circle cx="12" cy="4.5" r="1.5" stroke="currentColor" strokeWidth="1.25" />
              </svg>
            }
          />
          <StatCard
            label="Active Members"
            value={stats.activeMembers}
            subtext={`${retentionRate}% retention`}
            variant="success"
            icon={
              <svg viewBox="0 0 16 16" fill="none">
                <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          />
          <StatCard
            label="Monthly Revenue"
            value={formatCurrency(stats.monthlyRevenue)}
            subtext="from active members"
            variant="success"
            icon={
              <svg viewBox="0 0 16 16" fill="none">
                <path d="M8 2v12M5.5 4.5C5.5 3.4 6.6 2.5 8 2.5s2.5.9 2.5 2-.9 1.5-2.5 2-2.5.9-2.5 2 1.1 2 2.5 2 2.5-.9 2.5-2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
              </svg>
            }
          />
          <StatCard
            label="Failed Payments"
            value={stats.failedPayments}
            subtext={stats.failedPayments > 0 ? "need attention" : "all clear"}
            variant={stats.failedPayments > 0 ? "danger" : "default"}
            icon={
              <svg viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.25" />
                <path d="M8 5v3M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            }
          />
        </div>

        {/* Bottom grid */}
        <div className="grid grid-cols-3 gap-5">
          {/* Recent members */}
          <div className="col-span-2">
            <Card padding="none">
              <CardHeader className="px-5 pt-5 pb-4">
                <CardTitle description="Most recently added">Recent Members</CardTitle>
                <a
                  href="/dashboard/members"
                  className="text-xs text-[#888888] hover:text-[#f5f5f5] transition-colors duration-150"
                >
                  View all →
                </a>
              </CardHeader>

              {recentMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-xs text-[#444444]">No members yet.</p>
                  <a
                    href="/dashboard/members"
                    className="mt-2 text-xs text-[#888888] hover:text-[#f5f5f5] transition-colors"
                  >
                    Add your first member →
                  </a>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[rgba(255,255,255,0.04)]">
                      {["Member", "Plan", "Joined", "Status"].map((col) => (
                        <th key={col} className="px-5 py-3 text-left text-[10px] font-medium text-[#444444] tracking-wider uppercase">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentMembers.map((member, i) => (
                      <tr
                        key={member.id}
                        className={`group transition-colors duration-100 hover:bg-[rgba(255,255,255,0.02)] ${
                          i !== recentMembers.length - 1 ? "border-b border-[rgba(255,255,255,0.04)]" : ""
                        }`}
                      >
                        <td className="px-5 py-3.5">
                          <a href={`/dashboard/members/${member.id}`} className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center flex-shrink-0">
                              <span className="text-[9px] font-semibold text-[#888888]">
                                {member.first_name[0]}{member.last_name[0]}
                              </span>
                            </div>
                            <span className="text-xs text-[#f5f5f5] font-medium group-hover:text-white transition-colors">
                              {member.first_name} {member.last_name}
                            </span>
                          </a>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs text-[#888888]">
                            {member.plan?.name ?? "—"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs text-[#888888]">
                            {formatDate(member.created_at, { day: "numeric", month: "short" })}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={statusVariant[member.status as MemberStatus]} dot>
                            {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Alerts panel — failed GoCardless payments this billing window.
                Just a signal for the owner to follow up manually; no send
                button here on purpose. */}
            <Card padding="none">
              <CardHeader className="px-5 pt-5 pb-4">
                <CardTitle description="Needs attention">Alerts</CardTitle>
                {failedPaymentAlerts.length > 0 && (
                  <Badge variant="danger">{failedPaymentAlerts.length}</Badge>
                )}
              </CardHeader>

              <div className="p-3 space-y-1">
                {failedPaymentAlerts.length > 0 ? (
                  failedPaymentAlerts.map((alert) => (
                    <a
                      key={alert.id}
                      href={alert.memberId ? `/dashboard/members/${alert.memberId}` : "/dashboard/members"}
                      className="flex gap-3 px-3 py-3 rounded-[6px] hover:bg-[rgba(255,255,255,0.02)] transition-colors duration-150 cursor-pointer group"
                    >
                      <span className="w-5 h-5 rounded-full bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="text-[#ef4444]">
                          <path d="M8 5v3M8 10.5v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.25" />
                        </svg>
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-[#f5f5f5] leading-snug">
                          {alert.memberName} — {formatCurrency(alert.amount)} failed
                        </span>
                        <span className="text-[10px] text-[#444444]">
                          {formatDate(alert.failedAt, { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    </a>
                  ))
                ) : (
                  <div className="flex items-center gap-2 px-3 py-3">
                    <span className="w-5 h-5 rounded-full bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] flex items-center justify-center flex-shrink-0">
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="text-[#10b981]">
                        <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span className="text-xs text-[#888888]">All payments up to date</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Stats bars */}
            <div className="space-y-3 px-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#888888]">Active rate</span>
                <span className="text-xs font-semibold text-[#f5f5f5]">{retentionRate}%</span>
              </div>
              <div className="w-full h-1 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                <div className="h-full bg-[#10b981] rounded-full transition-all" style={{ width: `${retentionRate}%` }} />
              </div>

              {/* Gym status */}
              <div className="flex items-center justify-between pt-3">
                <span className="text-xs text-[#888888]">Subscription</span>
                <Badge variant={gym.subscription_status === "active" ? "success" : "warning"} dot>
                  {gym.subscription_status.charAt(0).toUpperCase() + gym.subscription_status.slice(1)}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-[#888888]">GoCardless</span>
                <Badge variant={gym.gc_organisation_id ? "success" : "warning"} dot>
                  {gym.gc_organisation_id ? "Connected" : "Setup needed"}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
