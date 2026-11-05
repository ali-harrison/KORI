"use client";

import { useState, useTransition } from "react";
import { Badge, Button, ConfirmDialog, Dialog, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { createPlan, updatePlan, togglePlanActive, deletePlan } from "@/app/actions/plans";
import { cn, formatCurrency, formatBillingIntervalSuffix } from "@/utils";
import type { Plan } from "@/types";

type PlanWithCount = Plan & { members: number };

interface Props {
  plans: PlanWithCount[];
  gymId: string;
}

export function PlansManager({ plans, gymId }: Props) {
  // One dialog for both: null = closed, "new" = create, a plan = edit it.
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
      <PageHeader
        eyebrow="Plans"
        title={`${plans.filter((plan) => plan.active).length} plans on offer`}
        actions={<Button variant="primary" onClick={() => openForm("new")}>New plan</Button>}
      />

      {toggleError && <p role="alert" className="text-accent text-[13px] mb-3">{toggleError}</p>}

      {/* Borders rather than seams: a part-filled last row must not show the seam colour. */}
      <div className="enter grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 border-t border-l border-line">
        {plans.map((plan, index) => (
          <article key={plan.id} className={cn("group flex flex-col border-r border-b border-line p-5 min-w-0", !plan.active && "bg-sunken")}>
            <div className="flex items-start justify-between gap-3">
              <p className="label">{String(index + 1).padStart(2, "0")}</p>
              <Badge variant={plan.active ? "success" : "muted"}>{plan.active ? "Active" : "Inactive"}</Badge>
            </div>
            <h2 className="text-lg tracking-[-0.02em] mt-3">{plan.name}</h2>
            {plan.description && <p className="text-[13px] text-fg-3 mt-1">{plan.description}</p>}

            <p className="flex items-baseline gap-1.5 mt-6">
              <span className="text-[2.5rem] leading-none tracking-[-0.03em] tabular-nums">{formatCurrency(plan.price)}</span>
              <span className="label">
                {plan.pricing_model === "recurring" ? `/ ${formatBillingIntervalSuffix(plan.billing_interval)}` : `upfront, ${plan.term_months} mo`}
              </span>
            </p>

            <p className="text-fg-2 text-[13px] mt-5 mb-4">
              {plan.members} {plan.members === 1 ? "member" : "members"}
            </p>

            <div className="flex flex-wrap items-center gap-1.5 mt-auto pt-3 border-t border-line">
              <Button variant="ghost" size="sm" onClick={() => openForm(plan)} disabled={isPending}>Edit</Button>
              <Button variant="ghost" size="sm" onClick={() => handleToggle(plan)} disabled={isPending}>
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
          </article>
        ))}
      </div>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={planBeingEdited ? "Edit plan" : "Create plan"}
        description={
          planBeingEdited
            ? "Existing direct debits keep collecting their current amount. Changes here apply to new sign-ups."
            : "Set up a new membership plan for your gym."
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={isPending}>Cancel</Button>
            <Button variant="primary" type="submit" form="plan-form" loading={isPending}>
              {planBeingEdited ? "Save changes" : "Create plan"}
            </Button>
          </>
        }
      >
        <form id="plan-form" onSubmit={handleSubmit} className="space-y-4">
          <Input label="Plan name" name="name" placeholder="Monthly Unlimited" defaultValue={planBeingEdited?.name} required />
          <Textarea label="Description" name="description" placeholder="Full gym access, 24/7" defaultValue={planBeingEdited?.description ?? undefined} />

          <div role="radiogroup" aria-label="Pricing" className="flex border border-line-strong">
            {(["recurring", "paid_in_full"] as const).map((model) => (
              <button
                key={model}
                type="button"
                role="radio"
                aria-checked={pricingModel === model}
                onClick={() => setPricingModel(model)}
                className={cn("flex-1 h-9 text-[13px] transition-colors duration-150 cursor-pointer", pricingModel === model ? "bg-fg text-bg" : "text-fg-2 hover:text-fg")}
              >
                {model === "recurring" ? "Recurring" : "Paid in full"}
              </button>
            ))}
          </div>
          <input type="hidden" name="pricing_model" value={pricingModel} />

          {pricingModel === "recurring" ? (
            <div className="grid grid-cols-2 gap-4">
              <Input label="Price (NZD)" name="price" type="number" placeholder="18" min="0.01" step="0.01" defaultValue={planBeingEdited?.price} required />
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
              <Input label="Total price (NZD)" name="price" type="number" placeholder="799" min="0.01" step="0.01" defaultValue={planBeingEdited?.price} required />
              <Input label="Term (months)" name="term_months" type="number" placeholder="12" min="1" step="1" defaultValue={planBeingEdited?.term_months ?? undefined} required />
            </div>
          )}

          {formError && <p role="alert" className="text-accent text-[13px]">{formError}</p>}
        </form>
      </Dialog>

      <ConfirmDialog
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
