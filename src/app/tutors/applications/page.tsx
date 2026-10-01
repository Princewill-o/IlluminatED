import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { dbsLabel, levelLabel } from "../apply/options";

import { fieldCls, labelCls, PageHeader, Section } from "@/components/kit";
import { getAccount } from "@/lib/account/server";
import { getSupabase } from "@/lib/social/server";
import { reviewApplication } from "@/lib/tutor-actions";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tutor applications" };
export const dynamic = "force-dynamic";

interface Application {
  id: number;
  user_id: string;
  full_name: string;
  subjects: string;
  levels: string[];
  experience: string;
  qualifications: string;
  dbs_status: string;
  statement: string;
  status: "pending" | "approved" | "rejected";
  reviewer_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  applicant: { username: string } | { username: string }[] | null;
  reviewer: { username: string } | { username: string }[] | null;
}

const name = (p: Application["applicant"]) =>
  (Array.isArray(p) ? p[0] : p)?.username ?? null;

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default async function ApplicationsPage() {
  const account = await getAccount();
  if (!account?.profile) redirect("/sign-in?next=/tutors/applications");
  if (account.profile.role !== "moderator") redirect("/tutors/desk");
  const sb = (await getSupabase())!;
  const cols =
    "id, user_id, full_name, subjects, levels, experience, qualifications, dbs_status, statement, status, reviewer_notes, reviewed_at, created_at, applicant:profiles!tutor_applications_user_id_fkey(username), reviewer:profiles!tutor_applications_reviewer_id_fkey(username)";
  const [{ data: pending }, { data: reviewed }] = await Promise.all([
    sb
      .from("tutor_applications")
      .select(cols)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(100),
    sb
      .from("tutor_applications")
      .select(cols)
      .neq("status", "pending")
      .order("reviewed_at", { ascending: false })
      .limit(30),
  ]);
  const waiting = (pending ?? []) as unknown as Application[];
  const done = (reviewed ?? []) as unknown as Application[];

  return (
    <>
      <PageHeader
        title="Tutor applications"
        intro="Check identity, references and DBS status outside IlluminatED before approving. Approving makes the applicant a tutor straight away."
        crumbs={[
          { label: "Tutor desk", href: "/tutors/desk" },
          { label: "Applications" },
        ]}
      />
      <Section id="pending" title="Waiting for review" rule={false}>
        {waiting.length ? (
          <ul className="divide-y border-y">
            {waiting.map((a) => (
              <li
                key={a.id}
                className="grid gap-6 py-6 lg:grid-cols-[1fr_20rem]"
              >
                <div className="min-w-0 space-y-3 text-sm">
                  <p className="text-base font-semibold">
                    {a.full_name}{" "}
                    <span className="text-muted-foreground font-normal">
                      · @{name(a.applicant) ?? "deleted"} · applied{" "}
                      {date(a.created_at)}
                    </span>
                  </p>
                  <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[9rem_1fr]">
                    <dt className="text-muted-foreground">Subjects</dt>
                    <dd>{a.subjects}</dd>
                    <dt className="text-muted-foreground">Levels</dt>
                    <dd>{a.levels.map(levelLabel).join(", ")}</dd>
                    <dt className="text-muted-foreground">DBS</dt>
                    <dd
                      className={cn(
                        a.dbs_status === "none" && "text-destructive",
                      )}
                    >
                      {dbsLabel(a.dbs_status)}
                    </dd>
                    <dt className="text-muted-foreground">Qualifications</dt>
                    <dd className="whitespace-pre-line">{a.qualifications}</dd>
                    <dt className="text-muted-foreground">Experience</dt>
                    <dd className="whitespace-pre-line">{a.experience}</dd>
                    <dt className="text-muted-foreground">Statement</dt>
                    <dd className="whitespace-pre-line">{a.statement}</dd>
                  </dl>
                </div>
                <form action={reviewApplication} className="space-y-3">
                  <input type="hidden" name="id" value={a.id} />
                  <label htmlFor={`notes-${a.id}`} className={labelCls}>
                    Notes (only moderators see these)
                  </label>
                  <textarea
                    id={`notes-${a.id}`}
                    name="notes"
                    maxLength={2000}
                    rows={3}
                    className={cn(fieldCls, "h-auto py-2 leading-relaxed")}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      name="decision"
                      value="approve"
                      className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-semibold"
                    >
                      Approve
                    </button>
                    <button
                      type="submit"
                      name="decision"
                      value="reject"
                      className="border-destructive/40 text-destructive hover:bg-destructive/5 rounded-md border px-4 py-2 text-sm font-medium"
                    >
                      Reject
                    </button>
                  </div>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">Nothing waiting.</p>
        )}
      </Section>
      {done.length > 0 && (
        <Section id="reviewed" title="Recently reviewed" className="pb-20">
          <ul className="divide-y border-y text-sm">
            {done.map((a) => (
              <li key={a.id} className="py-3">
                <span className="font-medium">{a.full_name}</span>{" "}
                <span className="text-muted-foreground">
                  · @{name(a.applicant) ?? "deleted"} ·{" "}
                  {a.status === "approved" ? "Approved" : "Rejected"}
                  {a.reviewed_at && ` ${date(a.reviewed_at)}`}
                  {name(a.reviewer) && ` by @${name(a.reviewer)}`}
                </span>
                {a.reviewer_notes && (
                  <p className="text-muted-foreground mt-1 whitespace-pre-line">
                    {a.reviewer_notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
