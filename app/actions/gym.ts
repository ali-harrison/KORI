"use server";

import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { slugify } from "@/utils";

// Single-tenant pilot decision: KORI runs one gym (Southerly Strength) per
// deployment for now. Self-serve onboarding is kept in the code (it's the
// real multi-tenant path and the fastest way back to it later) but hard-
// stopped here so a second, unrelated gym can never get created by
// accident. Reversible — delete this check to reopen onboarding.
export async function createGym(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // RLS scopes a normal client's view of `gyms` to rows the caller owns, so
  // this can't see whether some *other* gym already exists — it needs the
  // admin client to check across all owners.
  const admin = createAdminClient();
  const { count: gymCount } = await admin
    .from("gyms")
    .select("id", { count: "exact", head: true });

  if (gymCount && gymCount > 0) {
    return { error: "This pilot is configured for a single gym. Contact the admin if you need access." };
  }

  const name = formData.get("name") as string;
  const address = formData.get("address") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;

  if (!name?.trim()) return { error: "Gym name is required" };

  // Ensure unique slug
  let slug = slugify(name);
  const { data: existing } = await supabase
    .from("gyms")
    .select("id")
    .eq("slug", slug)
    .single();

  if (existing) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const { error } = await supabase.from("gyms").insert({
    owner_id: user.id,
    name: name.trim(),
    slug,
    address: address?.trim() || null,
    phone: phone?.trim() || null,
    email: email?.trim() || null,
  });

  if (error) return { error: error.message };

  redirect("/dashboard");
}

export async function updateGym(gymId: string, formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { error } = await supabase
    .from("gyms")
    .update({
      name: (formData.get("name") as string).trim(),
      address: (formData.get("address") as string)?.trim() || null,
      phone: (formData.get("phone") as string)?.trim() || null,
      email: (formData.get("email") as string)?.trim() || null,
    })
    .eq("id", gymId)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  return { success: true };
}
