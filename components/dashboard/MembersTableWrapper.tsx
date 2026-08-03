"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { MembersTable } from "./MembersTable";
import { AddMemberModal } from "./AddMemberModal";
import type { MemberWithPlan, Plan } from "@/types";

interface Props {
  members: MemberWithPlan[];
  plans: Plan[];
  gymId: string;
}

export function MembersTableWrapper({ members, plans, gymId }: Props) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <div />
        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
          Add member
        </Button>
      </div>

      <MembersTable
        members={members}
        onAddMember={() => setShowModal(true)}
      />

      <AddMemberModal
        open={showModal}
        onClose={() => setShowModal(false)}
        gymId={gymId}
        plans={plans}
      />
    </>
  );
}
