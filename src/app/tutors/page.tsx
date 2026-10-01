import Link from "next/link";

import type { Metadata } from "next";

import { Note, PageHeader, Section } from "@/components/kit";
import { Tiggy } from "@/components/tiggy";
import { PriceTable } from "@/components/tutoring/price-table";
import { getAccount } from "@/lib/account/server";
import { paymentsEnabled } from "@/lib/stripe";
import { SPEEDS, formatPrice, hoursLabel } from "@/lib/tutoring";
import { getPrices } from "@/lib/tutoring-server";

export const metadata: Metadata = {
  title: "Tutoring",
  description:
    "One-to-one help with homework, coursework guidance and exam preparation. Choose how quickly you need a tutor.",
};
export const dynamic = "force-dynamic";

const steps = (payments: boolean) => [
  [
    "Tell us what you need",
    "Pick the subject, the kind of help and how quickly you need it, and describe the question or task. You see the price before you send it.",
  ],
  [
    "Consent and payment",
    payments
      ? "If you're under 18, we email your parent or guardian for consent first. Then you pay securely by card through Stripe."
      : "If you're under 18, we email your parent or guardian for consent first. Payment is arranged after a tutor is matched.",
  ],
  [
    "A tutor takes it on",
    "Your request goes to our checked tutors. One who teaches the subject takes it on, and we email you when they do.",
  ],
  [
    "Work through it together",
    "Message your tutor on IlluminatED, or arrange a live one-to-one session. Mark the request done when you're happy.",
  ],
];

export default async function TutorsPage() {
  const [{ prices }, account] = await Promise.all([getPrices(), getAccount()]);
  const cta = account ? "/tutors/request" : "/sign-in?next=/tutors/request";
  const tiers = SPEEDS.map((sp) => ({
    ...sp,
    price: prices.find((p) => p.speed === sp.id),
    from: prices
      .filter((p) => p.speed === sp.id)
      .reduce<
        number | null
      >((m, p) => (m === null || p.pricePence < m ? p.pricePence : m), null),
  }));
  return (
    <>
      <PageHeader
        title="Get help from a tutor"
        intro="One-to-one help with homework, coursework and exam preparation from tutors who know your subject. You choose how fast you need them."
        crumbs={[{ label: "Home", href: "/" }, { label: "Tutoring" }]}
        aside={<Tiggy action="search" className="w-32 lg:w-36" />}
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
          {paymentsEnabled ? (
            <>
              Secure card payment via Stripe. You pay once your request is ready
              for tutors (after parent or guardian consent if you're under 18),
              and tutors can only take paid requests. If no tutor takes your
              request in time, we'll refund you in full.
            </>
          ) : (
            <>
              Sending a request doesn't charge you anything. Payment is arranged
              after a tutor is matched, and we'll confirm how to pay before your
              tutor starts. If nobody takes your request in time, you won't pay.
            </>
          )}
        </Note>
      </Section>

      <Section id="how" title="How it works">
        <ol className="grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-4">
          {steps(paymentsEnabled).map(([t, d], i) => (
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
        <h3 className="mt-12 font-semibold">How quickly tutors respond</h3>
        <dl className="mt-4 grid gap-x-10 gap-y-6 md:grid-cols-3">
          {tiers.map((t) => (
            <div key={t.id} className="border-t pt-4">
              <dt className="font-semibold">
                {t.label}
                {t.from !== null && (
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    · from {formatPrice(t.from)}
                  </span>
                )}
              </dt>
              <dd className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                {t.price
                  ? `A tutor takes it on within ${hoursLabel(t.price.matchHours)}, then replies within ${hoursLabel(t.price.replyHours)}. `
                  : ""}
                {t.summary}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-muted-foreground mt-6 max-w-3xl text-sm leading-relaxed">
          The time to find a tutor counts from when you send your request. If a
          parent or guardian needs to give consent
          {paymentsEnabled ? ", or you haven't paid yet," : ""} tutors can't
          take it on until that's done, so it helps to do it straight away.
        </p>
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
              your request. We email them a link to give consent, and tutors
              can't see or take on the request until they do. If they say no,
              the request is cancelled.
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
              Tutors apply and are approved by our team after identity and
              reference checks, including an enhanced DBS check for anyone
              working with under-18s.{" "}
              <Link
                href="/tutors/apply"
                className="text-primary underline underline-offset-4"
              >
                Apply to tutor
              </Link>
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
