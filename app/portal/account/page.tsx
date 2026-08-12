"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, Badge, Button } from "@/components/ui";
import { Input } from "@/components/ui/Input";
import { ConfirmModal } from "@/components/ui/Modal";
import { formatDate, formatCurrency } from "@/utils";

const member = {
  first_name: "Sarah",
  last_name: "Mitchell",
  email: "sarah@example.com",
  phone: "+64 21 555 1234",
  status: "active" as const,
  plan: { name: "Monthly Unlimited", price: 89 },
  next_billing_date: "2024-02-10",
};

export default function AccountPage() {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  async function handleCancel() {
    setCancelling(true);
    await new Promise((r) => setTimeout(r, 1000));
    setCancelling(false);
    setShowCancelModal(false);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-medium text-[#e7eae8]">My Account</h1>
        <p className="text-sm text-[#8f978f]">Manage your membership and billing.</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader className="pb-5 mb-5">
          <CardTitle description="Your contact details">Profile</CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First name" defaultValue={member.first_name} />
            <Input label="Last name" defaultValue={member.last_name} />
          </div>
          <Input label="Email" defaultValue={member.email} type="email" />
          <Input label="Phone" defaultValue={member.phone} type="tel" />
          <div className="flex justify-end pt-1">
            <Button variant="secondary" size="sm">Save changes</Button>
          </div>
        </div>
      </Card>

      {/* Membership */}
      <Card>
        <CardHeader className="pb-5 mb-5">
          <CardTitle description="Your current plan">Membership</CardTitle>
          <Badge variant="success" dot>Active</Badge>
        </CardHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-[8px] bg-[#0d100e] border border-[#1f2420]">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-[#e7eae8]">{member.plan.name}</span>
              <span className="text-xs text-[#8f978f]">
                Next billing {formatDate(member.next_billing_date, { day: "numeric", month: "long" })}
              </span>
            </div>
            <span className="text-base font-medium text-[#e7eae8]">
              {formatCurrency(member.plan.price)}<span className="text-xs text-[#8f978f] font-normal">/mo</span>
            </span>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowPauseModal(true)}
            >
              Pause membership
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowCancelModal(true)}
            >
              Cancel membership
            </Button>
          </div>
        </div>
      </Card>

      {/* Payment */}
      <Card>
        <CardHeader className="pb-5 mb-5">
          <CardTitle description="Your saved payment method">Billing</CardTitle>
        </CardHeader>
        <div className="flex items-center justify-between p-4 rounded-[8px] bg-[#0d100e] border border-[#1f2420]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-5 rounded-[4px] bg-[#151a16] border border-[#232823] flex items-center justify-center">
              <span className="text-[8px] font-medium text-[#8f978f]">VISA</span>
            </div>
            <span className="text-xs text-[#8f978f]">•••• •••• •••• 4242</span>
          </div>
          <Button variant="ghost" size="sm">Update card</Button>
        </div>
      </Card>

      {/* Modals */}
      <ConfirmModal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancel}
        title="Cancel membership?"
        description="Your membership will remain active until the end of your current billing period. This cannot be undone."
        confirmLabel="Yes, cancel"
        loading={cancelling}
        variant="danger"
      />
      <ConfirmModal
        open={showPauseModal}
        onClose={() => setShowPauseModal(false)}
        onConfirm={() => setShowPauseModal(false)}
        title="Pause membership?"
        description="Your membership will be paused at the end of your current billing period. You can resume anytime."
        confirmLabel="Pause membership"
        variant="primary"
      />
    </div>
  );
}
