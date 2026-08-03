"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
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
        <h1 className="text-xl font-semibold text-[#f5f5f5]">Join Southerly Strength</h1>
        <p className="text-sm text-[#888888]">Complete these steps to activate your membership.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold transition-all duration-150",
                i < stepIndex
                  ? "bg-[#10b981] text-white"
                  : i === stepIndex
                  ? "bg-[#e8ff47] text-[#0c0c0c]"
                  : "bg-[rgba(255,255,255,0.06)] text-[#444444]"
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
                i === stepIndex ? "text-[#f5f5f5] font-medium" : "text-[#444444]"
              )}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "w-8 h-px mx-1",
                  i < stepIndex ? "bg-[#10b981]" : "bg-[rgba(255,255,255,0.08)]"
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
                "w-full flex items-center justify-between p-4 rounded-[8px] border text-left transition-all duration-150",
                selectedPlan === plan.id
                  ? "bg-[rgba(232,255,71,0.06)] border-[rgba(232,255,71,0.2)]"
                  : "bg-[#111111] border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] hover:bg-[#141414]"
              )}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-[#f5f5f5]">{plan.name}</span>
                <span className="text-xs text-[#888888]">{plan.description}</span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <span className="text-base font-semibold text-[#f5f5f5]">
                    {formatCurrency(plan.price)}
                  </span>
                  <span className="text-xs text-[#888888] ml-1">/{plan.interval === "monthly" ? "mo" : "yr"}</span>
                </div>
                {selectedPlan === plan.id && (
                  <div className="w-4 h-4 rounded-full bg-[#e8ff47] flex items-center justify-center flex-shrink-0">
                    <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#0c0c0c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
          <div className="p-4 rounded-[8px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]">
            <p className="text-xs text-[#888888] mb-3">Selected plan</p>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#f5f5f5]">
                {plans.find((p) => p.id === selectedPlan)?.name ?? "Monthly Unlimited"}
              </span>
              <span className="text-sm font-semibold text-[#f5f5f5]">
                {formatCurrency(plans.find((p) => p.id === selectedPlan)?.price ?? 89)}/mo
              </span>
            </div>
          </div>
          {/* Stripe Elements would mount here */}
          <div className="p-4 rounded-[6px] border border-dashed border-[rgba(255,255,255,0.08)] text-center">
            <p className="text-xs text-[#444444]">Stripe Elements mounts here</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        {step !== "details" ? (
          <button
            onClick={() => setStep(steps[stepIndex - 1])}
            className="text-xs text-[#888888] hover:text-[#f5f5f5] transition-colors"
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
