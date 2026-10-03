import Link from "next/link";

import type { Metadata } from "next";

import { PageHeader, Section } from "@/components/kit";
import { NextSteps } from "@/components/next-steps";
import { getAccount } from "@/lib/account/server";
export const metadata: Metadata = {
  title: "Your next steps",
  description:
    "Explore university and apprenticeships, find Year 12 work experience, and browse updating event and vacancy sources.",
};
export default async function NextStepsPage() {
  const account = await getAccount();
  return (
    <>
      <PageHeader
        title="Your next steps"
        intro="University, an apprenticeship, or still deciding? Build a plan, try work experience and meet people who can help."
        crumbs={[{ label: "Home", href: "/" }, { label: "Your next steps" }]}
      />
      <Section rule={false}>
        <Link href="/jobs" className="text-primary mb-6 block underline">
          Browse jobs, apprenticeships and university suggestions
        </Link>
        <NextSteps
          userId={account?.id}
          initialYear={account?.details?.yearGroup ?? "year-12"}
        />
      </Section>
    </>
  );
}
