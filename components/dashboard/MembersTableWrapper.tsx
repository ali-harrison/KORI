"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { MembersTable } from "./MembersTable";
import { AddMemberModal } from "./AddMemberModal";
import { useThemeSettings } from "@/components/providers/ThemeSettingsProvider";
import type { MemberWithPlan, Plan } from "@/types";

interface Props {
  members: MemberWithPlan[];
  plans: Plan[];
  gymId: string;
}

export function MembersTableWrapper({ members, plans, gymId }: Props) {
  const [showModal, setShowModal] = useState(false);
  const { bilingual } = useThemeSettings();

  return (
    <>
      <div className="flex items-center gap-2.5 mb-4">
        <span className="text-[17px] font-medium">{bilingual ? "Mema" : "Members"}</span>
        <span className="text-[13px] text-[#646c66]">{members.length} members</span>
        <div className="flex-1" />
        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
          Add member
        </Button>
      </div>

      <MembersTable members={members} />

      {/* Keyed so reopening starts clean, with no error left from last time. */}
      <AddMemberModal
        key={String(showModal)}
        open={showModal}
        onClose={() => setShowModal(false)}
        gymId={gymId}
        plans={plans}
      />
    </>
  );
}
