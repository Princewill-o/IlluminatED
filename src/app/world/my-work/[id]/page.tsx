import Link from "next/link";
import { notFound } from "next/navigation";

import type { Metadata } from "next";

import {
  decisionLabel,
  markRepairCalculations,
  MISSION_TITLE,
  pounds,
  projectStatusLabel,
  REPAIR_DEVICES,
  signedPounds,
} from "@/lib/illum-world/repair";
import { loadVisibleProject } from "@/lib/illum-world/server";
import { getViewer } from "@/lib/social/server";

export const metadata: Metadata = {
  title: "Project | IllumWorld My Work",
  robots: { index: false, follow: false },
};
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [project, viewer] = await Promise.all([
    loadVisibleProject(id),
    getViewer(),
  ]);
  if (!project) notFound();
  // Teachers can open a pupil's project to review it; only the author resumes.
  const isAuthor = viewer?.id === project.user_id;
  const marking = markRepairCalculations(project.answers);
  return (
    <article className="mx-auto max-w-4xl px-5 py-12">
      <Link href="/world/my-work" className="text-sm font-bold underline">
        My Work
      </Link>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <h1 className="text-4xl font-black">{MISSION_TITLE}</h1>
        <span className="bg-secondary rounded-full px-3 py-1 text-sm font-bold">
          {projectStatusLabel(project.status)}
        </span>
      </div>
      <p className="text-muted-foreground mt-4">
        Calculations {project.score}/3 · Submitted version {project.revision}
        {project.submitted_at
          ? ` · ${new Date(project.submitted_at).toLocaleDateString("en-GB", { timeZone: "Europe/London" })}`
          : ""}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        {project.status !== "draft" && (
          <Link
            href={`/world/my-work/${id}/download?kind=project`}
            className="bg-primary text-primary-foreground inline-flex min-h-11 items-center rounded-xl px-5 py-3 font-bold"
          >
            Download project PDF
          </Link>
        )}
        {project.status === "approved" && (
          <Link
            href={`/world/my-work/${id}/download?kind=certificate`}
            className="inline-flex min-h-11 items-center rounded-xl border px-5 py-3 font-bold"
          >
            Download earned certificate
          </Link>
        )}
        {isAuthor &&
          (project.status === "draft" ||
            project.status === "changes_requested" ||
            (project.status === "submitted" && !project.assignment_id)) && (
          <Link
            href={`/world/tech-repair-trainee${project.assignment_id ? `?assignment=${project.assignment_id}` : ""}`}
            className="inline-flex min-h-11 items-center rounded-xl border px-5 py-3 font-bold"
          >
            {project.status === "submitted"
              ? "Revise independent project"
              : "Resume work"}
          </Link>
        )}
        {!isAuthor && project.assignment_id && (
          <Link
            href="/school"
            className="inline-flex min-h-11 items-center rounded-xl border px-5 py-3 font-bold"
          >
            Review in your class
          </Link>
        )}
      </div>
      {project.feedback && (
        <section className="border-primary/40 bg-primary/5 mt-8 rounded-2xl border p-6">
          <h2 className="text-xl font-bold">Teacher feedback</h2>
          <p className="mt-3 leading-relaxed whitespace-pre-wrap">
            {project.feedback}
          </p>
        </section>
      )}
      <div className="mt-8 space-y-5">
        {REPAIR_DEVICES.map((d) => {
          const a = project.answers.devices.find((a) => a.id === d.id);
          const result = marking.find((r) => r.id === d.id)!;
          return (
            <section key={d.id} className="bg-card rounded-2xl border p-6">
              <h2 className="text-2xl font-bold">{d.name}</h2>
              <p className="text-muted-foreground mt-3 text-sm">
                Acquisition {pounds(d.acquisition)} · Repair {pounds(d.repair)}{" "}
                · Resale {pounds(d.resale)}
              </p>
              <p className="mt-4 font-bold">
                Expected profit: {signedPounds(a?.profit)} ·{" "}
                {result.correct ? "Correct" : "Needs correction"}
              </p>
              <p className="text-muted-foreground mt-2 text-sm">
                {result.explanation}
              </p>
              <p className="mt-4 font-bold">
                Recommendation: {decisionLabel(a?.decision)}
              </p>
              <p className="mt-2 leading-relaxed whitespace-pre-wrap">
                {a?.reason || "Not yet written."}
              </p>
            </section>
          );
        })}
        <section className="bg-card rounded-2xl border p-6">
          <h2 className="text-2xl font-bold">Customer condition report</h2>
          <p className="text-primary mt-2 text-sm font-bold">
            {
              REPAIR_DEVICES.find((d) => d.id === project.answers.reportDevice)
                ?.name
            }
          </p>
          <p className="mt-4 leading-relaxed whitespace-pre-wrap">
            {project.answers.report || "Not yet written."}
          </p>
        </section>
      </div>
      {project.status !== "approved" && (
        <p className="text-muted-foreground mt-6 text-sm">
          A certificate becomes available after the assigned class teacher
          approves a complete project. Independent projects remain downloadable
          without claiming teacher assessment.
        </p>
      )}
    </article>
  );
}
