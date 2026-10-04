import { NextRequest, NextResponse } from "next/server";

import { makePreviewCookie, previewGateEnabled, previewPage, PREVIEW_COOKIE, safePreviewNext, validPreviewCode } from "@/lib/preview-gate";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  if (!previewGateEnabled) return NextResponse.redirect(new URL("/", request.url), 303);
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return new Response("Forbidden", { status: 403 });
  const form = await request.formData().catch(() => null);
  const code = String(form?.get("code") ?? "");
  const next = safePreviewNext(String(form?.get("next") ?? "/"));
  if (code.length > 100 || !(await validPreviewCode(code))) {
    return new Response(previewPage(next, true), { status: 401, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
  }
  const token = await makePreviewCookie();
  const response = NextResponse.redirect(new URL(next, request.url), 303);
  response.cookies.set(PREVIEW_COOKIE, token.value, {
    httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "lax", path: "/", maxAge: token.maxAge,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
