import Link from "next/link";

import { BookOpenCheck, Briefcase, Calculator, CalendarDays, Compass, Gamepad2, GraduationCap, Layers, Library, MessageCircleQuestion, Timer, Trophy, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";

import { requireAccount } from "@/lib/account/server";
import { courseById } from "@/lib/data/courses";

export const metadata: Metadata = { title: "Learn" };

const TOOLS: { href: string; title: string; text: string; icon: LucideIcon; tint: string }[] = [
  { href: "/quizzes", title: "Quiz centre", text: "Quick, topic, mixed and timed", icon: BookOpenCheck, tint: "#a67fff" },
  { href: "/flashcards", title: "Flashcards", text: "Key terms and recall", icon: Layers, tint: "#6bc6ff" },
  { href: "/tiggy", title: "Ask Tiggy", text: "Your AI study buddy", icon: MessageCircleQuestion, tint: "#ffd166" },
  { href: "/exam-mode", title: "Exam mode", text: "Practise under pressure", icon: Timer, tint: "#ff7a6b" },
  { href: "/revision", title: "Revision planner", text: "Plan sessions, print sheets", icon: CalendarDays, tint: "#5fd3a5" },
  { href: "/tutors", title: "Get a tutor", text: "1:1 help when you're stuck", icon: GraduationCap, tint: "#ff8fd1" },
  { href: "/courses", title: "All courses", text: "GCSE, A level, BTEC, T Levels", icon: Trophy, tint: "#c6f36b" },
  { href: "/library", title: "Library", text: "Set texts and reading", icon: Library, tint: "#c49bff" },
  { href: "/calculator", title: "Grade calculator", text: "What you need to hit your target", icon: Calculator, tint: "#6bc6ff" },
  { href: "/next-steps", title: "Next steps", text: "Sixth form, uni, apprenticeships", icon: Compass, tint: "#ffd166" },
  { href: "/careers", title: "Careers", text: "Explore apprenticeship standards", icon: Briefcase, tint: "#5fd3a5" },
];

export default async function LearnPage() {
  const account = await requireAccount("/learn");
  const subjects = account.details.subjects
    .map((s) => courseById(s.courseId))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <div className="mx-auto max-w-5xl px-4 pt-5 pb-8 md:pt-10">
      <h1 className="hidden text-3xl font-extrabold tracking-tight md:block">Learn</h1>

      <section aria-labelledby="mine" className="md:mt-6">
        <div className="flex items-baseline justify-between">
          <h2 id="mine" className="text-lg font-extrabold">
            Your subjects
          </h2>
          <Link href="/dashboard/settings" className="text-primary text-sm font-bold">
            Edit
          </Link>
        </div>
        <ul className="-mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
          {subjects.map((c) => (
            <li key={c.id} className="snap-start">
              <Link
                href={`/study/${c.id}`}
                className="bg-card flex h-28 w-40 flex-col justify-between rounded-3xl border p-4 transition active:scale-[0.97]"
              >
                <span className="text-muted-foreground text-xs font-bold tracking-wider uppercase">{c.level}</span>
                <span className="leading-tight font-extrabold">{c.title}</span>
              </Link>
            </li>
          ))}
          <li className="snap-start">
            <Link
              href="/courses"
              className="flex h-28 w-40 flex-col items-center justify-center rounded-3xl border border-dashed border-border p-4 text-center text-sm font-bold text-muted-foreground"
            >
              + Browse all courses
            </Link>
          </li>
        </ul>
      </section>

      <Link
        href="/games"
        className="mt-6 flex items-center gap-4 rounded-3xl bg-brand p-5 text-white transition active:scale-[0.98]"
      >
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#0b0910] text-[#c6f36b]" aria-hidden>
          <Gamepad2 className="size-7" />
        </span>
        <span>
          <span className="block text-lg font-extrabold">Revise by playing</span>
          <span className="block text-sm text-white/85">Promotion Panic: intern to CEO in one shift</span>
        </span>
        <span className="ml-auto text-2xl" aria-hidden>
          ›
        </span>
      </Link>

      <section aria-labelledby="tools" className="mt-8">
        <h2 id="tools" className="text-lg font-extrabold">
          Study tools
        </h2>
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className="bg-card flex h-full flex-col gap-3 rounded-3xl border p-4 transition hover:border-white/25 active:scale-[0.97]"
                >
                  <span className="grid size-11 place-items-center rounded-2xl" style={{ background: t.tint }} aria-hidden>
                    <Icon className="size-6 text-[#0b0910]" />
                  </span>
                  <span>
                    <span className="block font-extrabold">{t.title}</span>
                    <span className="text-muted-foreground mt-0.5 block text-xs leading-5">{t.text}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
