import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { buildOAuthUrl } from "@/lib/gocardless";
import { randomBytes } from "crypto";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", process.env.NEXT_PUBLIC_APP_URL!));
  }

  // State encodes the user ID so the callback can find the right gym
  const state = `${user.id}:${randomBytes(16).toString("hex")}`;

  // Store state in a short-lived cookie so the callback can verify it
  const response = NextResponse.redirect(buildOAuthUrl(state));
  response.cookies.set("gc_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  return response;
}
