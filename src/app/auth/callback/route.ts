import { NextResponse } from "next/server";

import { safeNext } from "@/lib/account/paths";
import { isLearningDestination } from "@/lib/learning/products";
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

  const {data:schoolResult}=await sb.rpc("school_access");
  const school=Array.isArray(schoolResult)?schoolResult[0]:schoolResult;
  if(school&&!school.active)return NextResponse.redirect(new URL("/school-access",url.origin));
  if(school?.role==="teacher"&&next==="/dashboard")return NextResponse.redirect(new URL("/school",url.origin));
  const [{ data: profile }, { data: details }] = await Promise.all([
    sb.from("profiles").select("id").eq("id", data.user.id).maybeSingle(),
    sb
      .from("learner_details")
      .select("user_id,tutorial_completed_at")
      .eq("user_id", data.user.id)
      .maybeSingle(),
  ]);
  if(school?.role==="teacher"&&isLearningDestination(next))return NextResponse.redirect(new URL(profile?next:"/teacher",url.origin));
  if(isLearningDestination(next)&&profile&&details)return NextResponse.redirect(new URL(next,url.origin));
  const dest =
    profile && details
      ? details.tutorial_completed_at
        ? next
        : `/getting-started?next=${encodeURIComponent(next)}`
      : `/onboarding?next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(new URL(dest, url.origin));
}
