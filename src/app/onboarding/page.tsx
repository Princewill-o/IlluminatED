import Link from "next/link";
import { redirect } from "next/navigation";


import type { Metadata } from "next";

import { DetailsForm } from "@/components/account/details-form";
import { SignOutButton } from "@/components/app/sign-out-button";
import { Tiggy } from "@/components/tiggy";
import { safeNext } from "@/lib/account/paths";
import { getAccount } from "@/lib/account/server";
import { slimCourses, slimTopics } from "@/lib/account/slim";
import { getSupabase } from "@/lib/social/server";

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

  // New accounts need an invite: access is set up after a demo call.
  const sb = await getSupabase();
  const { data: allowed, error } = sb ? await sb.rpc("access_allowed") : { data: true, error: null };
  if (!error && allowed === false)
    return (
      <div className="container max-w-2xl py-16 lg:py-24">
        <p className="text-sm font-bold tracking-widest text-primary uppercase">Almost there</p>
        <h1 className="mt-3 text-4xl tracking-tight">Your account isn&apos;t set up yet</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          IlluminatED accounts are set up after a short call, so you get the right courses, and your school or college gets the right classes. If your school
          has already booked, ask your teacher to check your email address is on their list.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/book" className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">
            Book a demo
          </Link>
          <SignOutButton />
        </div>
      </div>
    );

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
