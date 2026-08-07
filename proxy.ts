import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL } from "@/lib/supabase/env";

// Next.js 16 renamed `middleware.ts` to `proxy.ts` (same mechanism, new name).
// Refreshes the Supabase session cookie on every request and gates the
// dashboard behind the single-admin login.
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/login";
  // Payment gateways call these; they authenticate with an HMAC signature over
  // the body, not a session cookie, so a login redirect would just swallow them.
  const isWebhook = pathname.startsWith("/api/webhooks/");
  // Other websites call these with a bearer API key, again not a cookie.
  const isPublicApi = pathname.startsWith("/api/v1/");
  // Client-facing pages, reached by an unguessable id in an emailed link:
  // /pay/<invoice> to pay, /manage/<subscription> to cancel.
  const isPublicPage =
    pathname.startsWith("/pay/") ||
    pathname.startsWith("/manage/") ||
    isWebhook ||
    isPublicApi;

  if (!user && !isLoginPage && !isPublicPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
