import Link from "next/link";

import type { Metadata } from "next";

import { MISSION_TITLE, projectStatusLabel } from "@/lib/illum-world/repair";
import { roleContract } from "@/lib/illum-world/role-contracts";
import { loadMyRepairProjects } from "@/lib/illum-world/server";
import { getSupabase , getViewer } from "@/lib/social/server";


export const metadata: Metadata = {
  title: "My Work | IllumWorld",
  robots: { index: false, follow: false },
};
export default async function MyWorkPage() {
  const viewer = await getViewer();
  const projects = viewer ? await loadMyRepairProjects() : [];
  const sb = viewer ? await getSupabase() : null;
  const completions = sb && viewer ? await sb.from("world_course_completions").select("id,role_id,completed_at").eq("user_id", viewer.id).order("completed_at", { ascending: false }) : null;
  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <Link href="/world" className="text-sm font-bold underline">
        IllumWorld
      </Link>
      <h1 className="mt-5 text-4xl font-black">My Work</h1>
      <p className="text-muted-foreground mt-4 max-w-2xl">
        Your workplace drafts, finished projects, teacher feedback and earned
        certificates. Subject practice results stay in each subject product.
      </p>
      {viewer && <section className="mt-8" aria-labelledby="course-records">
        <h2 id="course-records" className="text-2xl font-bold">Completed courses</h2>
        {completions?.error ? <p className="mt-3">Account course records are temporarily unavailable.</p> :
        completions?.data?.length ? <ul className="mt-4 space-y-4">{completions.data.map(record => {
          const course = roleContract(record.role_id);
          return course && <li key={record.id} className="rounded-xl border p-4">
            <h3 className="font-bold">{course.title} · {course.workplace}</h3>
            <p>Completed {new Date(record.completed_at).toLocaleDateString("en-GB")}</p>
            <a className="inline-flex min-h-11 items-center font-bold underline" href={`/api/world/contracts/${course.id}/certificate?earned=1`}>Download course certificate</a>
          </li>;
        })}</ul> : <p className="mt-3">Your completed course certificates will appear here.</p>}
      </section>}
      {!viewer ? (
        <Link
          href="/sign-in?next=/world/my-work"
          className="bg-primary text-primary-foreground mt-7 inline-flex min-h-12 items-center rounded-xl px-6 py-3 font-bold"
        >
          Sign in to open your portfolio
        </Link>
      ) : (
        <>
          <div className="mt-8 space-y-4">
            {projects.map((p) => (
              <article key={p.id} className="bg-card rounded-2xl border p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-bold">{MISSION_TITLE}</h2>
                  <span className="bg-secondary rounded-full px-3 py-1 text-xs font-bold">
                    {projectStatusLabel(p.status)}
                  </span>
                </div>
                <p className="text-muted-foreground mt-3 text-sm">
                  {p.assignment_id
                    ? "Class assignment"
                    : "Independent practice"}{" "}
                  · Updated{" "}
                  {new Date(p.updated_at).toLocaleDateString("en-GB", {
                    timeZone: "Europe/London",
                  })}{" "}
                  · Calculations {p.score}/3
                </p>
                {p.feedback && (
                  <p className="mt-3 text-sm">Teacher: {p.feedback}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-5">
                  <Link
                    href={`/world/my-work/${p.id}`}
                    className="inline-flex min-h-11 items-center font-bold underline"
                  >
                    Open project
                  </Link>
                  {(p.status === "draft" ||
                    p.status === "changes_requested" ||
                    (p.status === "submitted" && !p.assignment_id)) && (
                    <Link
                      href={`/world/tech-repair-trainee${p.assignment_id ? `?assignment=${p.assignment_id}` : ""}`}
                      className="inline-flex min-h-11 items-center font-bold underline"
                    >
                      {p.status === "submitted"
                        ? "Revise independent project"
                        : "Resume work"}
                    </Link>
                  )}
                  {p.status === "approved" && (
                    <Link
                      href={`/world/my-work/${p.id}/download?kind=certificate`}
                      className="text-primary inline-flex min-h-11 items-center font-bold underline"
                    >
                      Download certificate
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
          {!projects.length && (
            <div className="mt-8 rounded-2xl border p-7">
              <h2 className="text-xl font-bold">
                Explore an in-game role contract in IllumWorld.
              </h2>
              <p className="text-muted-foreground mt-3">
                Open a teacher assignment from Your Class, or try independent
                practice.
              </p>
              <Link
                href="/world/contracts"
                className="mt-4 inline-flex min-h-11 items-center font-bold underline"
              >
                Explore role contracts
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
