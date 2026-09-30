import Link from "next/link";

import type { Metadata } from "next";

import { NewThreadForm } from "@/components/social/forms";
import { categoryBySlug, socialConfigured } from "@/lib/social/config";
import { getViewer } from "@/lib/social/server";

export const metadata: Metadata = { title: "Start a thread" };

export default async function NewThreadPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; university?: string }>;
}) {
  const sp = await searchParams;
  const viewer = await getViewer();
  const category = categoryBySlug(sp.category ?? "")?.slug;
  const university = (sp.university ?? "").slice(0, 80);
  const next = `/social/new${category ? `?category=${category}` : ""}`;

  return (
    <div className="container max-w-2xl py-10 lg:py-14">
      <h1 className="text-4xl tracking-tight">Start a thread</h1>
      <p className="text-muted-foreground mt-3 text-lg leading-relaxed">
        Ask a question or share what you know. Be kind, and keep personal
        details to yourself.
      </p>
      <div className="mt-10">
        {!socialConfigured ? (
          <>
            <p className="border-primary mb-8 border-l-2 pl-4 text-sm">
              Posting is switched off in the preview. This is how the form will
              look.
            </p>
            <NewThreadForm
              defaultCategory={category}
              defaultUniversity={university}
              disabled
            />
          </>
        ) : !viewer ? (
          <p>
            <Link
              href={`/sign-in?next=${encodeURIComponent(next)}`}
              className="text-primary font-medium underline underline-offset-4"
            >
              Sign in
            </Link>{" "}
            to start a thread.
          </p>
        ) : !viewer.profile ? (
          <p>
            <Link
              href={`/onboarding?next=${encodeURIComponent(next)}`}
              className="text-primary font-medium underline underline-offset-4"
            >
              Finish setting up
            </Link>{" "}
            first.
          </p>
        ) : viewer.profile.banned ? (
          <p className="text-muted-foreground">
            Your account can't post at the moment.
          </p>
        ) : (
          <NewThreadForm
            defaultCategory={category}
            defaultUniversity={university}
          />
        )}
      </div>
    </div>
  );
}
