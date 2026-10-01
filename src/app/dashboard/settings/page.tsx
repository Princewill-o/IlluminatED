import Link from "next/link";

import type { Metadata } from "next";

import { DetailsForm } from "@/components/account/details-form";
import { EmailForm } from "@/components/account/email-form";
import { PageHeader, Section } from "@/components/kit";
import { DeleteAccountForm } from "@/components/social/forms";
import { signOut } from "@/lib/account/actions";
import { requireAccount } from "@/lib/account/server";
import { slimCourses, slimTopics } from "@/lib/account/slim";

export const metadata: Metadata = { title: "Your details" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const account = await requireAccount("/dashboard/settings");
  return (
    <>
      <PageHeader
        title="Your details"
        intro="What you study and what you want help with. Your dashboard updates as soon as you save."
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Your details" },
        ]}
      />
      <Section rule={false}>
        <div className="max-w-4xl">
          <DetailsForm
            mode="edit"
            needsProfile={false}
            initial={account.details}
            next="/dashboard"
            courses={slimCourses()}
            topics={slimTopics()}
          />
        </div>
      </Section>
      <Section id="account" title="Account">
        <div className="max-w-4xl">
          <dl className="divide-y border-y text-sm">
            <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr]">
              <dt className="text-muted-foreground">Username</dt>
              <dd className="font-medium">{account.profile.username}</dd>
            </div>
            <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr]">
              <dt className="text-muted-foreground">Email</dt>
              <dd>
                {account.email}{" "}
                <span className="text-muted-foreground">
                  (never shown to anyone)
                </span>
              </dd>
            </div>
            <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr]">
              <dt className="text-muted-foreground">Password</dt>
              <dd>
                <Link
                  href="/account/password"
                  className="text-primary font-medium underline underline-offset-4"
                >
                  Change password
                </Link>
              </dd>
            </div>
          </dl>
          <div className="mt-8">
            <h3 className="font-semibold">Change your email</h3>
            <p className="text-muted-foreground mt-1 mb-4 text-sm">
              Use an address you can get into. It's where sign-in and reset
              links go.
            </p>
            <EmailForm />
          </div>
          <form action={signOut} className="mt-6">
            <button
              type="submit"
              className="hover:bg-muted rounded-md border px-4 py-2 text-sm font-medium"
            >
              Sign out
            </button>
          </form>
        </div>
      </Section>
      <Section id="delete" title="Delete your account" className="pb-20">
        <div className="max-w-4xl">
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            This permanently deletes your account, quiz progress, tutor requests
            and messages, and everything you've posted on{" "}
            <Link
              href="/social"
              className="text-primary underline underline-offset-4"
            >
              IlluminatEDSocial
            </Link>
            . It can't be undone.
          </p>
          <div className="mt-6">
            <DeleteAccountForm />
          </div>
        </div>
      </Section>
    </>
  );
}
