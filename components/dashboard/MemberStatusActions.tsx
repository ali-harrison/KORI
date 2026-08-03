"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/Modal";
import { updateMemberStatus } from "@/app/actions/members";
import type { MemberStatus } from "@/types";

interface Props {
  memberId: string;
  gymId: string;
  currentStatus: MemberStatus;
}

export function MemberStatusActions({ memberId, gymId, currentStatus }: Props) {
  const [showConfirm, setShowConfirm] = useState<"pause" | "cancel" | "activate" | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    if (!showConfirm) return;
    const newStatus: MemberStatus =
      showConfirm === "pause" ? "paused" :
      showConfirm === "cancel" ? "cancelled" :
      "active";

    startTransition(async () => {
      await updateMemberStatus(memberId, gymId, newStatus);
      setShowConfirm(null);
    });
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
        onClose={() => setShowConfirm(null)}
        onConfirm={handleConfirm}
        title="Pause membership?"
        description="The member's access will be suspended until reactivated. No further charges while paused."
        confirmLabel="Pause membership"
        loading={isPending}
        variant="primary"
      />
      <ConfirmModal
        open={showConfirm === "cancel"}
        onClose={() => setShowConfirm(null)}
        onConfirm={handleConfirm}
        title="Cancel membership?"
        description="This will cancel the member's subscription. This action cannot be easily undone."
        confirmLabel="Cancel membership"
        loading={isPending}
        variant="danger"
      />
      <ConfirmModal
        open={showConfirm === "activate"}
        onClose={() => setShowConfirm(null)}
        onConfirm={handleConfirm}
        title="Reactivate membership?"
        description="This will set the member's status back to active."
        confirmLabel="Reactivate"
        loading={isPending}
        variant="primary"
      />
    </>
  );
}
