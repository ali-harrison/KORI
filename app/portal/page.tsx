import { Badge, Card, CardHeader, CardTitle, Button } from "@/components/ui";
import { formatDate, formatCurrency } from "@/utils";

// Placeholder — replace with real member data from Supabase session
const member = {
  first_name: "Sarah",
  last_name: "Mitchell",
  email: "sarah@example.com",
  status: "active" as const,
  plan: { name: "Monthly Unlimited", price: 89 },
  next_billing_date: "2024-02-10",
  start_date: "2024-01-10",
};

export default function PortalPage() {
  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-[#f5f5f5]">
          Hey, {member.first_name} 👋
        </h1>
        <p className="text-sm text-[#888888]">
          Here's your membership overview.
        </p>
      </div>

      {/* Membership card */}
      <div className="rounded-[10px] bg-[#111111] border border-[rgba(255,255,255,0.06)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <p className="text-xs text-[#888888]">Current plan</p>
            <h2 className="text-base font-semibold text-[#f5f5f5]">{member.plan.name}</h2>
          </div>
          <Badge variant="success" dot>Active</Badge>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
          {[
            { label: "Member since", value: formatDate(member.start_date, { month: "short", year: "numeric" }) },
            { label: "Next billing", value: formatDate(member.next_billing_date, { day: "numeric", month: "short" }) },
            { label: "Monthly cost", value: formatCurrency(member.plan.price) },
          ].map((item) => (
            <div key={item.label} className="flex flex-col gap-1">
              <span className="text-[10px] text-[#444444] uppercase tracking-wider font-medium">{item.label}</span>
              <span className="text-sm font-medium text-[#f5f5f5]">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <a href="/portal/account">
          <Card hoverable className="h-full">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[6px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-[#888888]">
                  <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.25" />
                  <path d="M2 14c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                </svg>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-[#f5f5f5]">My account</span>
                <span className="text-[10px] text-[#444444]">Update card, pause, cancel</span>
              </div>
            </div>
          </Card>
        </a>
        <Card hoverable>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[6px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-[#888888]">
                <path d="M4 2h6l4 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.25" />
                <path d="M9 2v4h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-[#f5f5f5]">My contract</span>
              <span className="text-[10px] text-[#10b981]">Signed</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
