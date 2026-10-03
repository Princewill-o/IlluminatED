import "server-only";

import { redirect } from "next/navigation";

import { type LearnerDetails, rowToDetails } from "./details";

import { getSupabase, getViewer, type Viewer } from "@/lib/social/server";

export interface Account extends Viewer {
  details: LearnerDetails | null;
}

/** The signed-in person with their study details, or null. */
export async function getAccount(): Promise<Account | null> {
  const viewer = await getViewer();
  if (!viewer) return null;
  const sb = (await getSupabase())!;
  const { data } = await sb
    .from("learner_details")
    .select("*")
    .eq("user_id", viewer.id)
    .maybeSingle();
  const { data: career } = await sb
    .from("education_learner_state")
    .select("value")
    .eq("user_id", viewer.id)
    .eq("namespace", "career")
    .maybeSingle();
  return {
    ...viewer,
    details: data
      ? { ...rowToDetails(data), careerRoute: career?.value?.route }
      : null,
  };
}

/** For pages that need a fully set-up account. Sends people to sign in or onboarding first. */
export async function requireAccount(next: string) {
  const account = await getAccount();
  if (!account) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  if (!account.profile || !account.details)
    redirect(`/onboarding?next=${encodeURIComponent(next)}`);
  return account as Account & {
    profile: NonNullable<Account["profile"]>;
    details: LearnerDetails;
  };
}

export const isTutor = (a: Account | null) =>
  a?.profile?.role === "tutor" || a?.profile?.role === "moderator";
