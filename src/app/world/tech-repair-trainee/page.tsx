import Link from "next/link";

import type { Metadata } from "next";

import { RepairMission } from "@/components/illum-world/repair-mission";
import {
  loadMyRepairAssignments,
  loadRepairProject,
} from "@/lib/illum-world/server";

export const metadata: Metadata = {
  title: "Tech Repair Trainee | IllumWorld",
  description:
    "A Year 10 virtual workplace project: inspect three fictional phones, calculate profit and write a customer condition report.",
};
export default async function RepairMissionPage({
  searchParams,
}: {
  searchParams: Promise<{ assignment?: string }>;
}) {
  const { assignment: raw } = await searchParams;
  const assignment = raw && /^[0-9a-f-]{36}$/i.test(raw) ? raw : null;
  const state = await loadRepairProject(assignment);
  const choices =
    !raw && state.userId ? await loadMyRepairAssignments(state.userId) : null;
  return (
    <>
      {choices && (
        <section
          className="mx-auto mt-8 max-w-7xl px-4 sm:px-6"
          aria-labelledby="repair-assignment-choices"
        >
          <div className="border-primary/40 bg-primary/5 rounded-2xl border p-5 sm:p-6">
            <h2 id="repair-assignment-choices" className="text-xl font-bold">
              Working on this with your class?
            </h2>
            <p className="text-muted-foreground mt-2 max-w-3xl text-sm leading-relaxed">
              Open your teacher’s assignment below so your work reaches the
              correct class. Choose the right class if more than one teacher has
              set the project. The mission form underneath is separate
              independent practice.
            </p>
            {choices.error ? (
              <p role="alert" className="mt-4 text-sm">
                Your assignments could not be loaded.{" "}
                <Link className="font-bold underline" href="/school">
                  Open Your Class
                </Link>{" "}
                or retry this page before starting a class project.
              </p>
            ) : choices.assignments.length ? (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {choices.assignments.map((task) => (
                  <li key={task.id}>
                    <Link
                      href={`/world/tech-repair-trainee?assignment=${task.id}`}
                      className="bg-card hover:border-primary block min-h-11 rounded-xl border px-4 py-3"
                    >
                      <span className="text-primary text-xs font-bold">
                        {task.className}
                      </span>
                      <span className="mt-1 block font-bold">
                        {task.title} →
                      </span>
                      <span className="text-muted-foreground mt-1 block text-xs">
                        {task.dueAt
                          ? `Due ${new Date(task.dueAt).toLocaleDateString("en-GB", { timeZone: "Europe/London" })}`
                          : "No due date"}{" "}
                        · Open or resume class project
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm">
                No repair mission is assigned in your joined classes yet.{" "}
                <Link className="font-bold underline" href="/school">
                  Join your class or check your teacher’s link
                </Link>
                .
              </p>
            )}
            <p className="mt-4 text-sm font-semibold">
              Independent practice is saved in My Work, but it is not handed in
              to a teacher and cannot earn a teacher-approved certificate.
            </p>
          </div>
        </section>
      )}
      <RepairMission
        key={`${state.userId ?? "guest"}:${assignment ?? "independent"}`}
        assignment={assignment}
        initial={state.project}
        signedIn={state.signedIn}
        userId={state.userId}
        loadError={
          raw && !assignment
            ? "The assignment link is invalid. Ask your teacher for the full link."
            : state.error
        }
      />
    </>
  );
}
