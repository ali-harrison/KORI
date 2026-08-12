"use server";

import { createServerSupabaseClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getGym, getMember } from "@/lib/queries";
import { getGoCardlessGymClient } from "@/lib/gocardless";
import { cancelMemberBilling } from "@/lib/member-cancellation";
import type { MemberStatus } from "@/types";

// Pause/reactivate only — this never claims anything about the GoCardless
// mandate, so it stays a plain status write. Cancel is handled separately
// by cancelMember below, which has to talk to GoCardless first.
export async function updateMemberStatus(
  memberId: string,
  gymId: string,
  status: Exclude<MemberStatus, "cancelled">
): Promise<{ error: string } | { success: true }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { error } = await supabase
    .from("members")
    .update({ status })
    .eq("id", memberId)
    .eq("gym_id", gymId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/members/${memberId}`);
  revalidatePath("/dashboard/members");
  revalidatePath("/dashboard");
  return { success: true };
}

// Cancels a member: stops future billing AND collection authority at
// GoCardless (subscription then mandate — see lib/member-cancellation.ts),
// then marks the cancellation as requested. It does NOT set status to
// "cancelled" itself for a direct-debit member — the mandates.cancelled
// webhook is what confirms the cancellation actually happened at
// GoCardless and writes the terminal state. See getMandateBadgeState for
// the resulting "Cancelling" transitional badge.
export async function cancelMember(
  memberId: string,
  gymId: string
): Promise<{ error: string } | { success: true }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [gym, member] = await Promise.all([getGym(), getMember(memberId, gymId)]);
  if (!member) return { error: "Member not found" };

  const gcClient =
    member.gc_mandate_id && gym.gc_access_token ? getGoCardlessGymClient(gym.gc_access_token) : null;

  const result = await cancelMemberBilling(member, gymId, supabase, gcClient);
  if (!result.ok) return { error: result.error };

  revalidatePath(`/dashboard/members/${memberId}`);
  revalidatePath("/dashboard/members");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/billing");
  return { success: true };
}

export async function createMember(
  gymId: string,
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const first_name = (formData.get("first_name") as string)?.trim();
  const last_name = (formData.get("last_name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim();
  const plan_id = formData.get("plan_id") as string;

  if (!first_name || !last_name || !email) {
    return { error: "First name, last name, and email are required" };
  }

  // Duplicate email within a gym is enforced by idx_members_gym_email_unique
  // (case-insensitive, migration 20240005) — insert directly and translate
  // the unique-violation error rather than pre-checking, which was racy
  // under concurrent submits.
  const { error } = await supabase.from("members").insert({
    gym_id: gymId,
    first_name,
    last_name,
    email,
    phone: phone || null,
    plan_id: plan_id || null,
    status: "pending",
    start_date: new Date().toISOString().split("T")[0],
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "A member with this email already exists" };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard/members");
  revalidatePath("/dashboard");
  return { success: true };
}
