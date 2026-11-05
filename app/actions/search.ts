"use server";

import { getGym, getMembers, requireSession } from "@/lib/queries";
import { MEMBER_STATUS_LABEL } from "@/utils";

export interface SearchMember {
  id: string;
  name: string;
  email: string;
  detail: string;
}

// Feeds the command palette. Fetched when the palette opens rather than on
// every page, so it costs nothing until someone uses it.
export async function getSearchMembers(): Promise<SearchMember[]> {
  await requireSession();
  const gym = await getGym();
  const members = await getMembers(gym.id);
  return members.map((member) => ({
    id: member.id,
    name: `${member.first_name} ${member.last_name}`,
    email: member.email,
    detail: [MEMBER_STATUS_LABEL[member.status], member.plan?.name].filter(Boolean).join(" / "),
  }));
}
