import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { safeRedirectPath } from "@/utils";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"), "/dashboard");

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if gym exists for this user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: gym } = await supabase
          .from("gyms")
          .select("id")
          .eq("owner_id", user.id)
          .single();

        if (!gym) {
          return NextResponse.redirect(`${origin}/onboarding`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}
