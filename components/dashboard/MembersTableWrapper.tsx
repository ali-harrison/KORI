"use client";

import { useState } from "react";
import { Bilingual, Button, PageHeader } from "@/components/ui";
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
  const active = members.filter((member) => member.status === "active").length;

  return (
    <>
      <PageHeader
        eyebrow={<Bilingual reo="Mema" en="Members" />}
        title={`${members.length} members, ${active} active`}
        actions={<Button variant="primary" onClick={() => setShowModal(true)}>Add member</Button>}
      />
      <div className="seams enter grid-cols-1"><MembersTable members={members} /></div>
      <AddMemberModal open={showModal} onClose={() => setShowModal(false)} gymId={gymId} plans={plans} />
    </>
  );
}
