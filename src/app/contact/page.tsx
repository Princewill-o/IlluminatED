import Link from "next/link";

import type { Metadata } from "next";

import { ContactForm } from "@/components/contact-form";
import { PageHeader, Section } from "@/components/kit";
import {
  CONTACT_EMAIL,
  CONTACT_TOPICS,
  type ContactTopic,
  OPERATOR_NAME,
} from "@/lib/site";
import { socialConfigured } from "@/lib/social/config";
import { getViewer } from "@/lib/social/server";

export const metadata: Metadata = {
  title: "Contact us",
  description:
    "Ask a question, report a mistake or a safety concern, or ask about your data.",
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const sp = await searchParams;
  const initialTopic = CONTACT_TOPICS.find((t) => t.value === sp.topic)
    ?.value as ContactTopic | undefined;
  const viewer = await getViewer();

  return (
    <>
      <PageHeader
        title="Contact us"
        intro="Questions, mistakes, safety worries or anything about your data. Send us a message and we'll reply by email."
        crumbs={[{ label: "Home", href: "/" }, { label: "Contact" }]}
      />
      <Section rule={false}>
        <div className="grid gap-14 lg:grid-cols-[1fr_340px]">
          <ContactForm
            initialTopic={initialTopic}
            defaultEmail={viewer?.email}
            disabled={!socialConfigured}
          />
          <div className="text-muted-foreground [&_a]:text-primary space-y-5 text-sm leading-relaxed [&_a]:underline [&_a]:underline-offset-4">
            <p>
              <strong className="text-foreground">
                Worried about someone's safety?
              </strong>{" "}
              Choose "Safeguarding or safety concern". Those messages are read
              first. If someone is in danger right now, call 999. See our{" "}
              <Link href="/safeguarding">safeguarding page</Link> for helplines.
            </p>
            <p>
              <strong className="text-foreground">Reporting a post?</strong> You
              can also use the Report button under any forum post.
            </p>
            <p>
              <strong className="text-foreground">Your data.</strong> To see,
              correct or delete what we hold about you, choose "Privacy or my
              data". You can also delete your account yourself in{" "}
              <Link href="/dashboard/settings#delete">settings</Link>.
            </p>
            {CONTACT_EMAIL && (
              <p>
                <strong className="text-foreground">Prefer email?</strong> Write
                to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
              </p>
            )}
            <p>
              We only use what you send to reply to you and to sort out the
              problem. See our <Link href="/privacy">privacy policy</Link>.{" "}
              {OPERATOR_NAME} runs this site.
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
