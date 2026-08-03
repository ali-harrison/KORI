"use server";

import { createServerSupabaseClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { slugify } from "@/utils";

export async function createGym(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

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
