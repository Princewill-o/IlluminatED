import Link from "next/link";

import type { Metadata } from "next";

import { PageHeader, Section } from "@/components/kit";
import { RequestForm } from "@/components/tutoring/request-form";
import { requireAccount } from "@/lib/account/server";
import { slimCourses, slimTopics } from "@/lib/account/slim";
import { getPrices } from "@/lib/tutoring-server";

export const metadata: Metadata = { title: "Request a tutor" };
export const dynamic = "force-dynamic";

export default async function RequestPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string; topic?: string }>;
}) {
  const sp = await searchParams;
  const account = await requireAccount("/tutors/request");
  const { prices } = await getPrices();
  const all = slimCourses();
  const mineIds = new Set(account.details.subjects.map((s) => s.courseId));
  return (
    <>
      <PageHeader
        title="Request a tutor"
        intro={
          <>
            Tell us what you need. You'll see the price before you send it.{" "}
            <Link
              href="/tutors"
              className="text-primary underline underline-offset-4"
            >
              How tutoring works
            </Link>
          </>
        }
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Tutoring", href: "/tutors" },
          { label: "Request" },
        ]}
      />
      <Section rule={false} className="pb-20">
        <div className="max-w-4xl">
          <RequestForm
            prices={prices}
            mine={all.filter((c) => mineIds.has(c.id))}
            others={all.filter((c) => !mineIds.has(c.id))}
            topics={slimTopics()}
            under18={account.details.ageBand !== "18+"}
            defaultCourse={
              all.some((c) => c.id === sp.course) ? sp.course : undefined
            }
            defaultTopic={sp.topic}
          />
        </div>
      </Section>
    </>
  );
}
