"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmModal } from "@/components/ui/Modal";
import { updateMemberStatus, cancelMember } from "@/app/actions/members";
import { MANDATE_STATE_LABEL, MANDATE_STATE_VARIANT } from "@/utils";
import type { MemberStatus, MandateBadgeState } from "@/types";

interface Props {
  memberId: string;
  gymId: string;
  currentStatus: MemberStatus;
  mandateState: MandateBadgeState;
}

export function MemberStatusActions({ memberId, gymId, currentStatus, mandateState }: Props) {
  const [showConfirm, setShowConfirm] = useState<"pause" | "cancel" | "activate" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function closeConfirm() {
    setShowConfirm(null);
    setError(null);
  }

  function handleConfirm() {
    if (!showConfirm) return;
    setError(null);

    startTransition(async () => {
      const result =
        showConfirm === "cancel"
          ? await cancelMember(memberId, gymId)
          : await updateMemberStatus(memberId, gymId, showConfirm === "pause" ? "paused" : "active");

      if ("error" in result) {
        setError(result.error);
        return;
      }
      setShowConfirm(null);
    });
  }

  // A cancellation is already in flight at GoCardless — the confirming
  // webhook hasn't landed yet. Don't offer Pause/Reactivate/Cancel while
  // that's unresolved: another click here could double-fire the cancel
  // call, and none of these actions make sense mid-teardown.
  if (mandateState === "cancelling") {
    return <Badge variant={MANDATE_STATE_VARIANT.cancelling} dot>{MANDATE_STATE_LABEL.cancelling}</Badge>;
  }

  if (currentStatus === "cancelled" || currentStatus === "expired") {
    return (
      <Button variant="secondary" size="sm" onClick={() => setShowConfirm("activate")}>
        Reactivate
      </Button>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {currentStatus === "active" && (
          <Button variant="ghost" size="sm" onClick={() => setShowConfirm("pause")}>
            Pause
          </Button>
        )}
        {currentStatus === "paused" && (
          <Button variant="secondary" size="sm" onClick={() => setShowConfirm("activate")}>
            Reactivate
          </Button>
        )}
        <Button variant="danger" size="sm" onClick={() => setShowConfirm("cancel")}>
          Cancel
        </Button>
      </div>

      <ConfirmModal
        open={showConfirm === "pause"}
        onClose={closeConfirm}
        onConfirm={handleConfirm}
        title="Pause membership?"
        description="The member's access will be suspended until reactivated. No further charges while paused."
        confirmLabel="Pause membership"
        loading={isPending}
        variant="primary"
        error={error}
      />
      <ConfirmModal
        open={showConfirm === "cancel"}
        onClose={closeConfirm}
        onConfirm={handleConfirm}
        title="Cancel membership?"
        description="This cancels the member's GoCardless subscription and mandate — they will not be charged again. This action cannot be easily undone."
        confirmLabel="Cancel membership"
        loading={isPending}
        variant="danger"
        error={error}
      />
      <ConfirmModal
        open={showConfirm === "activate"}
        onClose={closeConfirm}
        onConfirm={handleConfirm}
        title="Reactivate membership?"
        description="This sets the member's status back to active but does not restore billing. If they don't already have a live GoCardless mandate, send them a new billing request separately."
        confirmLabel="Reactivate"
        loading={isPending}
        variant="primary"
        error={error}
      />
    </>
  );
}
