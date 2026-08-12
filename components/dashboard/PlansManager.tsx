"use client";

import { useState, useTransition } from "react";
import { Badge, Button, Modal } from "@/components/ui";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { ConfirmModal } from "@/components/ui/Modal";
import { createPlan, togglePlanActive, deletePlan } from "@/app/actions/plans";
import { formatCurrency, formatBillingIntervalSuffix } from "@/utils";
import type { Plan } from "@/types";

type PlanWithCount = Plan & { members: number };

interface Props {
  plans: PlanWithCount[];
  gymId: string;
}

export function PlansManager({ plans, gymId }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PlanWithCount | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [pricingModel, setPricingModel] = useState<"recurring" | "paid_in_full">("recurring");
  const [isPending, startTransition] = useTransition();

  function closeCreate() {
    setShowCreate(false);
    setCreateError(null);
    setPricingModel("recurring");
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createPlan(gymId, formData);
      if ("error" in result) {
        setCreateError(result.error);
      } else {
        closeCreate();
      }
    });
  }

  function handleToggle(plan: PlanWithCount) {
    startTransition(async () => {
      await togglePlanActive(plan.id, gymId, !plan.active);
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deletePlan(deleteTarget.id, gymId);
      if (!result?.error) setDeleteTarget(null);
    });
  }

  return (
    <>
      <div className="flex items-center gap-2.5 mb-5">
        <span className="text-[17px] font-medium">Plans</span>
        <span className="text-[13px] text-[#646c66]">{plans.length} plans</span>
        <div className="flex-1" />
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
          New plan
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="group relative rounded-[10px] bg-[#111412] border border-[#1f2420] p-5"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex flex-col gap-1 min-w-0">
                <h3 className="text-sm font-medium text-[#e7eae8] truncate">{plan.name}</h3>
                {plan.description && (
                  <p className="text-xs text-[#8f978f] line-clamp-1">{plan.description}</p>
                )}
              </div>
              <Badge variant={plan.active ? "success" : "muted"} dot className="ml-3 flex-shrink-0">
                {plan.active ? "Active" : "Inactive"}
              </Badge>
            </div>

            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-2xl font-medium text-[#e7eae8] tracking-tight">
                {formatCurrency(plan.price)}
              </span>
              <span className="text-xs text-[#8f978f]">
                {plan.pricing_model === "recurring"
                  ? `/${formatBillingIntervalSuffix(plan.billing_interval)}`
                  : "upfront"}
              </span>
            </div>
            <p className="text-[10px] text-[#646c66] mb-4 h-3.5">
              {plan.pricing_model === "paid_in_full" ? `${plan.term_months}-month term, paid in full` : ""}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-[#1f2420]">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[#8f978f]">{plan.members}</span>
                <span className="text-xs text-[#646c66]">
                  {plan.members === 1 ? "member" : "members"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggle(plan)}
                  disabled={isPending}
                >
                  {plan.active ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteTarget(plan)}
                  disabled={isPending}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ))}

        {/* Ghost add card */}
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-[10px] border border-dashed border-[#262b27] p-5 flex flex-col items-center justify-center gap-2 text-[#646c66] hover:border-[#3a403b] hover:text-[#8f978f] hover:bg-[#111412] transition-all duration-150 min-h-[140px]"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.25" />
            <path d="M10 6v8M6 10h8" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
          </svg>
          <span className="text-xs font-medium">New plan</span>
        </button>
      </div>

      {/* Create modal */}
      <Modal
        open={showCreate}
        onClose={closeCreate}
        title="Create plan"
        description="Set up a new membership plan for your gym."
        footer={
          <>
            <Button variant="ghost" onClick={closeCreate} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="create-plan-form" loading={isPending}>
              Create plan
            </Button>
          </>
        }
      >
        <form id="create-plan-form" onSubmit={handleCreate} className="space-y-4">
          <Input label="Plan name" name="name" placeholder="Monthly Unlimited" required autoFocus />
          <Textarea label="Description" name="description" placeholder="Full gym access, 24/7" />

          <div className="flex items-center gap-1.5 p-1 rounded-[7px] bg-[#0d100e] border border-[#1f2420]">
            {(["recurring", "paid_in_full"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPricingModel(m)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-[5px] transition-all duration-150 ${
                  pricingModel === m
                    ? "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)]"
                    : "text-[#8f978f] hover:text-[#e7eae8]"
                }`}
              >
                {m === "recurring" ? "Recurring" : "Paid in full"}
              </button>
            ))}
          </div>
          <input type="hidden" name="pricing_model" value={pricingModel} />

          {pricingModel === "recurring" ? (
            <div className="grid grid-cols-2 gap-4">
              <Input label="Price (NZD)" name="price" type="number" placeholder="15" min="0.01" step="0.01" required />
              <Select
                label="Billing interval"
                name="billing_interval"
                options={[
                  { value: "weekly", label: "Weekly" },
                  { value: "monthly", label: "Monthly" },
                  { value: "annual", label: "Annual" },
                ]}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Input label="Total price (NZD)" name="price" type="number" placeholder="799" min="0.01" step="0.01" required />
              <Input label="Term (months)" name="term_months" type="number" placeholder="12" min="1" step="1" required />
            </div>
          )}

          {createError && <p className="text-xs text-[#cf9a90]">{createError}</p>}
        </form>
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Delete "${deleteTarget?.name}"?`}
        description={
          deleteTarget?.members
            ? `${deleteTarget.members} member${deleteTarget.members > 1 ? "s" : ""} are on this plan. Remove them first.`
            : "This plan will be permanently deleted."
        }
        confirmLabel="Delete plan"
        loading={isPending}
        variant="danger"
      />
    </>
  );
}
