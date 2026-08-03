"use server";

import { createServerSupabaseClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Shared parse/validate for the pricing half of the create/edit plan form.
// Mirrors the plans_pricing_shape_check constraint in the DB: recurring
// plans carry a billing_interval and no term; paid-in-full plans carry a
// term_months and no billing_interval.
function parsePricingFields(formData: FormData):
  | { error: string }
  | { pricing_model: "recurring"; billing_interval: string; term_months: null }
  | { pricing_model: "paid_in_full"; billing_interval: null; term_months: number } {
  const pricing_model = formData.get("pricing_model") as string;

  if (pricing_model === "recurring") {
    const billing_interval = formData.get("billing_interval") as string;
    if (!["weekly", "monthly", "annual"].includes(billing_interval)) {
      return { error: "Invalid billing interval" };
    }
    return { pricing_model, billing_interval, term_months: null };
  }

  if (pricing_model === "paid_in_full") {
    const term_months = parseInt(formData.get("term_months") as string, 10);
    if (isNaN(term_months) || term_months <= 0) {
      return { error: "Enter a valid term length in months" };
    }
    return { pricing_model, billing_interval: null, term_months };
  }

  return { error: "Invalid pricing model" };
}

export async function createPlan(
  gymId: string,
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const priceStr = formData.get("price") as string;

  if (!name) return { error: "Plan name is required" };
  const price = parseFloat(priceStr);
  if (isNaN(price) || price <= 0) return { error: "Enter a valid price" };

  const pricing = parsePricingFields(formData);
  if ("error" in pricing) return pricing;

  const { error } = await supabase.from("plans").insert({
    gym_id: gymId,
    name,
    description: description || null,
    price,
    pricing_model: pricing.pricing_model,
    billing_interval: pricing.billing_interval,
    term_months: pricing.term_months,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/plans");
  return { success: true };
}

export async function updatePlan(
  planId: string,
  gymId: string,
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const priceStr = formData.get("price") as string;

  if (!name) return { error: "Plan name is required" };
  const price = parseFloat(priceStr);
  if (isNaN(price) || price <= 0) return { error: "Enter a valid price" };

  const pricing = parsePricingFields(formData);
  if ("error" in pricing) return pricing;

  const { error } = await supabase
    .from("plans")
    .update({
      name,
      description: description || null,
      price,
      pricing_model: pricing.pricing_model,
      billing_interval: pricing.billing_interval,
      term_months: pricing.term_months,
    })
    .eq("id", planId)
    .eq("gym_id", gymId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/plans");
  return { success: true };
}

export async function togglePlanActive(planId: string, gymId: string, active: boolean) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { error } = await supabase
    .from("plans")
    .update({ active })
    .eq("id", planId)
    .eq("gym_id", gymId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/plans");
  return { success: true };
}

export async function deletePlan(planId: string, gymId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Check if any members are on this plan
  const { count } = await supabase
    .from("members")
    .select("id", { count: "exact", head: true })
    .eq("plan_id", planId)
    .in("status", ["active", "paused"]);

  if (count && count > 0) {
    return { error: `Cannot delete — ${count} active member${count > 1 ? "s" : ""} on this plan` };
  }

  const { error } = await supabase
    .from("plans")
    .delete()
    .eq("id", planId)
    .eq("gym_id", gymId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/plans");
  return { success: true };
}
