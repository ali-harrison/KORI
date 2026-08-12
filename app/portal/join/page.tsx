"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/utils";
import { cn } from "@/utils";

const plans = [
  { id: "1", name: "Monthly Unlimited", description: "Full gym access, 24/7", price: 89, interval: "monthly" },
  { id: "2", name: "Annual Classic", description: "Best value — save 25%", price: 799, interval: "annual" },
  { id: "3", name: "Casual 10-Pass", description: "Flexible 10-visit pack", price: 120, interval: "monthly" },
];

type Step = "details" | "plan" | "payment";

export default function JoinPage() {
  const [step, setStep] = useState<Step>("details");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const steps: Step[] = ["details", "plan", "payment"];
  const stepIndex = steps.indexOf(step);

  async function handleNext() {
    if (step === "details") setStep("plan");
    else if (step === "plan") setStep("payment");
    else {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 1200));
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Heading */}
      <div className="space-y-1">
        <h1 className="text-xl font-medium text-[#e7eae8]">Join Southerly Strength</h1>
        <p className="text-sm text-[#8f978f]">Complete these steps to activate your membership.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium transition-all duration-150",
                i < stepIndex
                  ? "bg-[#5fc9a4] text-[#0b0d0c]"
                  : i === stepIndex
                  ? "bg-[var(--accent)] text-[#0b0d0c]"
                  : "bg-[#151a16] text-[#646c66]"
              )}
            >
              {i < stepIndex ? (
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={cn(
                "text-xs",
                i === stepIndex ? "text-[#e7eae8] font-medium" : "text-[#646c66]"
              )}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "w-8 h-px mx-1",
                  i < stepIndex ? "bg-[#5fc9a4]" : "bg-[#1f2420]"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      {step === "details" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First name" placeholder="Sarah" required autoFocus />
            <Input label="Last name" placeholder="Mitchell" required />
          </div>
          <Input label="Email" type="email" placeholder="sarah@example.com" required />
          <Input label="Phone" type="tel" placeholder="+64 21 000 0000" />
        </div>
      )}

      {step === "plan" && (
        <div className="space-y-3">
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-[10px] border text-left transition-all duration-150",
                selectedPlan === plan.id
                  ? "bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] border-[color-mix(in_srgb,var(--accent)_25%,transparent)]"
                  : "bg-[#111412] border-[#1f2420] hover:border-[#3a403b] hover:bg-[#141814]"
              )}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-[#e7eae8]">{plan.name}</span>
                <span className="text-xs text-[#8f978f]">{plan.description}</span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <span className="text-base font-medium text-[#e7eae8]">
                    {formatCurrency(plan.price)}
                  </span>
                  <span className="text-xs text-[#8f978f] ml-1">/{plan.interval === "monthly" ? "mo" : "yr"}</span>
                </div>
                {selectedPlan === plan.id && (
                  <div className="w-4 h-4 rounded-full bg-[var(--accent)] flex items-center justify-center flex-shrink-0">
                    <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#0b0d0c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {step === "payment" && (
        <div className="space-y-4">
          <div className="p-4 rounded-[10px] bg-[#0d100e] border border-[#1f2420]">
            <p className="text-xs text-[#8f978f] mb-3">Selected plan</p>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#e7eae8]">
                {plans.find((p) => p.id === selectedPlan)?.name ?? "Monthly Unlimited"}
              </span>
              <span className="text-sm font-medium text-[#e7eae8]">
                {formatCurrency(plans.find((p) => p.id === selectedPlan)?.price ?? 89)}/mo
              </span>
            </div>
          </div>
          {/* GoCardless Billing Request Flow redirects here — see startBillingForMember */}
          <div className="p-4 rounded-[8px] border border-dashed border-[#262b27] text-center">
            <p className="text-xs text-[#646c66]">Direct debit setup redirects to GoCardless here</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        {step !== "details" ? (
          <button
            onClick={() => setStep(steps[stepIndex - 1])}
            className="text-xs text-[#8f978f] hover:text-[#e7eae8] transition-colors"
          >
            ← Back
          </button>
        ) : (
          <div />
        )}
        <Button
          variant="primary"
          size="lg"
          onClick={handleNext}
          loading={loading}
          disabled={step === "plan" && !selectedPlan}
        >
          {step === "payment" ? "Activate membership" : "Continue"}
        </Button>
      </div>
    </div>
  );
}
