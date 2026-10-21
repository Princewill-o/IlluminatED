import Image from "next/image";
import Link from "next/link";

import {
  ArrowRight,
  BookOpen,
  BookOpenCheck,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Compass,
  Flame,
  Gamepad2,
  GraduationCap,
  Layers,
  MapPin,
  MessageCircleQuestion,
  Plus,
  Sparkles,
  Target,
  Timer,
  Trophy,
  type LucideIcon,
} from "lucide-react";

import { AwardCollection } from "@/components/game/awards";
import { awardsFor } from "@/game/core/awards";
import {
  SKILLS,
  type SkillId,
  roleOf,
  workplaceById,
} from "@/game/core/careers";
import type { CareerState } from "@/lib/game/careers-server";
import type { PlayerState } from "@/lib/game/server";
import type { StudyState } from "@/lib/game/study-server";
import type { Course } from "@/lib/types";

const TOOLS: { href: string; title: string; text: string; icon: LucideIcon }[] =
  [
    {
      href: "/practice",
      title: "Question bank",
      text: "GCSE and A-level questions, marked as you type.",
      icon: BookOpenCheck,
    },
    {
      href: "/quizzes",
      title: "Quiz centre",
      text: "Check what you know, one topic at a time.",
      icon: BookOpenCheck,
    },
    {
      href: "/flashcards",
      title: "Flashcards",
      text: "Make key terms and ideas stick.",
      icon: Layers,
    },
    {
      href: "/exam-mode",
      title: "Exam practice",
      text: "Build confidence with timed questions.",
      icon: Timer,
    },
    {
      href: "/revision",
      title: "Revision planner",
      text: "Make a little room for learning.",
      icon: CalendarDays,
    },
    {
      href: "/tiggy",
      title: "Ask Tiggy",
      text: "Get help working through an idea.",
      icon: MessageCircleQuestion,
    },
    {
      href: "/next-steps",
      title: "Explore your future",
      text: "Courses, apprenticeships and next steps.",
      icon: Compass,
    },
  ];
const SUBJECT_COLOURS = [
  "#2b5fd9",
  "#15987f",
  "#9162d5",
  "#bd5c75",
  "#ad7b24",
  "#327c9e",
];

function JourneyStat({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
  value: string | number;
  label: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f2d9a6]/10 text-[#f2d9a6]"
        aria-hidden="true"
      >
        <Icon className="size-4" />
      </span>
      <span>
        <span className="block text-xl font-black tabular-nums">{value}</span>
        <span className="block text-xs text-white/65">{label}</span>
      </span>
    </div>
  );
}

export interface LearningDashboardProps {
  username: string;
  subjects: Course[];
  player: PlayerState;
  career: CareerState;
  study: StudyState;
}

