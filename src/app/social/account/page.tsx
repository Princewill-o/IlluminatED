import Link from "next/link";
import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { DeleteAccountForm } from "@/components/social/forms";
import { getViewer } from "@/lib/social/server";

export const metadata: Metadata = { title: "Your account" };

export default async function AccountPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in?next=/social/account");
  if (!viewer.profile) redirect("/onboarding?next=/social/account");
  return (
    <div className="container max-w-2xl py-10 lg:py-14">
      <h1 className="text-4xl tracking-tight">Your account</h1>
      <dl className="mt-8 border-t">
        <div className="grid gap-1 border-b py-4 sm:grid-cols-[160px_1fr]">
          <dt className="text-muted-foreground">Username</dt>
          <dd className="font-medium">
            <Link
              href={`/social/u/${viewer.profile.username}`}
              className="hover:text-primary"
            >
              {viewer.profile.username}
            </Link>
          </dd>
        </div>
        <div className="grid gap-1 border-b py-4 sm:grid-cols-[160px_1fr]">
          <dt className="text-muted-foreground">Email</dt>
          <dd>
            {viewer.email}{" "}
            <span className="text-muted-foreground text-sm">
              (never shown to anyone)
            </span>
          </dd>
        </div>
        {viewer.profile.banned && (
          <div className="border-b py-4 text-sm">
            Your account has been stopped from posting by a moderator. You can
            still read and delete your account.
          </div>
        )}
      </dl>
      <section aria-labelledby="del" className="mt-12">
        <h2 id="del" className="text-xl font-semibold">
          Delete your account
        </h2>
        <p className="text-muted-foreground mt-2 leading-relaxed">
          This permanently deletes your account and every thread and reply
          you've posted. Replies other people wrote in your threads are deleted
          too. It can't be undone.
        </p>
        <div className="mt-5">
          <DeleteAccountForm />
        </div>
      </section>
    </div>
  );
}
