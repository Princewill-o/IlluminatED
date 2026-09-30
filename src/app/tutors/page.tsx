import Link from "next/link";

import type { Metadata } from "next";

import { Note, PageHeader, Section } from "@/components/kit";
import { PriceTable } from "@/components/tutoring/price-table";
import { getAccount } from "@/lib/account/server";
import { getPrices } from "@/lib/tutoring-server";

export const metadata: Metadata = {
  title: "Tutoring",
  description:
    "One-to-one help with homework, coursework guidance and exam preparation. Choose how quickly you need a tutor.",
};
export const dynamic = "force-dynamic";

const STEPS = [
  [
    "Tell us what you need",
    "Pick the subject, the kind of help and how quickly you need it. Describe the question or task.",
  ],
  [
    "A tutor takes it on",
    "A tutor who teaches that subject accepts your request within the time for your tier.",
  ],
  [
    "Work through it together",
    "Message your tutor on IlluminatED, or arrange a live one-to-one session.",
  ],
  [
    "Mark it done",
    "Close the request when you're happy. You can ask for more help any time.",
  ],
];

export default async function TutorsPage() {
  const [{ prices }, account] = await Promise.all([getPrices(), getAccount()]);
  const cta = account ? "/tutors/request" : "/sign-in?next=/tutors/request";
  return (
    <>
      <PageHeader
        title="Get help from a tutor"
        intro="One-to-one help with homework, coursework and exam preparation from tutors who know your subject. You choose how fast you need them."
        crumbs={[{ label: "Home", href: "/" }, { label: "Tutoring" }]}
      >
        <Link
          href={cta}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center rounded-md px-5 text-sm font-semibold"
        >
          Request a tutor
        </Link>
      </PageHeader>

      <Section
        id="prices"
        title="Prices"
        intro="Each price is for one request: a piece of homework, one coursework check-in, or one hour of exam prep or live tutoring. Faster tiers cost more because a tutor has to drop what they're doing."
      >
        <PriceTable prices={prices} />
        <Note className="mt-8">
          Sending a request doesn't charge you anything. Online payment isn't
          switched on yet, so we'll confirm how to pay before your tutor starts.
          If nobody takes your request in time, you won't pay.
        </Note>
      </Section>

      <Section id="how" title="How it works">
        <ol className="grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="border-t pt-4">
              <span className="text-muted-foreground text-sm tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="mt-2 font-semibold">{t}</p>
              <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                {d}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="rules" title="Keeping it fair and safe">
        <dl className="grid gap-x-16 gap-y-8 md:grid-cols-2">
          <div>
            <dt className="font-semibold">Coursework stays your own work</dt>
            <dd className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Exam boards' rules (set by the JCQ for GCSE and A level) say
              assessed coursework and NEA must be your own. Tutors can explain
              ideas, suggest how to plan and point you to sources. They won't
              write, rewrite or mark drafts of assessed work. If you're not sure
              what's allowed, ask your teacher.
            </dd>
          </div>
          <div>
            <dt className="font-semibold">
              Under 18? We check with a parent first
            </dt>
            <dd className="text-muted-foreground mt-2 text-sm leading-relaxed">
              If you're under 18 we ask for a parent or guardian's email with
              your request, and we contact them before any tutor can take it on.
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Everything stays on IlluminatED</dt>
            <dd className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Messages happen here, not by phone or social media. Email
              addresses and phone numbers are blocked in messages. Our team can
              review conversations if there's a concern.
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Checked tutors</dt>
            <dd className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Tutors are added by our team after identity and reference checks,
              including an enhanced DBS check for anyone working with under-18s.
            </dd>
          </div>
        </dl>
        <p className="text-muted-foreground mt-10 text-sm">
          Worried about something that happened? Read{" "}
          <Link
            href="/social/guidelines#help"
            className="text-primary underline underline-offset-4"
          >
            who to talk to
          </Link>
          .
        </p>
      </Section>
    </>
  );
}
