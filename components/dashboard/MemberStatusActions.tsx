"use client";

import { useState, useTransition } from "react";
import { Badge, Button, ConfirmDialog } from "@/components/ui";
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
    return <Badge variant={MANDATE_STATE_VARIANT.cancelling}>{MANDATE_STATE_LABEL.cancelling}</Badge>;
  }

  const hasLiveMandate = mandateState === "active" || mandateState === "pending" || mandateState === "on_hold";
  const membershipOver = currentStatus === "cancelled" || currentStatus === "expired";
  const isPendingMember = currentStatus === "pending";

  return (
    <>
      <div className="flex items-center gap-2">
        {currentStatus === "active" && (
          <Button variant="ghost" size="sm" onClick={() => setShowConfirm("pause")}>
            Pause
          </Button>
        )}
        {isPendingMember && (
          <Button variant="secondary" size="sm" onClick={() => setShowConfirm("activate")}>
            Activate
          </Button>
        )}
        {(currentStatus === "paused" || membershipOver) && (
          <Button variant="secondary" size="sm" onClick={() => setShowConfirm("activate")}>
            Reactivate
          </Button>
        )}
        {!membershipOver && (
          <Button variant="danger" size="sm" onClick={() => setShowConfirm("cancel")}>
            Cancel
          </Button>
        )}
      </div>

      {/* Pausing only changes our own status — it doesn't touch GoCardless, so
          this must never promise that charges stop. */}
      <ConfirmDialog
        open={showConfirm === "pause"}
        onClose={closeConfirm}
        onConfirm={handleConfirm}
        title="Pause membership?"
        description={
          hasLiveMandate
            ? "Marks them as paused here, but their GoCardless direct debit keeps collecting. To stop payments, cancel the membership or pause the subscription in GoCardless."
            : "Marks the membership as paused until you reactivate it."
        }
        confirmLabel="Pause membership"
        loading={isPending}
        variant="primary"
        error={error}
      />
      <ConfirmDialog
        open={showConfirm === "cancel"}
        onClose={closeConfirm}
        onConfirm={handleConfirm}
        title="Cancel membership?"
        description={
          hasLiveMandate
            ? "This cancels the member's GoCardless subscription and mandate — they will not be charged again. This action cannot be easily undone."
            : "Marks the membership as cancelled. They're not on direct debit, so there's nothing to stop."
        }
        confirmLabel="Cancel membership"
        loading={isPending}
        variant="danger"
        error={error}
      />
      <ConfirmDialog
        open={showConfirm === "activate"}
        onClose={closeConfirm}
        onConfirm={handleConfirm}
        title={isPendingMember ? "Activate membership?" : "Reactivate membership?"}
        description={
          isPendingMember
            ? "Marks the membership as active — use this for members paying by cash or bank transfer. Direct debit members activate on their own when their first payment confirms."
            : hasLiveMandate
              ? "Sets the member back to active. Their existing direct debit carries on as normal."
              : "Sets the member back to active but doesn't restore billing. Set up a new direct debit from their Membership card, or record payments manually."
        }
        confirmLabel={isPendingMember ? "Activate" : "Reactivate"}
        loading={isPending}
        variant="primary"
        error={error}
      />
    </>
  );
}
