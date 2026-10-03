"use client";
import { useMemo, useState } from "react";

import Link from "next/link";

import { ExternalLink, fieldCls, labelCls } from "@/components/kit";
import type { CourseCurriculum } from "@/lib/education";
import { useEducationState } from "@/lib/education/use-state";

export function CourseCurriculumPanel({ data }: { data: CourseCurriculum }) {
  const [spec, setSpec] = useState(data.syllabuses[0]?.code ?? "");
  const [programme, setProgramme] = useState(data.programmes[0]?.slug ?? "");
  const [q, setQ] = useState("");
  const syllabus = data.syllabuses.find((s) => s.code === spec);
  const selected = data.programmes.find((p) => p.slug === programme);
  const revision = useEducationState(`syllabus:${data.course.id}`);
  const checks = revision.state;
  const units = useMemo(
    () =>
      selected?.units.filter((u) =>
        `${u.title} ${u.lessons.map((l) => l.title).join(" ")}`
          .toLowerCase()
          .includes(q.toLowerCase()),
      ) ?? [],
    [selected, q],
  );
  const keyFor = (section: { ref: string; title: string; url: string }) =>
    `${data.course.id}:${syllabus?.board}:${syllabus?.code}:${section.url}:${section.ref}:${section.title}`;
  return (
    <div className="space-y-10">
      <div className="bg-card rounded-xl border p-5">
        <h3 className="text-lg font-semibold">Your syllabus checklist</h3>
        <p className="text-muted-foreground mt-2 text-sm">
          Our {data.guides.length} guides and{" "}
          {data.guides.reduce((n, g) => n + g.questions, 0)} questions cover
          selected topics. Use your board&apos;s specification for the full
          requirements, including practicals, assessment skills and options. A
          checklist tick records your revision, not mastery.
        </p>
        {data.syllabuses.length > 0 ? (
          <>
            <label
              className={`${labelCls} mt-5`}
              htmlFor={`spec-${data.course.id}`}
            >
              Specification
            </label>
            <select
              id={`spec-${data.course.id}`}
              className={fieldCls}
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
            >
              {data.syllabuses.map((s) => (
                <option value={s.code} key={s.code}>
                  {s.board} {s.code}
                </option>
              ))}
            </select>
            {syllabus && (
              <>
                <p className="text-muted-foreground mt-3 text-sm">
                  Published syllabus headings, checked{" "}
                  {new Date(syllabus.checkedAt).toLocaleDateString("en-GB", {
                    timeZone: "Europe/London",
                  })}
                  .{" "}
                  {syllabus.pagesChecked < syllabus.sectionPagesExpected &&
                    "Some source pages were unavailable; consult the full specification."}{" "}
                  Higher-tier and optional content may be included: confirm what
                  applies to you.
                </p>
                <div className="mt-3 flex flex-wrap gap-5 text-sm">
                  <ExternalLink href={syllabus.url}>
                    Full official specification
                  </ExternalLink>
                  <a
                    className="text-primary underline underline-offset-4"
                    href={`/api/education/catalogue?course=${data.course.id}&spec=${encodeURIComponent(spec)}&format=text`}
                  >
                    Download text checklist
                  </a>
                  <a
                    className="text-primary underline underline-offset-4"
                    href={`/api/downloads?course=${encodeURIComponent(data.course.id)}&board=${encodeURIComponent(`${syllabus.board}:${syllabus.code}`)}&type=checklist`}
                  >
                    Download branded PDF checklist
                  </a>
                </div>
                <p className="mt-4 text-sm" aria-live="polite">
                  {syllabus.sections.filter((s) => checks[keyFor(s)]).length} of{" "}
                  {syllabus.sections.length} headings ticked ·{" "}
                  {revision.message}
                </p>
                {revision.status === "offline" && (
                  <button
                    onClick={revision.retry}
                    className="text-primary text-sm underline"
                  >
                    Retry account sync
                  </button>
                )}
                <ul className="mt-4 max-h-[32rem] overflow-y-auto border-t">
                  {syllabus.sections.map((s) => (
                    <li
                      className="flex items-start gap-3 border-b py-3"
                      key={`${s.url}:${s.ref}:${s.title}`}
                    >
                      <input
                        type="checkbox"
                        aria-label={`Revised ${s.ref} ${s.title}`}
                        checked={checks[keyFor(s)] === true}
                        disabled={revision.status === "loading"}
                        onChange={(e) =>
                          revision.setItem(keyFor(s), e.target.checked)
                        }
                        className="mt-1 size-4 shrink-0"
                      />
                      <div className="min-w-0 text-sm">
                        <ExternalLink href={s.url}>
                          {s.ref} {s.title}
                        </ExternalLink>
                        <p className="mt-1">
                          <Link
                            className="text-primary underline"
                            href={`/study/${data.course.id}?spec=${encodeURIComponent(syllabus.code)}&topic=${encodeURIComponent(s.title)}`}
                          >
                            Study help, videos and practice for this topic
                          </Link>
                        </p>
                        {data.guides
                          .filter((g) =>
                            g.specRefs.some(
                              (r) =>
                                r.board === syllabus.board &&
                                r.code === syllabus.code &&
                                Boolean(s.ref) &&
                                r.section.startsWith(s.ref + " "),
                            ),
                          )
                          .map((g) => (
                            <p key={g.id} className="mt-1">
                              <Link
                                className="text-primary underline"
                                href={`/courses/${data.course.id}/${g.id}`}
                              >
                                Related guide: {g.title}
                              </Link>
                            </p>
                          ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        ) : (
          <>
            <p className="text-muted-foreground mt-4 text-sm">
              A detailed board-specific checklist hasn&apos;t been imported for
              this course. These broad areas help you organise revision; they
              aren&apos;t a complete syllabus. For BTEC and T Levels, confirm
              your qualification size, start year and optional units.
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
              {data.course.commonAreas.map((a) => (
                <li key={a}>
                  {a} ·{" "}
                  <Link
                    className="text-primary underline"
                    href={`/study/${data.course.id}?topic=${encodeURIComponent(a)}`}
                  >
                    Study help and resources
                  </Link>
                </li>
              ))}
            </ul>
            <a
              className="text-primary mt-4 inline-block text-sm underline"
              href={`/api/education/catalogue?course=${data.course.id}&format=text`}
            >
              Download course areas and official sources
            </a>
          </>
        )}
      </div>
      {data.programmes.length > 0 ? (
        <div>
          <h3 className="text-lg font-semibold">
            Videos, lessons and practice from Oak
          </h3>
          <p className="text-muted-foreground mt-2 text-sm">
            Select your year, board and tier. Each lesson opens on Oak National
            Academy, with its available videos, quizzes and worksheets.
            Oak&apos;s curriculum supports revision; it doesn&apos;t guarantee
            every exam requirement. English programmes include Language and
            Literature: select the texts and units you study.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor={`oak-${data.course.id}`}>
                Learning programme
              </label>
              <select
                className={fieldCls}
                id={`oak-${data.course.id}`}
                value={programme}
                onChange={(e) => setProgramme(e.target.value)}
              >
                {data.programmes.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    Year {p.year} · {p.board || "No board specified"}{" "}
                    {p.tier && `· ${p.tier}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor={`unit-${data.course.id}`}>
                Find a topic or lesson
              </label>
              <input
                className={fieldCls}
                id={`unit-${data.course.id}`}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="e.g. genetics, probability"
              />
            </div>
          </div>
          <p className="text-muted-foreground mt-3 text-sm" aria-live="polite">
            {units.length} units ·{" "}
            {selected && (
              <>
                source checked{" "}
                {new Date(selected.checkedAt).toLocaleDateString("en-GB", {
                  timeZone: "Europe/London",
                })}
              </>
            )}
          </p>
          <div className="mt-4 space-y-3">
            {units.map((u) => (
              <details key={u.slug} className="bg-card rounded-lg border p-4">
                <summary className="cursor-pointer font-medium">
                  {u.title} · {u.lessons.length} listed lessons
                </summary>
                <div className="mt-4 text-sm">
                  <ExternalLink href={u.url}>Open the unit on Oak</ExternalLink>
                  <ul className="mt-3 space-y-2">
                    {u.lessons.map((l) => (
                      <li
                        className="flex flex-wrap items-center justify-between gap-3"
                        key={l.slug}
                      >
                        <ExternalLink href={l.url}>{l.title}</ExternalLink>
                        <Link
                          className="text-primary underline"
                          href={`/learn/${l.slug}`}
                        >
                          Study resources
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            ))}
          </div>
          {!units.length && (
            <p className="mt-4 text-sm">
              No units match. Try a broader keyword.
            </p>
          )}
          <p className="text-muted-foreground mt-5 text-xs">
            Lesson titles and links indexed from Oak National Academy. Materials
            stay on Oak unless retrieved through its authorised API with their
            licensing restrictions respected.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border p-5">
          <h3 className="font-semibold">Resources for this qualification</h3>
          <p className="text-muted-foreground mt-2 text-sm">
            Oak&apos;s school curriculum doesn&apos;t cover this qualification
            here. Use the awarding organisation&apos;s specification, teaching
            resources and sample assessments, and Ask Tiggy or a tutor for
            explanations.
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {data.course.officialLinks.map((l) => (
              <li key={l.url}>
                <ExternalLink href={l.url}>{l.label}</ExternalLink>
              </li>
            ))}
          </ul>
          <Link
            className="text-primary mt-4 inline-block text-sm underline"
            href="/tiggy"
          >
            Ask Tiggy for help
          </Link>
        </div>
      )}
    </div>
  );
}
