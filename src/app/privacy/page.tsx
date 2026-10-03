import Link from "next/link";

import type { Metadata } from "next";

import { ExternalLink } from "@/components/kit";
import { HowToContact, LegalPage } from "@/components/legal";
import { CONTACT_EMAIL, OPERATOR_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "What personal data IlluminatED collects, why, who we share it with, how long we keep it, and your rights under UK data protection law.",
};

const TOC = [
  { id: "who", label: "Who we are" },
  { id: "collect", label: "What we collect" },
  { id: "why", label: "Why we use it" },
  { id: "children", label: "Children and young people" },
  { id: "share", label: "Who we share it with" },
  { id: "keep", label: "How long we keep it" },
  { id: "rights", label: "Your rights" },
  { id: "complain", label: "Complaints" },
  { id: "changes", label: "Changes" },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      intro="How we look after your personal data, written to be read by learners, parents and carers."
      crumb="Privacy"
      toc={TOC}
      summary={
        <ul>
          <li>
            IlluminatED is for people aged 13 and over. Under-13s must not sign
            up.
          </li>
          <li>
            We collect as little as we can. We never ask for your real name,
            school, date of birth or where you live.
          </li>
          <li>
            No adverts, no tracking for adverts, and we never sell your data.
          </li>
          <li>
            Your data is stored in London. The companies that help us run the
            site only use it to do that job for us.
          </li>
          <li>
            You can see, change or delete your data. You can delete your whole
            account yourself in settings, at any time.
          </li>
          <li>
            If you're under 18 and ask for a paid tutor, we ask a parent or
            guardian to agree first.
          </li>
          <li>
            When you use Ask Tiggy, your messages go to an AI model provider to
            get an answer. We don't keep them: we only count how many you've
            sent today.
          </li>
        </ul>
      }
    >
      <h2 id="who">Who we are</h2>
      <p>
        IlluminatED (including the IlluminatEDSocial forum) is run by{" "}
        {OPERATOR_NAME}. We are the <strong>controller</strong> of your personal
        data. That means we decide how it's used and we're responsible for
        looking after it under the UK General Data Protection Regulation (UK
        GDPR) and the Data Protection Act 2018.
      </p>
      <p>
        To ask anything about your data, <HowToContact topic="privacy" /> and
        choose "Privacy or my data".
      </p>

      <h2 id="collect">What we collect</h2>
      <h3>When you create an account</h3>
      <ul>
        <li>
          <strong>Your email address</strong>, to sign you in. It's never shown
          to anyone else.
        </li>
        <li>
          <strong>A username</strong> you choose. Other members can see it.
        </li>
        <li>
          <strong>Learner details</strong>: your stage (for example GCSE or A
          level), year group, age range (13 to 15, 16 to 17, or 18+), your
          subjects and exam boards, the topics you want help with, an optional
          note about what you find hard, and an optional exam date.
        </li>
      </ul>
      <h3>When you use the site</h3>
      <ul>
        <li>
          <strong>Quiz progress</strong>: which questions you've answered, how
          many you got right, and your quiz rounds.
        </li>
        <li>
          <strong>Study and career choices</strong>: signed-in syllabus
          checklist ticks, university or apprenticeship preferences, your
          selected year and saved opportunities. Guest choices remain in your
          browser. You can download or clear account choices on the Your data
          page.
        </li>
        <li>
          <strong>Forum activity</strong>: threads and replies you post, reports
          you make, and members you've blocked.
        </li>
        <li>
          <strong>Tutoring</strong>: your tutor requests (subject, topic, the
          kind of help, how fast you need it, details and availability you
          type), the price, and messages between you and your tutor. If you're
          under 18, we also store{" "}
          <strong>a parent or guardian's email address</strong> so we can ask
          for their agreement.
        </li>
        <li>
          <strong>Ask Tiggy</strong>: we <strong>don't store</strong> what you
          type to Tiggy or its replies on our servers. We keep only{" "}
          <strong>how many messages you've sent today</strong> (for the daily
          limit). If a message suggests you or someone else may be at risk, we
          also record a <strong>safeguarding flag</strong>: just a category
          (such as "self-harm" or "abuse") and the time, linked to your account,
          never the message itself. Your current conversation is kept only in
          your browser tab (see our <Link href="/cookies">cookies page</Link>).
        </li>
        <li>
          <strong>Premium</strong>: if you subscribe, we store your plan, its
          status and renewal date, and the reference numbers Stripe gives your
          customer record and subscription. Stripe holds your payment details;
          we never see your card number. If you're under 18, we also record that
          you confirmed a parent or guardian agreed.
        </li>
        <li>
          <strong>Messages to us</strong> through the contact form: your email,
          an optional name, the topic and your message.
        </li>
        <li>
          <strong>Technical records</strong>: like almost every website, our
          hosting and database providers keep short-lived logs of requests,
          including IP addresses and sign-in times, to keep the site working and
          secure.
        </li>
      </ul>
      <h3>What we don't collect</h3>
      <p>
        We don't ask for your real name, school, date of birth, address, phone
        number or photo. We don't use your location. We don't collect health
        information or other sensitive details, so please don't post them on the
        forum.
      </p>
      <p>
        Some things are saved only in your browser, not sent to us. Our{" "}
        <Link href="/cookies">cookies page</Link> lists them, and you can clear
        them on the <Link href="/your-data">Your data</Link> page.
      </p>

      <h2 id="why">Why we use it, and our lawful bases</h2>
      <p>
        UK GDPR says we need a lawful reason (a "lawful basis") for each way we
        use your data. Ours are:
      </p>
      <table>
        <thead>
          <tr>
            <th>What we do</th>
            <th>Lawful basis</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              Run your account, save your quiz progress, show your dashboard and
              suggest what to revise next
            </td>
            <td>
              <strong>Contract</strong>: it's the service you signed up for
            </td>
          </tr>
          <tr>
            <td>Run the forum and match you with a tutor when you ask</td>
            <td>
              <strong>Contract</strong>
            </td>
          </tr>
          <tr>
            <td>
              Keep people safe: moderation, dealing with reports, blocking
              contact details, stopping spam and misuse, and keeping the site
              secure
            </td>
            <td>
              <strong>Legitimate interests</strong>: keeping a site for young
              people safe. We've checked this doesn't override your rights
            </td>
          </tr>
          <tr>
            <td>
              Answer your questions with Ask Tiggy, count your daily messages
              and run Premium subscriptions
            </td>
            <td>
              <strong>Contract</strong>
            </td>
          </tr>
          <tr>
            <td>
              Record Ask Tiggy safeguarding flags so moderators can check if
              someone may need help
            </td>
            <td>
              <strong>Legitimate interests</strong> and safeguarding (see below)
            </td>
          </tr>
          <tr>
            <td>Reply to messages you send us</td>
            <td>
              <strong>Legitimate interests</strong>
            </td>
          </tr>
          <tr>
            <td>Paid tutoring for learners under 18</td>
            <td>
              <strong>Consent</strong> from a parent or guardian, as well as
              contract. A parent or guardian can withdraw consent at any time
            </td>
          </tr>
          <tr>
            <td>Keeping payment records</td>
            <td>
              <strong>Legal obligation</strong>: tax law says we must keep them
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        If a report or message tells us someone may be at risk, we may use or
        share that information to protect them. The Data Protection Act 2018
        allows this for safeguarding children and people at risk. See our{" "}
        <Link href="/safeguarding">safeguarding page</Link>.
      </p>
      <p>
        We don't make any decisions about you by computer alone that have legal
        or similarly serious effects. Ask Tiggy's safeguarding check only shows
        you where to get help and lets a moderator know; a person decides
        whether anything else needs to happen.
      </p>

      <h2 id="children">Children and young people</h2>
      <p>
        IlluminatED is built for learners aged about 13 to 19, so we follow the
        ICO's{" "}
        <ExternalLink href="https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/">
          Children's Code
        </ExternalLink>{" "}
        (the Age Appropriate Design Code). In practice:
      </p>
      <ul>
        <li>
          <strong>Under-13s must not sign up.</strong> If we find out someone
          under 13 has an account, we'll delete it.
        </li>
        <li>
          <strong>High privacy by default.</strong> Your email is never shown.
          Other members only see your username and what you post. Nothing is
          shared publicly unless you post it on the forum.
        </li>
        <li>
          <strong>No adverts and no profiling for adverts.</strong> The only
          personalisation is suggesting topics to revise, based on your own quiz
          answers. That's the main point of the dashboard, and it's never used
          for anything else.
        </li>
        <li>
          <strong>We never sell your data</strong> or share it for marketing.
        </li>
        <li>
          <strong>Data minimisation.</strong> We ask for an age range rather
          than a date of birth, and never for your real name or school.
        </li>
        <li>
          <strong>No geolocation.</strong> We don't track where you are.
        </li>
        <li>
          <strong>No contact details on the forum or in tutor messages.</strong>{" "}
          Emails and phone numbers are blocked automatically, so all contact
          stays on the platform.
        </li>
        <li>
          <strong>Parents and guardians</strong> are asked to agree before an
          under-18 gets paid tutoring, and should pay for or agree to Premium.
        </li>
        <li>
          <strong>Ask Tiggy is clearly an AI.</strong> It never asks for
          personal details, and messages with email addresses, phone numbers or
          postcodes aren't sent to it.
        </li>
      </ul>

      <h2 id="share">Who we share it with</h2>
      <p>
        We use a few trusted companies (called "processors") to run the site.
        They only use your data to provide their service to us, under a contract
        that requires them to keep it safe.
      </p>
      <table>
        <thead>
          <tr>
            <th>Company</th>
            <th>What for</th>
            <th>Where</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Supabase</td>
            <td>Our database and sign-in system, including sign-in emails</td>
            <td>Data stored in London (UK)</td>
          </tr>
          <tr>
            <td>Vercel</td>
            <td>Hosting the website</td>
            <td>
              Global network. Any transfer outside the UK is protected by
              safeguards approved under UK law
            </td>
          </tr>
          <tr>
            <td>Stripe (only if card payments are switched on)</td>
            <td>
              Taking payments for tutoring and Premium subscriptions, and the
              page where you manage your subscription. We never see your card
              number
            </td>
            <td>UK, EU and US, with approved safeguards</td>
          </tr>
          <tr>
            <td>Hugging Face (only when Ask Tiggy is switched on)</td>
            <td>
              Sending your Ask Tiggy messages to an AI model provider it works
              with, to generate Tiggy's replies. Along with the conversation we
              send your stage, year group, age range and subjects, so answers
              fit your course, but never your email, username or account ID. We
              don't store the messages ourselves
            </td>
            <td>US and EU, with approved safeguards</td>
          </tr>
          <tr>
            <td>Resend (only if we switch on email notifications)</td>
            <td>Sending emails, such as sign-in links and tutoring updates</td>
            <td>With approved safeguards</td>
          </tr>
        </tbody>
      </table>
      <p>
        Tutors see what you write in a tutor request and your messages with
        them, but not your email address. Moderators can see reports, hidden
        posts and tutoring messages when they need to keep people safe.
      </p>
      <h3>Public information services</h3>
      <p>
        Some pages look things up from free public services: the{" "}
        <strong>Ofqual Register</strong> (qualifications),{" "}
        <strong>DfE Explore Education Statistics</strong>,{" "}
        <strong>Open Library</strong> (books), <strong>GOV.UK</strong> (official
        guidance), <strong>Skills England</strong> (apprenticeships) and{" "}
        <strong>Gutendex</strong> (free set texts from Project Gutenberg). We
        send them only the words you search for, through our own server, so they
        don't receive your IP address or anything that identifies you. When Ask
        Tiggy looks up official guidance on GOV.UK, our server sends a fixed
        topic name (such as "student finance"), never your message. If our
        server can't reach them, your browser may ask them directly, and they'll
        see your IP address as with any website.
      </p>
      <p>
        Topic summaries on the reading page come straight from{" "}
        <strong>Wikipedia</strong> in your browser, so the Wikimedia Foundation
        sees your IP address and what you searched for, under{" "}
        <ExternalLink href="https://foundation.wikimedia.org/wiki/Policy:Privacy_policy">
          its own privacy policy
        </ExternalLink>
        .
      </p>
      <p>
        We'll only share personal data with anyone else if the law requires it,
        or to protect someone from serious harm (for example with the police or
        children's services).
      </p>

      <h2 id="keep">How long we keep it</h2>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>How long</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Your account, learner details and quiz progress</td>
            <td>Until you delete your account</td>
          </tr>
          <tr>
            <td>Forum posts and blocks</td>
            <td>
              Until you delete them, a moderator removes them, or you delete
              your account
            </td>
          </tr>
          <tr>
            <td>Deleted accounts</td>
            <td>
              Erased straight away. Copies in our backups roll off within 30
              days
            </td>
          </tr>
          <tr>
            <td>Reports of posts</td>
            <td>12 months</td>
          </tr>
          <tr>
            <td>Messages sent through the contact form</td>
            <td>
              12 months after we've dealt with them. Safeguarding concerns may
              be kept longer if we need them to protect someone
            </td>
          </tr>
          <tr>
            <td>Tutoring requests, messages and guardian emails</td>
            <td>
              Until you delete your account. If you paid, the payment records
              are kept for 6 years, because tax law requires it
            </td>
          </tr>
          <tr>
            <td>Ask Tiggy messages</td>
            <td>
              Not stored by us. Your browser tab keeps the current conversation
              until you close it or start a new chat
            </td>
          </tr>
          <tr>
            <td>Ask Tiggy daily message counts</td>
            <td>About a week, and deleted with your account</td>
          </tr>
          <tr>
            <td>Ask Tiggy safeguarding flags</td>
            <td>
              12 months, then deleted automatically. If your account is deleted,
              the flag is no longer linked to you
            </td>
          </tr>
          <tr>
            <td>Premium subscription status</td>
            <td>
              Until you delete your account. Stripe keeps payment records for 6
              years, because tax law requires it
            </td>
          </tr>
          <tr>
            <td>Technical logs</td>
            <td>Kept by our providers for a short time, usually days</td>
          </tr>
        </tbody>
      </table>

      <h2 id="rights">Your rights</h2>
      <p>Under UK data protection law you have the right to:</p>
      <ul>
        <li>
          <strong>Access</strong>: ask for a copy of the data we hold about you.
        </li>
        <li>
          <strong>Rectification</strong>: correct anything that's wrong. You can
          change most details yourself in{" "}
          <Link href="/dashboard/settings">settings</Link>.
        </li>
        <li>
          <strong>Erasure</strong>: have your data deleted. You can{" "}
          <Link href="/dashboard/settings#delete">delete your account</Link>{" "}
          yourself at any time, which removes your profile, details, progress,
          posts and tutoring history.
        </li>
        <li>
          <strong>Restriction</strong>: ask us to pause using your data while a
          problem is sorted out.
        </li>
        <li>
          <strong>Objection</strong>: object to us using your data for our
          legitimate interests.
        </li>
        <li>
          <strong>Portability</strong>: get the data you gave us in a common
          format, such as a spreadsheet file.
        </li>
        <li>
          <strong>Withdraw consent</strong>: a parent or guardian can withdraw
          consent for tutoring at any time.
        </li>
      </ul>
      <p>
        To use any of these rights, <HowToContact topic="privacy" />
        {CONTACT_EMAIL ? "" : ', choosing "Privacy or my data"'}. We'll reply
        within one month. Young people can make these requests themselves. A
        parent or guardian can also ask on behalf of their child. We may ask for
        something to check it's really you.
      </p>

      <h2 id="complain">Complaints</h2>
      <p>
        If you're unhappy with how we've handled your data, please tell us first
        and we'll try to put it right. You also have the right to complain to
        the Information Commissioner's Office (ICO), the UK's data protection
        regulator:
      </p>
      <ul>
        <li>
          Online at{" "}
          <ExternalLink href="https://ico.org.uk/make-a-complaint/">
            ico.org.uk/make-a-complaint
          </ExternalLink>
        </li>
        <li>
          By phone on <a href="tel:03031231113">0303 123 1113</a>
        </li>
      </ul>

      <h2 id="changes">Changes to this policy</h2>
      <p>
        If we change how we use your data, we'll update this page and the date
        at the top. For big changes, we'll tell you on the site or by email
        before they take effect.
      </p>
    </LegalPage>
  );
}
