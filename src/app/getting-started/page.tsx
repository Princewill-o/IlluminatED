import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { FirstRunTutorial } from "@/components/account/first-run-tutorial";
import { safeNext } from "@/lib/account/paths";
import { getAccount } from "@/lib/account/server";
import { COURSES } from "@/lib/data/courses";

export const metadata: Metadata = { title: "Your guided tour" };
export const dynamic = "force-dynamic";

export default async function GettingStartedPage({ searchParams }: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const requested = safeNext(sp.next);
  const next = ["/getting-started", "/personalising", "/onboarding"].some((path) => requested.startsWith(path))
    ? "/dashboard"
    : requested;
  const account = await getAccount();
  if (!account) redirect(`/sign-in?next=${encodeURIComponent("/getting-started")}`);
  if (!account.profile || !account.details)
    redirect(`/onboarding?next=${encodeURIComponent(next)}`);
  if (account.tutorialCompleted) redirect(next);

  const subjects = account.details.subjects
    .map((subject) => COURSES.find((course) => course.id === subject.courseId)?.title)
    .filter((title): title is string => Boolean(title))
    .slice(0, 3);

  return <FirstRunTutorial
    name={account.profile.username}
    subjects={subjects}
    careerRoute={account.details.careerRoute ?? "unsure"}
    next={next}
    saveError={sp.error === "save"}
  />;
}
