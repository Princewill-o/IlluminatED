import Image from "next/image";
import Link from "next/link";

import { BookOpenCheck, Briefcase, Calculator, CalendarDays, Compass, Gamepad2, GraduationCap, Layers, Library, MessageCircleQuestion, Timer, Trophy, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";

import { requireAccount } from "@/lib/account/server";
import { courseById } from "@/lib/data/courses";

export const metadata: Metadata = { title: "Learn" };

const TOOLS: { href: string; title: string; text: string; icon: LucideIcon; tint: string }[] = [
  { href: "/quizzes", title: "Quiz centre", text: "Quick, topic, mixed and timed", icon: BookOpenCheck, tint: "#8fb4ff" },
  { href: "/flashcards", title: "Flashcards", text: "Key terms and recall", icon: Layers, tint: "#6bc6ff" },
  { href: "/tiggy", title: "Ask Tiggy", text: "Your AI study buddy", icon: MessageCircleQuestion, tint: "#ffd166" },
  { href: "/exam-mode", title: "Exam mode", text: "Practise under pressure", icon: Timer, tint: "#ff7a6b" },
  { href: "/revision", title: "Revision planner", text: "Plan sessions, print sheets", icon: CalendarDays, tint: "#5fd3a5" },
  { href: "/games/arcade", title: "Arcade", text: "60-second revision games", icon: GraduationCap, tint: "#ff8fd1" },
  { href: "/courses", title: "All courses", text: "GCSE, A level, BTEC, T Levels", icon: Trophy, tint: "#f2d9a6" },
  { href: "/games/careers", title: "Work a shift", text: "Real job tasks, real CV skills", icon: Library, tint: "#c49bff" },
  { href: "/calculator", title: "Grade calculator", text: "What you need to hit your target", icon: Calculator, tint: "#6bc6ff" },
  { href: "/next-steps", title: "Next steps", text: "Sixth form, uni, apprenticeships", icon: Compass, tint: "#ffd166" },
  { href: "/careers", title: "Careers", text: "Explore apprenticeship standards", icon: Briefcase, tint: "#5fd3a5" },
];

export default async function LearnPage() {
  const account = await requireAccount("/learn");
  const subjects = account.details.subjects
    .map((s) => courseById(s.courseId))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const groups: { title: string; hrefs: string[] }[] = [
    { title: "Practise", hrefs: ["/quizzes", "/flashcards", "/exam-mode", "/games/arcade"] },
    { title: "Plan and get help", hrefs: ["/revision", "/tiggy", "/calculator", "/courses"] },
    { title: "Your future", hrefs: ["/games/careers", "/next-steps", "/careers"] },
  ];
  const PALETTE = ["#2b5fd9", "#15987f", "#d4536a", "#e0a100", "#7a5ce6", "#13203a"];
  const hour = Number(new Date().toLocaleString("en-GB", { hour: "numeric", hour12: false, timeZone: "Europe/London" }));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="mx-auto max-w-5xl px-4 pt-5 pb-10 md:pt-10">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#f2d9a6] p-6 text-[#13203a] md:p-8">
        <div className="relative z-10 max-w-md">
          <p className="text-xs font-black tracking-[0.25em] uppercase opacity-70">Learn</p>
          <h1 className="mt-2 text-4xl leading-tight font-black md:text-5xl">
            {greeting}, @{account.profile.username}
          </h1>
          <p className="mt-2 text-base">Pick a subject, practise a topic, or revise in the game. Every right answer earns Clout.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/quizzes" className="rounded-full bg-[#13203a] px-5 py-3 text-sm font-black text-white">
              Quick quiz
            </Link>
            <Link href="/games/world" className="rounded-full bg-white px-5 py-3 text-sm font-black">
              Revise in London
            </Link>
          </div>
        </div>
        <Image src="/brand/mascot-light.webp" alt="" width={260} height={260} className="pointer-events-none absolute -right-6 -bottom-10 hidden w-56 sm:block md:w-64" />
      </section>

      <section aria-labelledby="mine" className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 id="mine" className="text-xl font-black">
            Your subjects
          </h2>
          <Link href="/dashboard/settings" className="text-sm font-bold text-primary">
            Edit subjects
          </Link>
        </div>
        {subjects.length === 0 ? (
          <Link href="/courses" className="mt-3 flex items-center gap-4 rounded-3xl border-2 border-dashed border-[#13203a]/20 bg-card p-5 transition hover:border-primary">
            <span className="grid size-12 place-items-center rounded-2xl bg-[#2b5fd9] text-2xl font-black text-white">+</span>
            <span>
              <span className="block font-black">Add your subjects</span>
              <span className="block text-sm text-muted-foreground">GCSE, A level, BTEC and T Level. We tailor quizzes, jobs and homework practice to them.</span>
            </span>
          </Link>
        ) : (
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {subjects.map((c, i) => (
              <li key={c.id}>
                <Link
                  href={`/study/${c.id}`}
                  className="group relative flex h-32 flex-col justify-between overflow-hidden rounded-3xl p-4 text-white shadow-[0_4px_0_rgba(19,32,58,0.15)] transition hover:-translate-y-1"
                  style={{ background: PALETTE[i % PALETTE.length] }}
                >
                  <span className="absolute -right-6 -bottom-6 size-24 rounded-full bg-white/15 transition group-hover:scale-125" aria-hidden />
                  <span className="text-xs font-black tracking-wider uppercase opacity-80">{c.level}</span>
                  <span className="relative text-lg leading-tight font-black">{c.title}</span>
                </Link>
              </li>
            ))}
            <li>
              <Link href="/courses" className="flex h-32 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[#13203a]/20 p-4 text-center text-sm font-black text-muted-foreground hover:border-primary">
                + Add a subject
              </Link>
            </li>
          </ul>
        )}
      </section>

      <Link href="/games/world" className="group relative mt-8 block overflow-hidden rounded-[2rem] bg-[#13203a] text-white">
        <Image src="/landing/world.webp" alt="" fill sizes="1000px" className="object-cover opacity-60 transition duration-500 group-hover:scale-105" />
        <span className="absolute inset-0 bg-gradient-to-r from-[#13203a] to-transparent" />
        <span className="relative flex items-center gap-4 p-6 md:p-8">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#f2d9a6] text-[#13203a]" aria-hidden>
            <Gamepad2 className="size-7" />
          </span>
          <span>
            <span className="block text-2xl font-black">Revise by playing</span>
            <span className="block text-sm text-white/85">Bus revision, real job shifts and live quiz battles in London and the Highlands.</span>
          </span>
          <span className="ml-auto text-3xl transition group-hover:translate-x-1" aria-hidden>
            ›
          </span>
        </span>
      </Link>

      {groups.map((g) => (
        <section key={g.title} className="mt-8" aria-label={g.title}>
          <h2 className="text-xl font-black">{g.title}</h2>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {g.hrefs
              .map((h) => TOOLS.find((t) => t.href === h))
              .filter((t): t is (typeof TOOLS)[number] => Boolean(t))
              .map((t) => {
                const Icon = t.icon;
                return (
                  <li key={t.href}>
                    <Link href={t.href} className="group flex h-full flex-col gap-3 rounded-3xl border-2 border-white bg-card p-4 shadow-[0_4px_0_rgba(19,32,58,0.08)] transition hover:-translate-y-1">
                      <span className="grid size-12 place-items-center rounded-2xl transition group-hover:rotate-[-6deg]" style={{ background: t.tint }} aria-hidden>
                        <Icon className="size-6 text-[#0d1726]" />
                      </span>
                      <span>
                        <span className="block font-black">{t.title}</span>
                        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{t.text}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}
