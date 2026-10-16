
import Link from "next/link";
import { notFound } from "next/navigation";

import type { Metadata } from "next";

import { CopyCode, SetHomework, TeacherControls } from "@/components/school/school";
import { requireAccount } from "@/lib/account/server";
import { courseById } from "@/lib/data/courses";
import { QUESTION_BANK, TOPICS } from "@/lib/data/topics";
import { loadClassForTeacher } from "@/lib/school/server";

export const metadata: Metadata = { title: "Your class" };

const pct = (n: number) => `${Math.round(n * 100)}%`;

export default async function ClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await requireAccount(`/homework/class/${id}`);
  const data = await loadClassForTeacher(id, account.id);
  if (!data) notFound();
  const { cls, students, homework, submissions } = data;
  const answerOf = new Map(QUESTION_BANK.map((q) => [q.key, q.answer]));
  const topics = TOPICS.filter((t) => t.quiz.length).map((t) => ({ id: t.id, title: t.title, course: courseById(t.courseId)?.title ?? "", questions: t.quiz.length }));

  // Topic gaps: how often each topic's questions were answered correctly across the class.
  const gaps = new Map<string, { right: number; total: number }>();
  for (const s of submissions) {
    const hw = homework.find((h) => h.id === s.homeworkId);
    hw?.questions.forEach((q, i) => {
      const g = gaps.get(q.topic ?? "Other") ?? { right: 0, total: 0 };
      g.total += 1;
      if (s.answers[i] === answerOf.get(q.key)) g.right += 1;
      gaps.set(q.topic ?? "Other", g);
    });
  }
  const weakest = [...gaps.entries()].filter(([, g]) => g.total >= 3).sort((a, b) => a[1].right / a[1].total - b[1].right / b[1].total).slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-16">
      <Link href="/homework" className="text-sm font-bold text-primary">
        ← Homework
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black tracking-[0.3em] text-muted-foreground uppercase">
            {cls.subject}
            {cls.school ? ` · ${cls.school}` : ""}
          </p>
          <h1 className="mt-1 text-4xl font-black tracking-tight">{cls.name}</h1>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-muted-foreground">Class code</p>
          <CopyCode code={cls.code} />
        </div>
      </div>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <SetHomework classId={cls.id} topics={topics} />
        <div className="rounded-3xl border bg-card p-5">
          <p className="text-lg font-bold">Knowledge gaps</p>
          <p className="mt-1 text-sm text-muted-foreground">Topics the class gets wrong most, across all homework.</p>
          {weakest.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Appears once students hand in homework.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {weakest.map(([t, g]) => (
                <li key={t}>
                  <div className="flex justify-between text-sm font-bold">
                    <span>{t}</span>
                    <span>{pct(g.right / g.total)}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary" style={{ width: pct(g.right / g.total) }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-black">Results</h2>
        {homework.length === 0 || students.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed p-6 text-muted-foreground">
            {students.length === 0 ? `No students yet. Share code ${cls.code}.` : "Set some homework to see results here."}
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-secondary text-left">
                  <th className="px-4 py-3">Student</th>
                  {homework.map((h) => (
                    <th key={h.id} className="px-3 py-3 whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        {h.title}
                        <TeacherControls classId={cls.id} kind="homework" id={h.id} label={h.title} />
                      </span>
                      <span className="block text-xs font-normal text-muted-foreground">
                        {submissions.filter((s) => s.homeworkId === h.id).length}/{students.length} done
                      </span>
                    </th>
                  ))}
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {students.map((st) => (
                  <tr key={st.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-bold">{st.username}</td>
                    {homework.map((h) => {
                      const s = submissions.find((x) => x.homeworkId === h.id && x.userId === st.id);
                      return (
                        <td key={h.id} className="px-3 py-3 tabular-nums">
                          {s ? (
                            <span title={`${s.attempts} attempt${s.attempts === 1 ? "" : "s"}`}>
                              {s.correct}/{s.total}
                              {s.attempts > 1 && <span className="text-xs text-muted-foreground"> ×{s.attempts}</span>}
                            </span>
                          ) : (
                            <span className={new Date(h.dueAt).getTime() < Date.now() ? "font-bold text-destructive" : "text-muted-foreground"}>–</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3">
                      <TeacherControls classId={cls.id} kind="student" id={st.id} label={st.username} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-3xl border bg-card p-5">
        <p className="max-w-2xl text-sm text-muted-foreground">
          You see usernames and homework scores only. Students can leave at any time, which deletes their answers for this class. Deleting the class deletes
          everything in it.
        </p>
        <TeacherControls classId={cls.id} kind="class" id={cls.id} label={cls.name} />
      </section>
    </div>
  );
}
