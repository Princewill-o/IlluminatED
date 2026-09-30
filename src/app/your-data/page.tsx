import Link from "next/link";

import type { Metadata } from "next";

import { PageHeader, Section } from "@/components/kit";
import { YourDataPanel } from "@/components/widgets";

export const metadata: Metadata = {
  title: "Your data",
  description:
    "What IlluminatED saves in your browser and in your account, and how to delete it.",
};

export default function YourDataPage() {
  return (
    <>
      <PageHeader
        title="Your data"
        intro="Without an account, anything you save stays in this browser. If you sign in, some of it is saved to your account too. Here's what's stored, and how to clear it."
        crumbs={[{ label: "Home", href: "/" }, { label: "Your data" }]}
      />
      <Section rule={false}>
        <div className="grid gap-14 lg:grid-cols-[1fr_340px]">
          <YourDataPanel />
          <div className="text-muted-foreground space-y-5 text-sm leading-relaxed">
            <p>
              <strong className="text-foreground">Without an account</strong> we
              never ask for your name, email, school or grades, and your phone
              and laptop keep separate progress.
            </p>
            <p>
              <strong className="text-foreground">With an account</strong> we
              store your email (to sign you in, never shown to anyone), your
              username, age range, year group, subjects, the topics you want
              help with, quiz results, tutor requests and messages, and any
              forum posts. We don't ask for your real name or school. You can
              change your details or{" "}
              <Link
                href="/dashboard/settings#delete"
                className="text-primary underline underline-offset-4"
              >
                delete your account
              </Link>{" "}
              at any time, which removes all of it.
            </p>
            <p>
              <strong className="text-foreground">Tutoring.</strong> If you're
              under 18 and request a tutor, we also store a parent or guardian's
              email, which only our team can see.
            </p>
            <p>
              <strong className="text-foreground">Searches.</strong> When you
              search qualifications, statistics or books, the words you type go
              to that service to get results. Nothing that identifies you is
              sent with them.
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
