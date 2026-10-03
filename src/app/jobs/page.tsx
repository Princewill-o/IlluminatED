import type { Metadata } from "next";

import { CareerBoard } from "@/components/career-board";
import { PageHeader, Section } from "@/components/kit";
import { getAccount } from "@/lib/account/server";
import { inferInterest } from "@/lib/career-guidance";
export const metadata: Metadata = {
  title: "Jobs, apprenticeships and university",
  description: "Explore work and university routes matched to your interests.",
};
export default async function JobsPage() {
  const account = await getAccount();
  return (
    <>
      <PageHeader
        title="Find your next opportunity"
        intro="Compare apprenticeships, job roles and university routes, starting with what interests you."
        crumbs={[{ label: "Home", href: "/" }, { label: "Opportunities" }]}
      />
      <Section rule={false}>
        <CareerBoard
          initialInterest={inferInterest(
            account?.details?.subjects.map((s) => s.courseId) ?? [],
          )}
          initialRoute={account?.details?.careerRoute ?? "unsure"}
        />
      </Section>
    </>
  );
}
