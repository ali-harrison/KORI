"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DEMO_MODE } from "@/lib/queries";
import { resetDemoSession } from "@/lib/demo-session";

export async function resetDemo() {
  if (!DEMO_MODE) return;
  await resetDemoSession();
  revalidatePath("/dashboard", "layout");
  // The page you're on might be a member the reset just removed.
  redirect("/dashboard");
}
