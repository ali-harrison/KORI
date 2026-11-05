"use client";

import { useState, useTransition } from "react";
import { Badge, Button, Modal } from "@/components/ui";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { ConfirmModal } from "@/components/ui/Modal";
import { createPlan, updatePlan, togglePlanActive, deletePlan } from "@/app/actions/plans";
import { formatCurrency, formatBillingIntervalSuffix } from "@/utils";
import type { Plan } from "@/types";

type PlanWithCount = Plan & { members: number };

interface Props {
  plans: PlanWithCount[];
  gymId: string;
}

export function PlansManager({ plans, gymId }: Props) {
  // One modal for both: null = closed, "new" = create, a plan = edit it.
  const [editing, setEditing] = useState<PlanWithCount | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlanWithCount | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [pricingModel, setPricingModel] = useState<"recurring" | "paid_in_full">("recurring");
  const [isPending, startTransition] = useTransition();

  const planBeingEdited = editing && editing !== "new" ? editing : null;

  function openForm(target: PlanWithCount | "new") {
    setEditing(target);
    setFormError(null);
    setPricingModel(target === "new" ? "recurring" : target.pricing_model);
  }

  function closeDelete() {
    setDeleteTarget(null);
    setDeleteError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = planBeingEdited
        ? await updatePlan(planBeingEdited.id, gymId, formData)
        : await createPlan(gymId, formData);
      if ("error" in result) {
        setFormError(result.error);
      } else {
        setEditing(null);
      }
    });
  }

  function handleToggle(plan: PlanWithCount) {
    setToggleError(null);
    startTransition(async () => {
      const result = await togglePlanActive(plan.id, gymId, !plan.active);
      if ("error" in result) setToggleError(result.error);
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    startTransition(async () => {
      const result = await deletePlan(deleteTarget.id, gymId);
      if ("error" in result) {
        setDeleteError(result.error);
      } else {
        setDeleteTarget(null);
      }
    });
  }

  return (
    <>
      <div className="flex items-center gap-2.5 mb-5">
        <span className="text-[17px] font-medium">Plans</span>
        <span className="text-[13px] text-[#646c66]">{plans.length} plans</span>
        <div className="flex-1" />
        <Button variant="primary" size="sm" onClick={() => openForm("new")}>
          New plan
        </Button>
      </div>

      {toggleError && <p className="text-xs text-[#cf9a90] mb-3">{toggleError}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              {/* Reveal-on-hover only where hover exists: on touch screens these
                  would otherwise be invisible and unreachable. */}
              <div className="flex items-center gap-1.5 transition-opacity duration-150 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100">
                <Button variant="ghost" size="sm" onClick={() => openForm(plan)} disabled={isPending}>
                  Edit
                </Button>
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
                  onClick={() => {
                    setDeleteError(null);
                    setDeleteTarget(plan);
                  }}
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
          onClick={() => openForm("new")}
          className="rounded-[10px] border border-dashed border-[#262b27] p-5 flex flex-col items-center justify-center gap-2 text-[#646c66] hover:border-[#3a403b] hover:text-[#8f978f] hover:bg-[#111412] transition-all duration-150 min-h-[140px]"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.25" />
            <path d="M10 6v8M6 10h8" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
          </svg>
          <span className="text-xs font-medium">New plan</span>
        </button>
      </div>

      {/* Create / edit modal */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={planBeingEdited ? "Edit plan" : "Create plan"}
        description={
          planBeingEdited
            ? "Existing direct debits keep collecting their current amount — changes here apply to new sign-ups."
            : "Set up a new membership plan for your gym."
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="plan-form" loading={isPending}>
              {planBeingEdited ? "Save changes" : "Create plan"}
            </Button>
          </>
        }
      >
        <form id="plan-form" onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Plan name"
            name="name"
            placeholder="Monthly Unlimited"
            defaultValue={planBeingEdited?.name}
            required
            autoFocus
          />
          <Textarea
            label="Description"
            name="description"
            placeholder="Full gym access, 24/7"
            defaultValue={planBeingEdited?.description ?? undefined}
          />

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
              <Input
                label="Price (NZD)"
                name="price"
                type="number"
                placeholder="18"
                min="0.01"
                step="0.01"
                defaultValue={planBeingEdited?.price}
                required
              />
              <Select
                label="Billing interval"
                name="billing_interval"
                defaultValue={planBeingEdited?.billing_interval ?? "weekly"}
                options={[
                  { value: "weekly", label: "Weekly" },
                  { value: "monthly", label: "Monthly" },
                  { value: "annual", label: "Annual" },
                ]}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Total price (NZD)"
                name="price"
                type="number"
                placeholder="799"
                min="0.01"
                step="0.01"
                defaultValue={planBeingEdited?.price}
                required
              />
              <Input
                label="Term (months)"
                name="term_months"
                type="number"
                placeholder="12"
                min="1"
                step="1"
                defaultValue={planBeingEdited?.term_months ?? undefined}
                required
              />
            </div>
          )}

          {formError && <p className="text-xs text-[#cf9a90]">{formError}</p>}
        </form>
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={closeDelete}
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
        error={deleteError}
      />
    </>
  );
}
