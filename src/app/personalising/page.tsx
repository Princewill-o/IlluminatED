import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { PersonalisingTransition } from "@/components/account/personalising-transition";
import { safeNext } from "@/lib/account/paths";
import { getAccount } from "@/lib/account/server";
import { COURSES } from "@/lib/data/courses";

export const metadata: Metadata = { title: "Preparing your study space" };
export const dynamic = "force-dynamic";

export default async function PersonalisingPage({ searchParams }: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  let next = safeNext(sp.next);
  if (["/personalising", "/getting-started", "/onboarding"].some((p) => next.startsWith(p))) next = "/dashboard";
  const account = await getAccount();
  if (!account) redirect("/sign-in?next=/dashboard");
  if (!account.profile || !account.details) redirect("/onboarding");
  if (!account.tutorialCompleted) redirect("/getting-started");
  const subjects = account.details.subjects
    .map((subject) => COURSES.find((course) => course.id === subject.courseId)?.title)
    .filter((title): title is string => Boolean(title))
    .slice(0, 3);
  return <PersonalisingTransition next={next} subjects={subjects} stage={account.details.stage} />;
}
