import Link from "next/link";

import type { Metadata } from "next";

import { MISSION_TITLE, projectStatusLabel } from "@/lib/illum-world/repair";
import { loadMyRepairProjects } from "@/lib/illum-world/server";
import { getViewer } from "@/lib/social/server";

export const metadata: Metadata = {
  title: "My Work | IllumWorld",
  robots: { index: false, follow: false },
};
export default async function MyWorkPage() {
  const viewer = await getViewer();
  const projects = viewer ? await loadMyRepairProjects() : [];
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
                Your first project starts in the repair shop.
              </h2>
              <p className="text-muted-foreground mt-3">
                Open a teacher assignment from Your Class, or try independent
                practice.
              </p>
              <Link
                href="/world/tech-repair-trainee"
                className="mt-4 inline-flex min-h-11 items-center font-bold underline"
              >
                Start Tech Repair Trainee
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
