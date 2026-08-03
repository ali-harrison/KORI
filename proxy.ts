import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  // Gated on NODE_ENV so this can never disable auth in a production
  // build/start, even if DEV_BYPASS=true leaks into a production environment.
  if (process.env.NODE_ENV === "development" && process.env.DEV_BYPASS === "true") {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — must not call getUser() between createServerClient and this
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith("/auth");
  const isPortalRoute = pathname.startsWith("/portal");
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isOnboarding = pathname === "/onboarding";
  const isApiRoute = pathname.startsWith("/api");

  // Skip middleware for API routes
  if (isApiRoute) return supabaseResponse;

  // Unauthenticated → login (except auth + portal routes)
  if (!user && (isDashboardRoute || isOnboarding)) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Already authenticated → skip login
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Dashboard routes (except onboarding) → check gym exists
  if (user && isDashboardRoute) {
    const { data: gym } = await supabase
      .from("gyms")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!gym) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
