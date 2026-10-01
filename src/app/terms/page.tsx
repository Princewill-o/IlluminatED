import Link from "next/link";

import type { Metadata } from "next";

import { HowToContact, LegalPage } from "@/components/legal";
import { OPERATOR_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of use",
  description:
    "The rules for using IlluminatED and IlluminatEDSocial, including accounts, the forum and paid tutoring.",
};

const TOC = [
  { id: "who", label: "Who can use it" },
  { id: "accounts", label: "Accounts" },
  { id: "community", label: "Community rules" },
  { id: "content", label: "Our content" },
  { id: "tutoring", label: "Tutoring" },
  { id: "use", label: "Acceptable use" },
  { id: "suspension", label: "Suspension" },
  { id: "liability", label: "Liability" },
  { id: "law", label: "Governing law" },
  { id: "changes", label: "Changes and contact" },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      intro="The agreement between you and us when you use IlluminatED and IlluminatEDSocial."
      crumb="Terms"
      toc={TOC}
      summary={
        <ul>
          <li>You need to be 13 or over to use IlluminatED.</li>
          <li>Keep your account and password to yourself.</li>
          <li>
            Be kind on the forum, follow the community guidelines, and never
            share contact details.
          </li>
          <li>
            Our notes are checked carefully but aren't official exam board
            material. Always check your own specification.
          </li>
          <li>
            Tutors are independent. If nobody takes your request in time, you
            get your money back.
          </li>
        </ul>
      }
    >
      <p>
        These terms are an agreement between you and {OPERATOR_NAME}, which runs
        IlluminatED and the IlluminatEDSocial forum ("we", "us"). By creating an
        account or using the site, you agree to them. Please also read our{" "}
        <Link href="/privacy">privacy policy</Link>.
      </p>

      <h2 id="who">Who can use IlluminatED</h2>
      <ul>
        <li>
          You must be <strong>13 or over</strong>. If you're under 13, please
          don't sign up. We'll delete accounts we find belong to under-13s.
        </li>
        <li>
          If you're <strong>under 18</strong>, a parent or guardian must agree
          before you get paid tutoring. We'll contact them before a tutor can
          take on your request.
        </li>
        <li>
          Everything except a few public pages (like this one) needs a free
          account.
        </li>
      </ul>

      <h2 id="accounts">Accounts and security</h2>
      <ul>
        <li>One account per person. Don't share it or use someone else's.</li>
        <li>
          Use a strong password you don't use anywhere else, and keep it and
          your email account secure. Tell us straight away if you think someone
          else has got into your account.
        </li>
        <li>
          Choose a username that doesn't include your real name, school or
          anything offensive. We may change or remove usernames that break our
          rules.
        </li>
        <li>
          You can delete your account at any time in{" "}
          <Link href="/dashboard/settings#delete">settings</Link>.
        </li>
      </ul>

      <h2 id="community">Community rules</h2>
      <p>
        When you post on IlluminatEDSocial or message a tutor, you agree to
        follow our <Link href="/social/guidelines">community guidelines</Link>.
        In short: be kind, stay on topic, don't share personal information
        (yours or anyone else's), and report anything that worries you. You're
        responsible for what you post. You keep ownership of it, but you let us
        show it on the site for as long as it's there.
      </p>

      <h2 id="content">Our content</h2>
      <ul>
        <li>
          Our study notes, quizzes and flashcards are written by us and checked
          against the exam boards' published specifications. They are{" "}
          <strong>not official exam board material</strong>, and we aren't
          connected to or endorsed by any exam board, Ofqual or the Department
          for Education.
        </li>
        <li>
          We work hard to keep things accurate, but mistakes can happen and
          specifications change. Always check against your own specification and
          follow your teacher's advice. If you spot a mistake,{" "}
          <HowToContact topic="correction" />.
        </li>
        <li>
          You can use our content for your own study. Please don't copy it to
          sell or republish.
        </li>
        <li>Quiz scores are for practice. They aren't predicted grades.</li>
      </ul>

      <h2 id="tutoring">Tutoring</h2>
      <ul>
        <li>
          Tutors are <strong>independent</strong>. They aren't our employees. We
          check them before they join, including an enhanced DBS check for
          anyone working with under-18s, and we can review their messages.
        </li>
        <li>
          <strong>Speed tiers.</strong> When you ask for help you choose how
          fast you need it. Each tier has a time within which we aim to match
          you with a tutor, shown with the price before you send your request:
          Flexible (within 72 hours), Priority (within 24 hours) and Urgent
          (within 4 hours). Faster tiers cost more.
        </li>
        <li>
          <strong>Refunds.</strong> Sending a request doesn't charge you. If
          you've paid and no tutor is matched within your tier's time, you'll
          get a full refund, or you can choose to keep waiting. If something
          goes wrong with a session, <HowToContact topic="tutoring" /> and we'll
          put it right. This doesn't affect your legal rights as a consumer.
        </li>
        <li>
          <strong>No contact outside the platform.</strong> All messages between
          learners and tutors must stay on IlluminatED. Don't swap email
          addresses, phone numbers or social media, and don't arrange to meet or
          pay outside the site. Tutors who try to will be removed.
        </li>
        <li>
          <strong>Your own work.</strong> Tutors won't write or mark assessed
          coursework for you. Exam board rules say it must be your own.
        </li>
      </ul>

      <h2 id="use">Acceptable use</h2>
      <p>You must not:</p>
      <ul>
        <li>bully, harass, threaten or pretend to be someone else</li>
        <li>
          post anything illegal, sexual, hateful or violent, or anything that
          encourages self-harm
        </li>
        <li>share anyone's personal information or contact details</li>
        <li>post adverts, spam or links to cheating services</li>
        <li>
          try to break, overload, scrape or get around the security of the site
        </li>
        <li>use the site to sell or promote anything without our permission</li>
      </ul>

      <h2 id="suspension">Suspension and removal</h2>
      <p>
        If you break these terms or the community guidelines, we may hide or
        delete your posts, stop you posting, suspend your account or close it.
        We'll usually tell you why, unless doing so could put someone at risk.
        If you think we've made a mistake, <HowToContact topic="account" />.
      </p>

      <h2 id="liability">Our liability</h2>
      <p>
        We provide IlluminatED as it is, and we can't promise it will always be
        available or free of mistakes. As far as the law allows, we aren't
        responsible for exam results, for decisions you make based on our
        content, or for losses we couldn't reasonably have expected. Nothing in
        these terms limits our liability where the law doesn't allow it, for
        example for death or personal injury caused by our negligence, or for
        fraud, and nothing affects your legal rights as a consumer.
      </p>

      <h2 id="law">Governing law</h2>
      <p>
        These terms are governed by the law of England and Wales, and the courts
        of England and Wales can deal with any dispute. If you live in Scotland
        or Northern Ireland, you can also bring a claim in your local courts.
      </p>

      <h2 id="changes">Changes to these terms, and contact</h2>
      <p>
        We may update these terms as the site changes. We'll change the date at
        the top, and for important changes we'll let you know on the site or by
        email before they take effect. If you keep using IlluminatED after that,
        the new terms apply.
      </p>
      <p>
        If you have questions about these terms, <HowToContact />.
      </p>
    </LegalPage>
  );
}
