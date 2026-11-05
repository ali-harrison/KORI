"use server";

import { createAdminClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { slugify } from "@/utils";
import { requireSession, DEV_BYPASS } from "@/lib/queries";
import * as DEMO from "@/lib/dev-store";

// Single-tenant pilot decision: KORI runs one gym (Southerly Strength) per
// deployment for now. Self-serve onboarding is kept in the code (it's the
// real multi-tenant path and the fastest way back to it later) but hard-
// stopped here so a second, unrelated gym can never get created by
// accident. Reversible — delete this check to reopen onboarding.
export async function createGym(formData: FormData) {
  // The demo gym already exists — nothing to create.
  if (DEV_BYPASS) redirect("/dashboard");

  const { supabase, user } = await requireSession();

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

  if (error) {
    // 23505 here means idx_gyms_singleton (20240011) rejected a second
    // concurrent insert that slipped past the count check above — the
    // same outcome as the check catching it, just discovered a moment
    // later. Same friendly message either way.
    if (error.code === "23505") {
      return { error: "This pilot is configured for a single gym. Contact the admin if you need access." };
    }
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function updateGym(gymId: string, formData: FormData) {
  const { supabase, user } = await requireSession();

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Gym name is required" };

  const fields = {
    name,
    address: (formData.get("address") as string)?.trim() || null,
    phone: (formData.get("phone") as string)?.trim() || null,
    email: (formData.get("email") as string)?.trim() || null,
    logo_url: (formData.get("logo_url") as string)?.trim() || null,
  };

  if (DEV_BYPASS) {
    DEMO.updateGym(fields);
  } else {
    const { error } = await supabase.from("gyms").update(fields).eq("id", gymId).eq("owner_id", user.id);
    if (error) return { error: error.message };
  }

  // The layout shows the gym name in the sidebar.
  revalidatePath("/dashboard", "layout");
  return { success: true };
}

// One reusable template per gym — see lib/templates.ts for the render
// function and lib/resend.ts for where this gets sent.
export async function updateContractTemplate(gymId: string, formData: FormData) {
  const { supabase, user } = await requireSession();

  const contractTemplate = (formData.get("contract_template") as string)?.trim();
  if (!contractTemplate) return { error: "Contract template can't be empty" };

  if (DEV_BYPASS) {
    DEMO.updateGym({ contract_template: contractTemplate });
    revalidatePath("/dashboard/settings");
    return { success: true };
  }

  const { error } = await supabase
    .from("gyms")
    .update({ contract_template: contractTemplate })
    .eq("id", gymId)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function updateReminderTemplate(gymId: string, formData: FormData) {
  const { supabase, user } = await requireSession();

  const overdueEmailSubject = (formData.get("overdue_email_subject") as string)?.trim();
  const overdueEmailBody = (formData.get("overdue_email_body") as string)?.trim();
  if (!overdueEmailSubject || !overdueEmailBody) {
    return { error: "Subject and body can't be empty" };
  }

  if (DEV_BYPASS) {
    DEMO.updateGym({ overdue_email_subject: overdueEmailSubject, overdue_email_body: overdueEmailBody });
    revalidatePath("/dashboard/settings");
    return { success: true };
  }

  const { error } = await supabase
    .from("gyms")
    .update({ overdue_email_subject: overdueEmailSubject, overdue_email_body: overdueEmailBody })
    .eq("id", gymId)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  return { success: true };
}