/** Presentational campus shared by the account page and visual previews. */
export function LearningDashboard({
  username,
  subjects,
  player,
  career,
  study,
}: LearningDashboardProps) {
  const continueCourse =
    subjects.find((course) => study.courses.includes(course.id)) ?? subjects[0];
  const continueHref = continueCourse
    ? `/study/${continueCourse.id}`
    : "/dashboard/settings";
  // Career history already includes the active job; count it only once.
  const careerShifts = career.history.reduce((sum, job) => sum + job.shifts, 0);
  const careerCorrect = career.history.reduce(
    (sum, job) => sum + job.correct,
    0,
  );
  const careerTotal = career.history.reduce((sum, job) => sum + job.total, 0);
  const careerWorkplaces = new Set(
    career.history.filter((job) => job.shifts > 0).map((job) => job.workplace),
  ).size;
  const awards = awardsFor({
    studySessions: study.sessions,
    studyCorrect: study.correct,
    studiedCourses: new Set(study.courses).size,
    careerShifts,
    careerCorrect,
    careerTotal,
    careerWorkplaces,
  });
  const earnedAwards = awards.filter((award) => award.earned).length;
  const practicedSkills = Object.entries(career.skills)
    .filter(([, skill]) => skill.total > 0)
    .sort((a, b) => b[1].total - a[1].total);
  const job = career.active;
  const jobRole = job
    ? (roleOf(job.workplace, job.role)?.title ?? job.role)
    : null;
  const workplace = job
    ? (workplaceById(job.workplace)?.name ?? job.workplace)
    : null;
  const accuracy =
    study.total > 0 ? Math.round((study.correct / study.total) * 100) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-14 md:px-6 md:pt-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-primary flex items-center gap-2 text-[11px] font-black tracking-[0.2em] uppercase">
            <GraduationCap className="size-4" /> Your learning campus
          </p>
          <h1 className="mt-2 text-3xl leading-tight font-black tracking-tight md:text-4xl">
            A little learning. A world of possibility.
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Welcome back, @{username}. Make your next step count.
          </p>
        </div>
        <a
          href="#awards"
          className="border-border bg-card hover:border-primary inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-bold transition"
        >
          <Trophy className="size-4 text-[#b7862c]" /> {earnedAwards}/
          {awards.length} awards
          <ChevronRight className="size-3" />
        </a>
      </header>

      <section
        className="relative overflow-hidden rounded-[2rem] bg-[#13203a] text-white"
        aria-labelledby="learning-intro"
      >
        <span
          className="pointer-events-none absolute -top-32 -right-20 size-96 rounded-full border-[50px] border-white/[0.035]"
          aria-hidden="true"
        />
        <div className="relative grid gap-8 p-6 md:grid-cols-[1.35fr_1fr] md:gap-10 md:p-9">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold tracking-wider text-[#f2d9a6] uppercase">
              <Sparkles className="size-3" /> Learn it. Practise it. Put it to
              work.
            </p>
            <h2
              id="learning-intro"
              className="mt-5 max-w-lg text-4xl leading-[1.08] font-black tracking-tight md:text-5xl"
            >
              Build knowledge.
              <br />
              <span className="text-[#f2d9a6]">Find your direction.</span>
            </h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/75">
              Study your subjects, take a seat in the game, and try simulated
              work experience. Small sessions build skills you can keep coming
              back to.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={continueHref}
                className="inline-flex items-center gap-2 rounded-full bg-[#f2d9a6] px-5 py-3 text-sm font-black text-[#13203a] transition hover:bg-[#ffe7b9]"
              >
                {continueCourse ? "Continue studying" : "Choose your subjects"}
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/games/study"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                <Gamepad2 className="size-4" /> Enter study room
              </Link>
            </div>
          </div>
          <div className="flex flex-col justify-center rounded-3xl border border-white/10 bg-white/[0.045] p-5 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-white/65">
                Your journey so far
              </p>
              <span className="rounded-full bg-[#15987f]/25 px-2.5 py-1 text-[10px] font-bold text-[#8ce2c9]">
                {player.ready ? `Level ${player.level}` : "Ready to begin"}
              </span>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6">
              <JourneyStat
                icon={BookOpen}
                value={study.sessions}
                label="Study sessions"
              />
              <JourneyStat
                icon={BriefcaseBusiness}
                value={careerShifts}
                label="Simulated shifts"
              />
              <JourneyStat
                icon={Sparkles}
                value={player.ready ? player.xp.toLocaleString("en-GB") : "—"}
                label="Game XP"
              />
              <JourneyStat
                icon={Trophy}
                value={earnedAwards}
                label="Awards earned"
              />
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4 text-xs text-white/65">
              <span className="inline-flex items-center gap-1.5">
                <Flame className="size-3.5 text-[#f2d9a6]" /> {player.streak}{" "}
                day game streak
              </span>
              <span>
                {player.ready ? player.clout.toLocaleString("en-GB") : "—"}{" "}
                Clout
              </span>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="next-step" className="mt-9">
        <div className="mb-4">
          <p className="text-muted-foreground text-[10px] font-bold tracking-[0.18em] uppercase">
            Make it yours
          </p>
          <h2 id="next-step" className="mt-1 text-xl font-black">
            Where would you like to start?
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href={continueHref}
            className="group border-border bg-card flex flex-col rounded-3xl border p-5 transition hover:-translate-y-1 hover:border-[#2b5fd9]/50 hover:shadow-lg hover:shadow-[#13203a]/5"
          >
            <div className="flex items-center justify-between">
              <span className="grid size-11 place-items-center rounded-2xl bg-[#2b5fd9]/10 text-[#2b5fd9] dark:text-[#8fb4ff]">
                <BookOpen className="size-5" />
              </span>
              <span className="text-muted-foreground text-[10px] font-bold">
                01 / STUDY
              </span>
            </div>
            <h3 className="mt-5 text-lg font-black">Your subject desk</h3>
            <p className="text-muted-foreground mt-2 flex-1 text-sm leading-6">
              {continueCourse
                ? `Pick up ${continueCourse.title}, explore a topic and test your understanding.`
                : "Choose your subjects to bring your courses and revision together."}
            </p>
            <span className="text-primary mt-5 inline-flex items-center gap-2 text-xs font-black">
              {continueCourse
                ? "Continue your studies"
                : "Set up your subjects"}
              <ArrowRight className="size-4 transition group-hover:translate-x-1" />
            </span>
          </Link>
          <Link
            href="/games/study"
            className="group flex flex-col rounded-3xl border border-[#15987f]/25 bg-[#15987f]/[0.055] p-5 transition hover:-translate-y-1 hover:border-[#15987f]/60 hover:shadow-lg hover:shadow-[#13203a]/5"
          >
            <div className="flex items-center justify-between">
              <span className="grid size-11 place-items-center rounded-2xl bg-[#15987f]/15 text-[#117561] dark:text-[#69d7bd]">
                <Gamepad2 className="size-5" />
              </span>
              <span className="text-muted-foreground text-[10px] font-bold">
                02 / PRACTISE
              </span>
            </div>
            <h3 className="mt-5 text-lg font-black">The study room</h3>
            <p className="text-muted-foreground mt-2 flex-1 text-sm leading-6">
              Settle into a focused question session, learn from each answer and
              grow your game progress.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-xs font-black text-[#117561] dark:text-[#69d7bd]">
              Take a seat
              <ArrowRight className="size-4 transition group-hover:translate-x-1" />
            </span>
          </Link>
          <Link
            href="/games/careers"
            className="group flex flex-col rounded-3xl border border-[#d7ab4c]/30 bg-[#f2d9a6]/15 p-5 transition hover:-translate-y-1 hover:border-[#d7ab4c]/60 hover:shadow-lg hover:shadow-[#13203a]/5"
          >
            <div className="flex items-center justify-between">
              <span className="grid size-11 place-items-center rounded-2xl bg-[#f2d9a6] text-[#825d14]">
                <BriefcaseBusiness className="size-5" />
              </span>
              <span className="text-muted-foreground text-[10px] font-bold">
                03 / EXPERIENCE
              </span>
            </div>
            <h3 className="mt-5 text-lg font-black">Try the working world</h3>
            <p className="text-muted-foreground mt-2 flex-1 text-sm leading-6">
              Work through simulated job tasks, practise workplace skills and
              discover what interests you.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-xs font-black text-[#825d14] dark:text-[#f2d9a6]">
              {job ? "Continue your career" : "Explore simulated jobs"}
              <ArrowRight className="size-4 transition group-hover:translate-x-1" />
            </span>
          </Link>
        </div>
      </section>

      <section aria-labelledby="your-subjects" className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="your-subjects" className="text-xl font-black">
              Your subjects
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              A home for what you’re learning.
            </p>
          </div>
          <Link
            href="/dashboard/settings"
            className="text-primary inline-flex items-center gap-1 text-xs font-bold"
          >
            Edit subjects
            <ChevronRight className="size-3" />
          </Link>
        </div>
        {subjects.length === 0 ? (
          <div className="border-border bg-card mt-4 rounded-3xl border border-dashed p-6 sm:flex sm:items-center sm:gap-5">
            <span className="text-primary grid size-12 shrink-0 place-items-center rounded-2xl bg-[#2b5fd9]/10">
              <Plus className="size-5" />
            </span>
            <div className="mt-4 sm:mt-0">
              <h3 className="font-black">Make space for your subjects</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Select what you study in your settings. You can browse the full
                course library first.
              </p>
              <div className="mt-4 flex flex-wrap gap-4">
                <Link
                  href="/dashboard/settings"
                  className="text-primary text-sm font-black"
                >
                  Choose my subjects <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href="/courses"
                  className="text-muted-foreground text-sm font-bold underline underline-offset-4"
                >
                  Browse courses
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <ul className="mt-4 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {subjects.map((course, index) => (
              <li key={course.id}>
                <Link
                  href={`/study/${course.id}`}
                  className="group border-border bg-card hover:border-primary/40 flex h-full min-h-36 flex-col rounded-2xl border p-4 transition hover:shadow-md"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="grid size-9 shrink-0 place-items-center rounded-xl text-white"
                      style={{
                        background:
                          SUBJECT_COLOURS[index % SUBJECT_COLOURS.length],
                      }}
                    >
                      <BookOpen className="size-4" />
                    </span>
                    <span className="text-muted-foreground text-[10px] font-bold tracking-wide uppercase">
                      {course.level}
                    </span>
                  </div>
                  <h3 className="mt-4 flex-1 text-base leading-snug font-black">
                    {course.title}
                  </h3>
                  <span className="text-primary mt-3 flex items-center justify-between text-[11px] font-bold">
                    Explore topics
                    <ArrowRight className="size-3.5 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/dashboard/settings"
                className="border-border text-muted-foreground hover:border-primary hover:text-primary flex h-full min-h-36 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-6 text-center text-xs font-bold transition"
              >
                <Plus className="size-5" /> Add or change subjects
              </Link>
            </li>
          </ul>
        )}
      </section>

      <section
        className="mt-10 grid gap-5 lg:grid-cols-[1.2fr_1fr]"
        aria-label="Your practice and work experience"
      >
        <div className="border-border bg-card rounded-3xl border p-6">
          <div className="text-primary flex items-center gap-2 text-[10px] font-bold tracking-wider uppercase">
            <Target className="size-4" /> Study room progress
          </div>
          <h2 className="mt-3 text-xl font-black">Small sessions add up.</h2>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            {study.sessions > 0
              ? "Every completed session adds to your study record. Keep revisiting topics and build your confidence."
              : "Your first completed in-game session starts your study record. Choose a subject, answer questions and review the explanations."}
          </p>
          <div className="bg-muted/60 mt-5 grid grid-cols-3 gap-2 rounded-2xl p-4">
            <div>
              <p className="text-xl font-black tabular-nums">
                {study.sessions}
              </p>
              <p className="text-muted-foreground mt-1 text-[10px]">Sessions</p>
            </div>
            <div className="border-border border-l pl-4">
              <p className="text-xl font-black tabular-nums">{study.correct}</p>
              <p className="text-muted-foreground mt-1 text-[10px]">
                Correct answers
              </p>
            </div>
            <div className="border-border border-l pl-4">
              <p className="text-xl font-black tabular-nums">
                {accuracy === null ? "—" : `${accuracy}%`}
              </p>
              <p className="text-muted-foreground mt-1 text-[10px]">Accuracy</p>
            </div>
          </div>
          {!study.ready && (
            <p className="text-muted-foreground mt-3 text-xs leading-5">
              Your study progress is temporarily unavailable. Starting a session
              will check whether saving is ready.
            </p>
          )}
          <Link
            href="/games/study"
            className="text-primary mt-5 inline-flex items-center gap-2 text-sm font-black"
          >
            {study.sessions > 0
              ? "Start another session"
              : "Start your first session"}
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="rounded-3xl border border-[#15987f]/20 bg-[#15987f]/[0.045] p-6">
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-[#117561] uppercase dark:text-[#69d7bd]">
            <BriefcaseBusiness className="size-4" /> Your work experience studio
          </div>
          <h2 className="mt-3 text-xl font-black">
            {jobRole ?? "Discover a role that fits."}
          </h2>
          {workplace && (
            <p className="mt-1 text-xs font-bold text-[#117561] dark:text-[#69d7bd]">
              {workplace} · simulated role
            </p>
          )}
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            {careerShifts > 0
              ? `${careerShifts} simulated ${careerShifts === 1 ? "shift" : "shifts"} completed. You’re building a record of the tasks and skills you’ve practised.`
              : "Try a short interview, complete a simulated shift and practise making decisions on the job."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {practicedSkills.length > 0 ? (
              practicedSkills.slice(0, 3).map(([skill]) => (
                <span
                  key={skill}
                  className="bg-card inline-flex items-center gap-1 rounded-full border border-[#15987f]/20 px-2.5 py-1.5 text-[10px] font-bold"
                >
                  <Check className="size-3 text-[#15987f]" />
                  {SKILLS[skill as SkillId] ?? skill}
                </span>
              ))
            ) : (
              <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                <Clock3 className="size-3.5" /> Five tasks per simulated shift
              </span>
            )}
          </div>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3">
            <Link
              href="/games/careers"
              className="inline-flex items-center gap-2 text-sm font-black text-[#117561] dark:text-[#69d7bd]"
            >
              {job ? "Continue your career" : "Find your first role"}
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/games/careers#cv"
              className="text-muted-foreground text-xs font-bold underline underline-offset-4"
            >
              View skills record
            </Link>
          </div>
        </div>
      </section>

      <Link
        href="/games/world?map=study-lobby"
        className="group relative mt-10 block overflow-hidden rounded-3xl bg-[#13203a] text-white"
      >
        <Image
          src="/landing/game-city-life.webp"
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 1100px"
          className="object-cover object-center opacity-35 transition duration-500 group-hover:scale-105"
        />
        <span className="absolute inset-0 bg-gradient-to-r from-[#13203a] via-[#13203a]/85 to-[#13203a]/20" />
        <span className="relative flex flex-wrap items-center gap-5 p-6 md:p-8">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/10">
            <MapPin className="size-6 text-[#f2d9a6]" />
          </span>
          <span className="flex-1">
            <span className="block text-[10px] font-bold tracking-wider text-[#f2d9a6] uppercase">
              A city built for your next step
            </span>
            <span className="mt-1.5 block text-xl font-black md:text-2xl">
              Walk into your learning world.
            </span>
            <span className="mt-2 block max-w-lg text-sm leading-6 text-white/70">
              Visit the study area, explore the city and find workplaces to try.
              Your education and game journey, connected.
            </span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-black text-[#13203a]">
            Enter the city
            <ArrowRight className="size-4" />
          </span>
        </span>
      </Link>

      <section
        id="awards"
        aria-labelledby="your-awards"
        className="mt-10 scroll-mt-24"
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-[#ad7b24] uppercase dark:text-[#f2d9a6]">
              Celebrate the progress
            </p>
            <h2 id="your-awards" className="mt-1 text-xl font-black">
              Your award collection
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Clear goals. Real effort. A little recognition along the way.
            </p>
          </div>
          <span className="rounded-full bg-[#f2d9a6]/30 px-3 py-1.5 text-xs font-bold">
            {earnedAwards} of {awards.length} earned
          </span>
        </div>
        <AwardCollection awards={awards} />
        <p className="text-muted-foreground mt-3 text-[11px] leading-5">
          These are IlluminatED game awards for study and simulated work
          experience. They are not accredited qualifications or evidence of
          employment.
        </p>
      </section>

      <section aria-labelledby="study-toolkit" className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="study-toolkit" className="text-xl font-black">
              Your study toolkit
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              The right tool for the moment you’re in.
            </p>
          </div>
          <Link href="/courses" className="text-primary text-xs font-bold">
            Browse all courses <span aria-hidden="true">→</span>
          </Link>
        </div>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map(({ href, title, text, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="group border-border bg-card hover:border-primary/40 hover:bg-muted/30 flex h-full items-start gap-3 rounded-2xl border p-4 transition"
              >
                <span className="bg-muted text-primary grid size-10 shrink-0 place-items-center rounded-xl">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black">{title}</span>
                  <span className="text-muted-foreground mt-1 block text-xs leading-5">
                    {text}
                  </span>
                </span>
                <ChevronRight className="text-muted-foreground mt-3 size-3.5 shrink-0 transition group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
