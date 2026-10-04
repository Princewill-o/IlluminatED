import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { DetailsForm } from "@/components/account/details-form";
import { Tiggy } from "@/components/tiggy";
import { safeNext } from "@/lib/account/paths";
import { getAccount } from "@/lib/account/server";
import { slimCourses, slimTopics } from "@/lib/account/slim";

export const metadata: Metadata = { title: "Set up your account" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const account = await getAccount();
  if (!account) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  if (account.profile && account.details)
    redirect(account.tutorialCompleted ? next : `/getting-started?next=${encodeURIComponent(next)}`);

  return (
    <div className="container max-w-3xl py-12 lg:py-16">
      <Tiggy
        action="wave"
        say="I'm Tiggy. Tell me what you study!"
        sayClassName="left-[80%] top-[10%]"
        className="mb-6 w-24"
      />
      <h1 className="text-4xl tracking-tight">
        {account.profile
          ? `Welcome back, ${account.profile.username}`
          : "Welcome to IlluminatED"}
      </h1>
      <p className="text-muted-foreground mt-3 max-w-xl leading-relaxed">
        Tell us what you study and where you want to go next. We’ll use your
        answers to put the right subjects, practice and opportunities on your
        dashboard. Then Tiggy will show you around. You can change your choices later.
      </p>
      <div className="mt-8">
        <DetailsForm
          mode="onboarding"
          needsProfile={!account.profile}
          initial={account.details}
          next={next}
          courses={slimCourses()}
          topics={slimTopics()}
        />
      </div>
    </div>
  );
}
