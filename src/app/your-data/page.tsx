import Link from "next/link";

import type { Metadata } from "next";

import { EducationDataPanel } from "@/components/education-data-panel";
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
        intro="What's saved to your account, what stays in this browser, and how to clear or delete it. Our privacy policy has the full details."
        crumbs={[{ label: "Home", href: "/" }, { label: "Your data" }]}
      />
      <Section rule={false}>
        <div className="grid gap-14 lg:grid-cols-[1fr_340px]">
          <div>
            <EducationDataPanel />
            <YourDataPanel />
          </div>
          <div className="text-muted-foreground space-y-5 text-sm leading-relaxed">
            <p>
              <strong className="text-foreground">In this browser</strong> we
              save things like your revision planner, flashcard marks and
              recently viewed pages and a local copy of syllabus checklists,
              next-step preferences and saved opportunities. Guest choices stay
              on this device. Signed-in choices sync to your account; offline
              edits retry when connected. The browser panel clears local copies
              only.
            </p>
            <p>
              <strong className="text-foreground">In your account</strong> we
              store your email (to sign you in, never shown to anyone), your
              username, age range, year group, subjects, the topics you want
              help with, quiz results, syllabus revision ticks, career choices,
              saved opportunities, tutor requests and messages, and any forum
              posts. We don't ask for your real name or school. You can change
              your details or{" "}
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
              sent with them. Wikipedia summaries are the exception: your
              browser fetches them directly, so Wikipedia sees your IP address.
            </p>
            <p>
              Read our{" "}
              <Link
                href="/privacy"
                className="text-primary underline underline-offset-4"
              >
                privacy policy
              </Link>{" "}
              for who we share data with, how long we keep it and your rights,
              and our{" "}
              <Link
                href="/cookies"
                className="text-primary underline underline-offset-4"
              >
                cookies page
              </Link>{" "}
              for everything saved in your browser.
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
