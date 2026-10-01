import Link from "next/link";

import type { Metadata } from "next";

import { ApplyForm } from "./apply-form";

import { PageHeader, Section } from "@/components/kit";
import { isTutor, requireAccount } from "@/lib/account/server";
import { getSupabase } from "@/lib/social/server";

export const metadata: Metadata = { title: "Apply to tutor" };
export const dynamic = "force-dynamic";

const STATUS_TEXT: Record<string, string> = {
  pending: "Waiting for review",
  approved: "Approved",
  rejected: "Not approved",
};

export default async function ApplyPage() {
  const account = await requireAccount("/tutors/apply");
  const sb = await getSupabase();
  const { data: apps } = sb
    ? await sb
        .from("tutor_applications")
        .select("id, status, created_at, reviewed_at")
        .eq("user_id", account.id)
        .order("created_at", { ascending: false })
        .limit(5)
    : { data: [] };
  const latest = apps?.[0];
  const adult = account.details.ageBand === "18+";

  let body: React.ReactNode;
  if (isTutor(account))
    body = (
      <p className="text-muted-foreground">
        You're already a tutor.{" "}
        <Link
          href="/tutors/desk"
          className="text-primary underline underline-offset-4"
        >
          Go to the tutor desk
        </Link>
        .
      </p>
    );
  else if (!adult)
    body = (
      <p className="text-muted-foreground max-w-2xl leading-relaxed">
        You need to be 18 or over to tutor with IlluminatED. If your account
        shows the wrong age, update it in your account details.
      </p>
    );
  else if (latest?.status === "pending")
    body = (
      <p className="text-muted-foreground max-w-2xl leading-relaxed">
        Thanks for applying. Your application from{" "}
        {new Date(latest.created_at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}{" "}
        is waiting for review. We'll be in touch.
      </p>
    );
  else
    body = (
      <>
        {latest && (
          <p className="text-muted-foreground mb-8 text-sm">
            Your last application: {STATUS_TEXT[latest.status] ?? latest.status}
            . You can apply again below.
          </p>
        )}
        <ApplyForm />
      </>
    );

  return (
    <>
      <PageHeader
        title="Apply to tutor"
        intro="Tutors help learners with homework, coursework guidance and exam preparation, all through IlluminatED. Tell us about yourself and our team will review your application."
        crumbs={[{ label: "Tutoring", href: "/tutors" }, { label: "Apply" }]}
      />
      <Section rule={false} className="pb-20">
        <div className="text-muted-foreground mb-8 max-w-2xl space-y-3 text-sm leading-relaxed">
          <p>
            Before you can take requests we check your identity and references,
            and anyone working with under-18s needs an enhanced DBS check. All
            contact with learners stays on IlluminatED.
          </p>
        </div>
        {body}
      </Section>
    </>
  );
}
