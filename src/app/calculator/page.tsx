import type { Metadata } from "next";

import { type CalcKind, GradeCalculator } from "@/components/grade-calculator";
import { PageHeader, Section } from "@/components/kit";
import { Tiggy } from "@/components/tiggy";
import { getAccount } from "@/lib/account/server";

export const metadata: Metadata = {
  title: "Grade calculator",
  description:
    "Work out your grade from your paper marks and what you need on the papers you haven't sat yet.",
};
export const dynamic = "force-dynamic";

export default async function CalculatorPage() {
  const account = await getAccount();
  const stage = account?.details?.stage;
  const initial: CalcKind =
    stage === "alevel"
      ? "alevel"
      : stage === "gcse"
        ? "gcse"
        : stage
          ? "weighted"
          : "gcse";
  return (
    <>
      <PageHeader
        title="Grade calculator"
        intro="Put in your marks to see your grade, how close you are to the next one, and exactly what you need on the papers still to come."
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Grade calculator" },
        ]}
        aside={<Tiggy action="think" className="w-32 lg:w-36" />}
      />
      <Section rule={false} className="pb-20">
        <GradeCalculator initial={initial} />
        <p className="text-muted-foreground mt-12 max-w-3xl text-sm leading-relaxed">
          This is a planning tool, not a prediction. Grade boundaries are set
          after each exam series and change every year. Your final grade depends
          on your board's boundaries for that series, and some qualifications
          combine components in ways a simple percentage can't show. Check your
          specification, and ask your teacher if you're unsure.
        </p>
      </Section>
    </>
  );
}
