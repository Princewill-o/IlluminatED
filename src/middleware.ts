import { type NextRequest, NextResponse } from "next/server";

import { createServerClient } from "@supabase/ssr";

import {
  SUPABASE_KEY,
  SUPABASE_URL,
  socialConfigured,
} from "@/lib/social/config";

/** Keeps the Supabase session fresh across the site. Does nothing if accounts aren't configured. */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!socialConfigured) return response;
  // Visitors who have never signed in have no session to refresh.
  if (!request.cookies.getAll().some((c) => c.name.startsWith("sb-")))
    return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet, headers) {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers ?? {}).forEach(([k, v]) =>
          response.headers.set(k, v as string),
        );
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: [
    // Everything except static files, images and API proxies.
    "/((?!_next/static|_next/image|api/|brand/|favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};
