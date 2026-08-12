import { Badge, Card } from "@/components/ui";
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
        <h1 className="text-xl font-medium text-[#e7eae8]">
          Hey, {member.first_name}
        </h1>
        <p className="text-sm text-[#8f978f]">
          Here's your membership overview.
        </p>
      </div>

      {/* Membership card */}
      <div className="rounded-[10px] bg-[#111412] border border-[#1f2420] p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <p className="text-xs text-[#8f978f]">Current plan</p>
            <h2 className="text-base font-medium text-[#e7eae8]">{member.plan.name}</h2>
          </div>
          <Badge variant="success" dot>Active</Badge>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#1f2420]">
          {[
            { label: "Member since", value: formatDate(member.start_date, { month: "short", year: "numeric" }) },
            { label: "Next billing", value: formatDate(member.next_billing_date, { day: "numeric", month: "short" }) },
            { label: "Monthly cost", value: formatCurrency(member.plan.price) },
          ].map((item) => (
            <div key={item.label} className="flex flex-col gap-1">
              <span className="text-[10px] text-[#646c66] uppercase tracking-wider font-medium">{item.label}</span>
              <span className="text-sm font-medium text-[#e7eae8]">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <a href="/portal/account">
          <Card hoverable className="h-full">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[7px] bg-[#151a16] border border-[#232823] flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-[#8f978f]">
                  <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.25" />
                  <path d="M2 14c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                </svg>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-[#e7eae8]">My account</span>
                <span className="text-[10px] text-[#646c66]">Update card, pause, cancel</span>
              </div>
            </div>
          </Card>
        </a>
        <Card hoverable>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[7px] bg-[#151a16] border border-[#232823] flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-[#8f978f]">
                <path d="M4 2h6l4 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.25" />
                <path d="M9 2v4h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-[#e7eae8]">My contract</span>
              <span className="text-[10px] text-[#5fc9a4]">Signed</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
