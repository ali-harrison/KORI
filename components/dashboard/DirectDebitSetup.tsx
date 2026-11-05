"use client";

import { useState, useTransition, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui";
import { startBillingForMember } from "@/app/actions/gocardless";

interface Props {
  memberId: string;
  hasMandate: boolean;
}

const ERROR_MESSAGES: Record<string, string> = {
  missing_params: "Invalid response from GoCardless.",
  member_not_found: "Member not found.",
  gym_not_connected: "This gym isn't connected to GoCardless yet — check Settings.",
  fulfil_failed: "Failed to confirm the billing request with GoCardless.",
  identity_mismatch: "GoCardless's response didn't match the expected member.",
  save_failed: "The mandate was created but couldn't be saved — try again or contact support.",
  subscription_failed: "The mandate was set up, but the recurring subscription failed to create.",
  failure: "The bank authorisation was declined.",
  timeout: "The bank authorisation timed out — try again.",
};

export function DirectDebitSetup({ memberId, hasMandate }: Props) {
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("gc_connected") === "1") {
      setNotice({ type: "success", message: "Direct debit set up successfully." });
    } else if (searchParams.get("gc_error")) {
      const code = searchParams.get("gc_error")!;
      setNotice({ type: "error", message: ERROR_MESSAGES[code] ?? "GoCardless setup failed." });
    }
  }, [searchParams]);

  function handleClick() {
    setNotice(null);
    startTransition(async () => {
      // A real success ends in redirect() to GoCardless and never returns
      // here; only an error, or demo mode, gets this far.
      const result = await startBillingForMember(memberId);
      setNotice(
        "error" in result
          ? { type: "error", message: result.error }
          : { type: "success", message: "Direct debit set up successfully." }
      );
    });
  }

  // Outcomes from GoCardless land after the mandate exists, so the notice has
  // to survive past hasMandate turning true — "the subscription failed" is
  // exactly the message that arrives alongside a live mandate.
  if (hasMandate && !notice) return null;

  return (
    <div className="mt-3 space-y-2">
      {!hasMandate && (
        <Button variant="secondary" size="sm" className="w-full" onClick={handleClick} loading={isPending}>
          Set up direct debit
        </Button>
      )}
      {notice && (
        <p role="status" className={`text-xs ${notice.type === "success" ? "text-ok" : "text-accent"}`}>
          {notice.message}
        </p>
      )}
    </div>
  );
}
