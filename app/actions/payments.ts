"use server";

import { createServerSupabaseClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function recordPayment(
  memberId: string,
  gymId: string,
  { amount, paidAt, note }: { amount: number; paidAt: string; note?: string }
): Promise<{ error: string } | { success: true }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter a valid amount" };
  }
  if (!paidAt) {
    return { error: "Enter the date paid" };
  }

  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("id, plan_id")
    .eq("id", memberId)
    .eq("gym_id", gymId)
    .single();

  if (memberError || !member) return { error: "Member not found" };

  const { error } = await supabase.from("payments").insert({
    gym_id: gymId,
    member_id: memberId,
    plan_id: member.plan_id,
    amount,
    provider: "manual",
    type: "one_off",
    status: "succeeded",
    paid_at: paidAt,
    note: note || null,
  });

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/members/${memberId}`);
  revalidatePath("/dashboard");
  return { success: true };
}
