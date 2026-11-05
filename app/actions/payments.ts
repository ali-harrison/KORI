"use server";

import { revalidatePath } from "next/cache";
import { requireSession, DEV_BYPASS } from "@/lib/queries";
import * as DEMO from "@/lib/dev-store";

export async function recordPayment(
  memberId: string,
  gymId: string,
  { amount, paidAt, note }: { amount: number; paidAt: string; note?: string }
): Promise<{ error: string } | { success: true }> {
  const { supabase } = await requireSession();

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter a valid amount" };
  }
  if (!paidAt) {
    return { error: "Enter the date paid" };
  }

  if (DEV_BYPASS) {
    const result = DEMO.recordPayment(memberId, { amount, paidAt, note: note || null });
    if (result) return result;
    revalidatePath("/dashboard", "layout");
    return { success: true };
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

  revalidatePath("/dashboard", "layout");
  return { success: true };
}
