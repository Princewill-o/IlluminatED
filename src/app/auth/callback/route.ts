import { NextResponse } from "next/server";

import { safeNext } from "@/lib/account/paths";
import { getSupabase } from "@/lib/social/server";

/** Email sign-in links land here. Swap the one-time code for a session, then continue or finish setting up. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  const fail = NextResponse.redirect(
    new URL(`/sign-in?error=link&next=${encodeURIComponent(next)}`, url.origin),
  );
  const sb = await getSupabase();
  if (!sb || !code) return fail;

  const { data, error } = await sb.auth.exchangeCodeForSession(code);
  if (error || !data.user) return fail;

  const [{ data: profile }, { data: details }] = await Promise.all([
    sb.from("profiles").select("id").eq("id", data.user.id).maybeSingle(),
    sb
      .from("learner_details")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle(),
  ]);
  const dest =
    profile && details ? next : `/onboarding?next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(new URL(dest, url.origin));
}
