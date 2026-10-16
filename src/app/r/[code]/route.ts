import { type NextRequest, NextResponse } from "next/server";

/** Creator referral links: illuminated.../r/<username>. Remembers who sent you, then shows the landing page. */
export function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  return params.then(({ code }) => {
    const res = NextResponse.redirect(new URL("/?ref=1", request.url));
    if (/^[A-Za-z0-9_.-]{2,30}$/.test(code))
      res.cookies.set("ref", code, { maxAge: 60 * 60 * 24 * 30, httpOnly: true, sameSite: "lax", secure: true, path: "/" });
    return res;
  });
}
