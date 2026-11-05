"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DEV_BYPASS } from "@/lib/queries";
import { resetDemoState } from "@/lib/dev-store";

export async function resetDemo() {
  if (!DEV_BYPASS) return;
  resetDemoState();
  revalidatePath("/dashboard", "layout");
  // The page you're on might be a member the reset just removed.
  redirect("/dashboard");
}
