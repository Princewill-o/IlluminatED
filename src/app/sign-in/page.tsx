import Link from "next/link";
import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { SignInForm } from "@/components/account/sign-in-form";
import { safeNext } from "@/lib/account/paths";
import { getAccount } from "@/lib/account/server";
import { socialConfigured } from "@/lib/social/config";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to IlluminatED to save quiz progress, get a personal dashboard, request a tutor and post on IlluminatEDSocial.",
};

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; mode?: string }>;
}) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const account = await getAccount();
  if (account)
    redirect(
      account.profile && account.details
        ? next
        : `/onboarding?next=${encodeURIComponent(next)}`,
    );

  return (
    <div className="container grid gap-12 py-12 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-20 lg:py-20">
      <div>
        <h1 className="text-4xl tracking-tight">
          Sign in or create an account
        </h1>
        <p className="text-muted-foreground mt-3 leading-relaxed">
          One account for IlluminatED and IlluminatEDSocial.
        </p>
        {sp.error && (
          <p role="alert" className="text-destructive mt-6 text-sm">
            That sign-in link didn't work. It may have expired, already been
            used, or been opened in a different browser. Request a new one
            below.
          </p>
        )}
        {!socialConfigured && (
          <p className="border-primary mt-6 border-l-2 pl-4 text-sm">
            Accounts are switched off in this preview.
          </p>
        )}
        <div className="mt-8">
          <SignInForm
            next={next}
            disabled={!socialConfigured}
            initialMode={sp.mode === "sign-up" ? "sign-up" : "sign-in"}
          />
        </div>
      </div>
      <div className="lg:border-l lg:pl-20">
        <h2 className="text-lg font-semibold">What an account adds</h2>
        <dl className="mt-5 divide-y border-y text-sm">
          {[
            [
              "Your dashboard",
              "Quiz scores by topic and what to revise next, based on your subjects.",
            ],
            [
              "Progress on every device",
              "Your quiz history is saved to your account, not just this browser.",
            ],
            [
              "Tutor requests",
              "Ask for help with homework, coursework guidance or exam prep.",
            ],
            [
              "IlluminatEDSocial",
              "Post and reply on the student forum with the same account.",
            ],
          ].map(([t, d]) => (
            <div key={t} className="grid gap-1 py-4 sm:grid-cols-[11rem_1fr]">
              <dt className="font-medium">{t}</dt>
              <dd className="text-muted-foreground leading-relaxed">{d}</dd>
            </div>
          ))}
        </dl>
        <p className="text-muted-foreground mt-5 text-sm leading-relaxed">
          You don't need an account to use the revision pages, quizzes or
          flashcards. Read how we handle{" "}
          <Link
            href="/your-data"
            className="text-primary underline underline-offset-4"
          >
            your data
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
