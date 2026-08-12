"use server";

import { createServerSupabaseClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getGym, getMember, getMemberContracts, DEV_BYPASS } from "@/lib/queries";
import { sendContractEmail } from "@/lib/resend";
import { renderTemplate } from "@/lib/templates";
import { formatDate, formatPlanPrice } from "@/utils";

// Renders the gym's own contract_template and emails it to the member —
// creates a pending contracts row if none exists yet, otherwise re-sends
// and bumps last_sent_at on the existing pending one. Does NOT touch
// status/signed_at — this is "sent," not "signed"; see markContractSigned.
export async function sendContract(
  memberId: string,
  gymId: string
): Promise<{ error: string } | { success: true }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [gym, member, contracts] = await Promise.all([
    getGym(),
    getMember(memberId, gymId),
    getMemberContracts(memberId),
  ]);
  if (!member) return { error: "Member not found" };

  const bodyText = renderTemplate(gym.contract_template, {
    member_name: `${member.first_name} ${member.last_name}`,
    gym_name: gym.name,
    plan_name: member.plan?.name ?? "—",
    amount: member.plan ? formatPlanPrice(member.plan) : "—",
    start_date: formatDate(member.start_date ?? member.created_at),
  });

  // Only the network call is skipped under DEV_BYPASS — the Supabase write
  // below still runs unconditionally, consistent with every other action
  // in this codebase (cancelMember, updateMemberStatus, createMember never
  // guard their writes either). Actually sending a real email to a real
  // inbox during dev testing is the one part of this action DEV_BYPASS
  // needs to prevent; a write to the dev/staging DB isn't the same risk.
  if (DEV_BYPASS) {
    console.log(`[dev] Would send contract email to ${member.email}`);
  } else {
    try {
      await sendContractEmail({
        to: member.email,
        replyTo: gym.email,
        gymName: gym.name,
        logoUrl: gym.logo_url,
        bodyText,
      });
    } catch (err) {
      console.error("Failed to send contract email", err);
      return { error: "Failed to send the contract email. Try again." };
    }
  }

  const now = new Date().toISOString();
  const pending = contracts.find((c) => c.status === "pending");

  const { error } = pending
    ? await supabase.from("contracts").update({ last_sent_at: now }).eq("id", pending.id).eq("gym_id", gymId)
    : await supabase
        .from("contracts")
        .insert({ gym_id: gymId, member_id: memberId, status: "pending", last_sent_at: now });

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/members/${memberId}`);
  revalidatePath("/dashboard/contracts");
  return { success: true };
}

// Manual sign-tracking — no e-signature vendor. The owner gets a signature
// however they normally do (in person, paper, email reply) and ticks this
// off themselves.
export async function markContractSigned(
  contractId: string,
  gymId: string,
  memberId: string
): Promise<{ error: string } | { success: true }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { error } = await supabase
    .from("contracts")
    .update({ status: "signed", signed_at: new Date().toISOString() })
    .eq("id", contractId)
    .eq("gym_id", gymId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/members/${memberId}`);
  revalidatePath("/dashboard/contracts");
  return { success: true };
}
