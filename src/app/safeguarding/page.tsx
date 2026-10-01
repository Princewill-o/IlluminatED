import Link from "next/link";

import type { Metadata } from "next";

import { CrisisHelp } from "@/components/crisis-help";
import { HowToContact, LegalPage } from "@/components/legal";
import { DSL_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Safeguarding",
  description:
    "How IlluminatED keeps young people safe, how to report a concern, and where to get help right now.",
};

const TOC = [
  { id: "help", label: "Get help now" },
  { id: "how", label: "How we keep you safe" },
  { id: "report", label: "Report a concern" },
  { id: "next", label: "What happens next" },
  { id: "lead", label: "Our safeguarding lead" },
];

export default function SafeguardingPage() {
  return (
    <LegalPage
      title="Safeguarding"
      intro="Keeping learners safe comes first. Here's how we do it, how to tell us if something's wrong, and where to get help straight away."
      crumb="Safeguarding"
      toc={TOC}
    >
      <h2 id="help">Get help now</h2>
      <CrisisHelp className="mt-4" />

      <h2 id="how">How we keep you safe</h2>
      <ul>
        <li>
          <strong>Moderation.</strong> Our moderators review reported posts.
          Anything reported by three different people is hidden automatically
          until a moderator checks it. Reports that someone may be at risk, or
          that personal information has been shared, go to the top of the list.
        </li>
        <li>
          <strong>Designed for young people.</strong> The site is for ages 13
          and over. We don't ask for real names, schools or dates of birth, and
          there are no adverts or tracking.
        </li>
        <li>
          <strong>No private contact details.</strong> Email addresses and phone
          numbers are blocked on the forum and in tutor messages, so nobody can
          move a conversation somewhere we can't see.
        </li>
        <li>
          <strong>Tutoring messages can be reviewed.</strong> All messages
          between learners and tutors stay on IlluminatED, and our team can read
          them if there's a concern. Tutors are checked before they join,
          including an enhanced DBS check for anyone working with under-18s.
        </li>
        <li>
          <strong>Parent or guardian consent.</strong> Learners under 18 need a
          parent or guardian's agreement before any tutor can take on their
          request.
        </li>
        <li>
          <strong>Blocking.</strong> You can block any member from their profile
          page, so you won't see their threads or replies.
        </li>
      </ul>

      <h2 id="report">How to report a concern</h2>
      <p>
        You can tell us about a worrying post, another member, a tutor, or
        anything else that makes you feel unsafe. You don't need to be sure
        something's wrong.
      </p>
      <ul>
        <li>
          <strong>A post or reply:</strong> press <em>Report</em> under it and
          choose a reason. If someone may be at risk, choose "Someone may be at
          risk".
        </li>
        <li>
          <strong>A member, a tutor or anything else:</strong>{" "}
          <HowToContact topic="safeguarding" /> and choose "Safeguarding or
          safety concern". Tell us what happened, when, and the username or a
          link if you have one.
        </li>
      </ul>
      <p>
        <Link
          href="/contact?topic=safeguarding"
          className="bg-primary text-primary-foreground! inline-flex h-11 items-center rounded-md px-5 text-sm font-semibold no-underline!"
        >
          Report a safeguarding concern
        </Link>
      </p>
      <p>
        If you're a parent, carer or teacher, you can report too. If someone is
        in danger right now, call 999 first.
      </p>

      <h2 id="next">What happens next</h2>
      <ul>
        <li>
          Safeguarding messages and urgent reports are read first, before
          anything else.
        </li>
        <li>
          We may hide posts, block messages or suspend accounts straight away
          while we look into it.
        </li>
        <li>
          We'll reply to you by email if you gave us one. We may not be able to
          tell you everything we've done, to protect everyone involved.
        </li>
        <li>
          If we think a child or young person is at risk of harm, we'll share
          what we know with the right people, such as the police, children's
          services or CEOP. We only share what's needed to keep them safe.
        </li>
        <li>
          If a tutor is involved, we'll stop them working with learners while we
          investigate, and report to the Disclosure and Barring Service where
          the law requires.
        </li>
      </ul>

      <h2 id="lead">Our Designated Safeguarding Lead</h2>
      <p>
        {DSL_NAME === "Our safeguarding lead" ? (
          <>
            Our Designated Safeguarding Lead is responsible for safeguarding on
            IlluminatED.
          </>
        ) : (
          <>
            Our Designated Safeguarding Lead is <strong>{DSL_NAME}</strong>.
            They're responsible for safeguarding on IlluminatED.
          </>
        )}{" "}
        They read every safeguarding message, decide what needs to happen, and
        make referrals to other agencies. You can reach them by choosing
        "Safeguarding or safety concern" on the{" "}
        <Link href="/contact?topic=safeguarding">contact form</Link>.
      </p>
      <p>
        Read our <Link href="/social/guidelines">community guidelines</Link> and{" "}
        <Link href="/privacy">privacy policy</Link> for more on how we keep the
        forum and your data safe.
      </p>
    </LegalPage>
  );
}
