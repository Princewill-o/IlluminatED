import { type NextRequest, NextResponse } from "next/server";

import { createServerClient } from "@supabase/ssr";

import {
  SUPABASE_KEY,
  SUPABASE_URL,
  socialConfigured,
} from "@/lib/social/config";

/** Pages anyone can open. Everything else needs an account. */
const PUBLIC_PATHS = [
  "/",
  "/sign-in",
  "/auth/callback",
  "/about",
  "/faq",
  "/accessibility",
  "/your-data",
  "/privacy",
  "/terms",
  "/cookies",
  "/contact",
  "/safeguarding",
  "/guardian/confirm",
  "/robots.txt",
  "/sitemap.xml",
  "/opengraph-image",
  "/opengraph-image.png",
  "/twitter-image",
  "/twitter-image.png",
  "/social/guidelines",
  "/social/sign-in",
  "/social/welcome",
  "/social/auth/callback",
];

/** Metadata image routes (e.g. /opengraph-image or /social/opengraph-image-abc123), which link previews fetch without signing in. */
const METADATA_IMAGE =
  /(^|\/)(opengraph-image|twitter-image)(-[\w-]+)?(\.\w+)?$/;

const isPublic = (path: string) =>
  PUBLIC_PATHS.some((p) => path === p || path === `${p}/`) ||
  METADATA_IMAGE.test(path);

/**
 * Keeps the Supabase session fresh, sends signed-out visitors to sign in,
 * and sends signed-in people from the landing page to their dashboard.
 */
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  // API routes enforce their own account and webhook checks.
  if (path.startsWith("/api/")) return NextResponse.next();
  let response = NextResponse.next({ request });
  if (!socialConfigured) return response;
  const hasSessionCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-"));

  let signedIn = false;
  let supabase: ReturnType<typeof createServerClient> | null = null;
  if (hasSessionCookie) {
    supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
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
    const { data } = await supabase.auth.getUser();
    signedIn = Boolean(data.user);
  }

  const redirectTo = (url: URL) => {
    const r = NextResponse.redirect(url);
    // Keep any refreshed session cookies.
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  if (signedIn && path === "/")
    return redirectTo(new URL("/dashboard", request.url));

  // New learners finish their guided setup before opening any study page.
  // Legal/help pages and the setup flow remain available throughout.
  const setupPath = path === "/onboarding" || path === "/getting-started" ||
    path === "/personalising" || path === "/account/password";
  if (signedIn && supabase && !isPublic(path) && !setupPath) {
    const { data: details, error } = await supabase
      .from("learner_details")
      .select("tutorial_completed_at")
      .maybeSingle();
    if (!error && !details)
      return redirectTo(new URL(`/onboarding?next=${encodeURIComponent(path + request.nextUrl.search)}`, request.url));
    if (!error && details && !details.tutorial_completed_at)
      return redirectTo(new URL(`/getting-started?next=${encodeURIComponent(path + request.nextUrl.search)}`, request.url));
  }

  if (!signedIn && !isPublic(path)) {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("next", path + request.nextUrl.search);
    return redirectTo(url);
  }
  return response;
}

export const config = {
  matcher: [
    // Refresh sessions and protect account pages while allowing public assets.
    "/((?!_next/static|_next/image|brand/|favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)",
  ],
};
