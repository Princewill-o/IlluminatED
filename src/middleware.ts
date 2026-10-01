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
  let response = NextResponse.next({ request });
  if (!socialConfigured) return response;

  const path = request.nextUrl.pathname;
  const hasSessionCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-"));

  let signedIn = false;
  if (hasSessionCookie) {
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

  if (!signedIn && !isPublic(path)) {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("next", path + request.nextUrl.search);
    return redirectTo(url);
  }
  return response;
}

export const config = {
  matcher: [
    // Everything except static files, images and API proxies.
    "/((?!_next/static|_next/image|api/|brand/|favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};
