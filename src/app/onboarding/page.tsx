import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { DetailsForm } from "@/components/account/details-form";
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
  if (account.profile && account.details) redirect(next);

  return (
    <div className="container max-w-3xl py-12 lg:py-16">
      <h1 className="text-4xl tracking-tight">
        {account.profile
          ? `Welcome back, ${account.profile.username}`
          : "Welcome to IlluminatED"}
      </h1>
      <p className="text-muted-foreground mt-3 max-w-xl leading-relaxed">
        Tell us what you study so your dashboard shows the right topics. It
        takes about a minute, and you can change it any time.
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
