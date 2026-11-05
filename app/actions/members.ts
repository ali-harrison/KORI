"use server";

import type { createServerSupabaseClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { getGym, getMember, requireSession, DEMO_MODE } from "@/lib/queries";
import { demoWrite } from "@/lib/demo-session";
import { getGoCardlessGymClient } from "@/lib/gocardless";
import { cancelMemberBilling } from "@/lib/member-cancellation";
import type { MemberStatus } from "@/types";
import { toLocalISODate } from "@/utils";

// Shared by createMember and assignMemberPlan — a <select> only ever lists
// this gym's own plans, but the action itself has no way to know that
// without checking: members.plan_id's FK just requires the row to exist
// somewhere, not that it belongs to this gym, and FK checks run
// independent of RLS. Confirming it here closes that gap rather than
// trusting the client. Returns true if planId is empty (no plan) or a
// real plan belonging to gymId; false otherwise.
async function isValidPlanForGym(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  planId: string | null,
  gymId: string
): Promise<boolean> {
  if (!planId) return true;
  const { data: plan } = await supabase
    .from("plans")
    .select("id")
    .eq("id", planId)
    .eq("gym_id", gymId)
    .maybeSingle();
  return !!plan;
}

// Pause/reactivate only — this never claims anything about the GoCardless
// mandate, so it stays a plain status write. Cancel is handled separately
// by cancelMember below, which has to talk to GoCardless first.
export async function updateMemberStatus(
  memberId: string,
  gymId: string,
  status: Exclude<MemberStatus, "cancelled">
): Promise<{ error: string } | { success: true }> {
  const { supabase } = await requireSession();

  if (DEMO_MODE) {
    const result = await demoWrite("setMemberStatus", memberId, status);
    if (result) return result;
  } else {
    const { error } = await supabase
      .from("members")
      .update({ status })
      .eq("id", memberId)
      .eq("gym_id", gymId);

    if (error) return { error: error.message };
  }

  revalidatePath("/dashboard", "layout");
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
  const { supabase } = await requireSession();

  if (DEMO_MODE) {
    const result = await demoWrite("cancelMember", memberId);
    if (result) return result;
    revalidatePath("/dashboard", "layout");
    return { success: true };
  }

  const [gym, member] = await Promise.all([getGym(), getMember(memberId, gymId)]);
  if (!member) return { error: "Member not found" };

  const gcClient =
    member.gc_mandate_id && gym.gc_access_token ? getGoCardlessGymClient(gym.gc_access_token) : null;

  const result = await cancelMemberBilling(member, gymId, supabase, gcClient);
  if (!result.ok) return { error: result.error };

  revalidatePath("/dashboard", "layout");
  return { success: true };
}

export async function createMember(
  gymId: string,
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const { supabase } = await requireSession();

  const first_name = (formData.get("first_name") as string)?.trim();
  const last_name = (formData.get("last_name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim();
  const plan_id = (formData.get("plan_id") as string) || null;

  if (!first_name || !last_name || !email) {
    return { error: "First name, last name, and email are required" };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address" };
  }

  if (DEMO_MODE) {
    const result = await demoWrite("createMember", { first_name, last_name, email, phone: phone || null, plan_id });
    if (result) return result;
    revalidatePath("/dashboard", "layout");
    return { success: true };
  }

  if (!(await isValidPlanForGym(supabase, plan_id, gymId))) {
    return { error: "Invalid plan selected" };
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
    start_date: toLocalISODate(),
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "A member with this email already exists" };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard", "layout");
  return { success: true };
}

// Assigns or changes a member's plan — a plain plan_id write, same as
// pause/reactivate is a plain status write. Billing itself (GoCardless
// subscription amount, next charge) isn't touched here; if the member has
// an active mandate, reconciling it against the new plan's price is a
// separate, real-money action for later, not implied by this one.
export async function assignMemberPlan(
  memberId: string,
  gymId: string,
  planId: string | null
): Promise<{ error: string } | { success: true }> {
  const { supabase } = await requireSession();

  if (DEMO_MODE) {
    const result = await demoWrite("assignMemberPlan", memberId, planId);
    if (result) return result;
  } else {
    if (!(await isValidPlanForGym(supabase, planId, gymId))) {
      return { error: "Invalid plan selected" };
    }

    const { error } = await supabase
      .from("members")
      .update({ plan_id: planId })
      .eq("id", memberId)
      .eq("gym_id", gymId);

    if (error) return { error: error.message };
  }

  revalidatePath("/dashboard", "layout");
  return { success: true };
}
