import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { exchangeOAuthCode } from "@/lib/gocardless";

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/dashboard/settings?gc_error=${encodeURIComponent(error)}`, appUrl)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard/settings?gc_error=missing_params", appUrl));
  }

  // Verify state cookie to prevent CSRF
  const storedState = request.cookies.get("gc_oauth_state")?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(new URL("/dashboard/settings?gc_error=state_mismatch", appUrl));
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", appUrl));
  }

  try {
    const { access_token, organisation_id } = await exchangeOAuthCode(code);

    const { error: updateError } = await supabase
      .from("gyms")
      .update({
        gc_access_token: access_token,
        gc_organisation_id: organisation_id,
      })
      .eq("owner_id", user.id);

    if (updateError) throw updateError;

    const response = NextResponse.redirect(
      new URL("/dashboard/settings?gc_connected=1", appUrl)
    );
    // Clear state cookie
    response.cookies.set("gc_oauth_state", "", { maxAge: 0, path: "/" });
    return response;
  } catch (err) {
    console.error("GoCardless callback error:", err);
    return NextResponse.redirect(
      new URL("/dashboard/settings?gc_error=exchange_failed", appUrl)
    );
  }
}
