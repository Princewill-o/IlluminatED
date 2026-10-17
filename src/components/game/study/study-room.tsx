"use client";

import { useEffect, useId, useRef, useState } from "react";

import Link from "next/link";

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Coffee,
  GraduationCap,
  LoaderCircle,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";

import { startStudy, submitStudy } from "@/app/games/study/actions";
import { notifyPlayerChanged } from "@/components/app/app-shell";

type Course = { id: string; title: string; level: string };
type Session = {
  id: string;
  courseId: string;
  questions: { key: string; prompt: string; options: string[] }[];
};
type Result = {
  correct: number;
  total: number;
  xp: number;
  clout: number;
  answers: { answer: number; explain: string }[];
};

const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2b5fd9] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none";

/** An untimed, server-scored study session, shared by the city and the Learn area. */
export function StudyRoom({
  courses,
  onClose,
  onReward,
}: {
  courses: Course[];
  onClose?: () => void;
  onReward?: (reward: { xp: number; clout: number }) => void;
}) {
  const labelId = useId();
  const questionId = useId();
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [filter, setFilter] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submittedAnswers, setSubmittedAnswers] = useState<number[] | null>(
    null,
  );
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [rewardSyncError, setRewardSyncError] = useState(false);
  const [pending, setPending] = useState<"start" | "submit" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const rewardedSessions = useRef(new Set<string>());
  const mounted = useRef(true);
  const panel = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const contentHeading = useRef<HTMLHeadingElement>(null);
  const close = useRef(onClose);
  const reward = useRef(onReward);
  close.current = onClose;
  reward.current = onReward;
  const modal = Boolean(onClose);
  const course = courses.find((c) => c.id === (session?.courseId ?? courseId));
  const question = session?.questions[index];
  const answered = answers.filter((answer) => answer >= 0).length;
  const visibleCourses = courses.filter((c) =>
    `${c.title} ${c.level}`.toLowerCase().includes(filter.toLowerCase().trim()),
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!modal) return;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    heading.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close.current?.();
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), input:not([disabled]), [tabindex='0']",
        ) ?? [],
      ).filter(
        (element) =>
          element.getClientRects().length > 0 && !element.matches(":disabled"),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first) {
        event.preventDefault();
        heading.current?.focus();
      } else if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === heading.current)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", keydown, true);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", keydown, true);
      if (previous?.isConnected) previous.focus();
    };
  }, [modal]);

  useEffect(() => {
    if (session) contentHeading.current?.focus();
  }, [session, index, result]);

  async function begin() {
    if (busy.current || !courseId) return;
    busy.current = true;
    setPending("start");
    setError(null);
    try {
      const response = await startStudy(courseId);
      if (!mounted.current) return;
      if (!response.ok) {
        setError(response.error);
        return;
      }
      setSession(response.session);
      setAnswers(response.session.questions.map(() => -1));
      setSubmittedAnswers(null);
      setIndex(0);
      setResult(null);
      setRewardSyncError(false);
    } catch {
      if (mounted.current)
        setError(
          "We couldn’t open your study session. Check your connection and try again.",
        );
    } finally {
      busy.current = false;
      if (mounted.current) setPending(null);
    }
  }

  async function finish() {
    if (
      busy.current ||
      !session ||
      result ||
      answers.some((answer) => answer < 0)
    )
      return;
    busy.current = true;
    setPending("submit");
    setError(null);
    // A response can be lost after the server has saved the session. Retrying
    // must send the same answers and show the same review as the saved result.
    const handIn = submittedAnswers ?? [...answers];
    setSubmittedAnswers(handIn);
    try {
      const response = await submitStudy(session.id, handIn);
      if (!response.ok) {
        if (mounted.current) setError(response.error);
        return;
      }
      if (mounted.current) setResult(response.result);
      if (!rewardedSessions.current.has(session.id)) {
        rewardedSessions.current.add(session.id);
        try {
          notifyPlayerChanged();
          reward.current?.({
            xp: response.result.xp,
            clout: response.result.clout,
          });
        } catch {
          // The saved result is authoritative even if the city HUD cannot sync.
          if (mounted.current) setRewardSyncError(true);
        }
      }
    } catch {
      if (mounted.current)
        setError(
          "Your results couldn’t be loaded. Your answers are still here; try submitting again.",
        );
    } finally {
      busy.current = false;
      if (mounted.current) setPending(null);
    }
  }

  const room = (
    <div
      ref={panel}
      role={modal ? "dialog" : undefined}
      aria-modal={modal || undefined}
      aria-labelledby={labelId}
      className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-[#13203a]/10 bg-[#fbf8f1] text-[#13203a] shadow-[0_20px_80px_#13203a18]"
    >
      <header className="relative isolate overflow-hidden border-b border-[#13203a]/10 bg-[#efe9dc] px-5 py-6 sm:px-8 sm:py-8">
        <div className="relative z-10 max-w-lg pr-8 sm:max-w-[50%] sm:pr-0">
          <p className="flex items-center gap-2 text-[11px] font-black tracking-[0.2em] text-[#267162] uppercase">
            <span className="size-2 rounded-full bg-[#15987f]" /> Study Quarter
            · Quiet room
          </p>
          <h2
            ref={heading}
            id={labelId}
            tabIndex={-1}
            className="mt-3 text-3xl font-black tracking-tight outline-none sm:text-4xl"
          >
            A little focus.
            <br />A step forward.
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-6 text-[#13203a]/70">
            Settle in, practise what you know, and take your learning back into
            the city.
          </p>
          <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#13203a]/10 bg-[#fbf8f1]/90 px-3 py-1.5 text-xs font-bold">
            <Coffee className="size-3.5" aria-hidden /> No timer. Take your
            time.
          </span>
        </div>
        <StudyDesk />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close study room"
            className="absolute top-4 right-4 z-20 grid size-11 place-items-center rounded-full bg-white/90 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b5fd9]"
          >
            <X className="size-5" aria-hidden />
          </button>
        )}
      </header>

      <div className="p-5 sm:p-8">
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-[#a83c49]/25 bg-[#fff1ee] p-4 text-sm leading-6 text-[#87313c]"
          >
            {error}
          </div>
        )}

        {!session && (
          <div className="grid gap-7 lg:grid-cols-[1fr_240px]">
            <section aria-labelledby={`${labelId}-pick`}>
              <div className="flex items-center justify-between gap-4">
                <h3 id={`${labelId}-pick`} className="text-xl font-black">
                  What are we learning?
                </h3>
                <span className="shrink-0 text-xs font-bold text-[#13203a]/60">
                  5 questions
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#13203a]/65">
                Choose a subject for a short recall session. Your subjects
                appear first.
              </p>
              <label className="mt-4 block">
                <span className="sr-only">Find a study subject</span>
                <input
                  type="search"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  placeholder="Find a subject…"
                  className="h-11 w-full rounded-xl border border-[#13203a]/20 bg-white px-4 text-sm placeholder:text-[#13203a]/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b5fd9]"
                />
              </label>
              <fieldset
                disabled={Boolean(pending)}
                className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-xl p-1"
              >
                <legend className="sr-only">Study subject</legend>
                {visibleCourses.map((c) => (
                  <label
                    key={c.id}
                    className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 transition motion-reduce:transition-none ${courseId === c.id ? "border-[#2b5fd9] bg-[#eaf0ff]" : "border-transparent bg-white hover:border-[#13203a]/15"}`}
                  >
                    <input
                      type="radio"
                      name={`${labelId}-course`}
                      value={c.id}
                      checked={courseId === c.id}
                      onChange={() => {
                        setCourseId(c.id);
                        setError(null);
                      }}
                      className="size-4 shrink-0 accent-[#2b5fd9] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2b5fd9]"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold">{c.title}</span>
                      <span className="mt-0.5 block text-xs text-[#13203a]/60">
                        {c.level} · Recall &amp; understand
                      </span>
                    </span>
                    {courseId === c.id && (
                      <Check
                        className="ml-auto size-5 shrink-0 text-[#2b5fd9]"
                        aria-hidden
                      />
                    )}
                  </label>
                ))}
                {visibleCourses.length === 0 && (
                  <p className="px-3 py-6 text-sm leading-6 text-[#13203a]/65">
                    {courses.length
                      ? "No subjects match that search. Try another name."
                      : "More study sessions are being prepared. Explore your course notes while we add questions."}
                  </p>
                )}
              </fieldset>
              <button
                type="button"
                onClick={() => void begin()}
                disabled={Boolean(pending) || !courseId}
                className={`${button} mt-5 w-full bg-[#2b5fd9] text-white hover:bg-[#204db9]`}
              >
                {pending === "start" ? (
                  <>
                    <LoaderCircle
                      className="size-4 motion-safe:animate-spin"
                      aria-hidden
                    />{" "}
                    Opening your desk…
                  </>
                ) : (
                  <>
                    <BookOpen className="size-4" aria-hidden />{" "}
                    {error
                      ? "Try opening session again"
                      : "Start study session"}
                    <ArrowRight className="size-4" aria-hidden />
                  </>
                )}
              </button>
              {course && (
                <p className="mt-2 text-center text-xs text-[#13203a]/60">
                  Selected: {course.title}
                </p>
              )}
            </section>
            <aside className="rounded-2xl bg-[#13203a] p-5 text-white">
              <span className="grid size-11 place-items-center rounded-xl bg-white/10">
                <GraduationCap className="size-6 text-[#f2d9a6]" aria-hidden />
              </span>
              <h3 className="mt-4 text-lg font-black">Learn. Try. Grow.</h3>
              <ol className="mt-5 space-y-5 text-sm">
                {[
                  ["01", "Recall", "Answer five questions at your own pace."],
                  [
                    "02",
                    "Understand",
                    "Review every answer with an explanation.",
                  ],
                  [
                    "03",
                    "Build experience",
                    "Take the next step with a simulated work shift.",
                  ],
                ].map(([step, title, text]) => (
                  <li key={step} className="flex gap-3">
                    <span className="pt-0.5 text-xs font-black text-[#f2d9a6]">
                      {step}
                    </span>
                    <span>
                      <strong className="block">{title}</strong>
                      <span className="mt-1 block text-xs leading-5 text-white/65">
                        {text}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-6 border-t border-white/15 pt-4 text-xs leading-5 text-white/65">
                Earn game XP and Clout for up to ten sessions a day. Every
                completed session is checked and saved to your account.
              </p>
            </aside>
          </div>
        )}

        {session && !result && question && (
          <section
            aria-labelledby={questionId}
            aria-busy={pending === "submit"}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-black tracking-wide text-[#267162] uppercase">
                {course?.title ?? "Study session"}
              </p>
              <button
                type="button"
                disabled={Boolean(pending)}
                onClick={() => {
                  setSession(null);
                  setAnswers([]);
                  setSubmittedAnswers(null);
                  setError(null);
                  heading.current?.focus();
                }}
                className="min-h-11 rounded-lg px-2 text-xs font-bold text-[#2b5fd9] underline decoration-[#2b5fd9]/30 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
              >
                Leave session
              </button>
            </div>
            <p className="mt-1 text-xs font-bold text-[#13203a]/60">
              {answered} of {session.questions.length} answered
            </p>
            <nav aria-label="Study questions" className="mt-4 flex gap-2">
              {session.questions.map((q, i) => (
                <button
                  type="button"
                  key={q.key}
                  disabled={Boolean(pending)}
                  onClick={() => setIndex(i)}
                  aria-label={`Question ${i + 1}${answers[i] >= 0 ? ", answered" : ", unanswered"}`}
                  aria-current={index === i ? "step" : undefined}
                  className={`grid size-10 place-items-center rounded-xl border text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b5fd9] ${index === i ? "border-[#2b5fd9] bg-[#2b5fd9] text-white" : answers[i] >= 0 ? "border-[#15987f]/30 bg-[#e7f3ed] text-[#267162]" : "border-[#13203a]/15 bg-white"}`}
                >
                  {answers[i] >= 0 && index !== i ? (
                    <Check className="size-4" aria-hidden />
                  ) : (
                    i + 1
                  )}
                </button>
              ))}
            </nav>
            <h3
              ref={contentHeading}
              id={questionId}
              tabIndex={-1}
              className="mt-7 max-w-3xl text-xl leading-relaxed font-black outline-none sm:text-2xl"
            >
              <span className="mb-2 block text-xs font-bold tracking-wide text-[#13203a]/50 uppercase">
                Question {index + 1} of {session.questions.length}
              </span>
              {question.prompt}
            </h3>
            <fieldset
              disabled={Boolean(pending) || submittedAnswers !== null}
              className="mt-5 grid gap-3"
            >
              <legend className="sr-only">
                Choose your answer to question {index + 1}
              </legend>
              {question.options.map((option, i) => (
                <label
                  key={i}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-4 transition motion-reduce:transition-none ${answers[index] === i ? "border-[#2b5fd9] bg-[#eaf0ff]" : "border-[#13203a]/10 bg-white hover:border-[#13203a]/30"}`}
                >
                  <input
                    type="radio"
                    name={`${questionId}-${question.key}`}
                    value={i}
                    checked={answers[index] === i}
                    onChange={() =>
                      setAnswers((previous) =>
                        previous.map((answer, answerIndex) =>
                          answerIndex === index ? i : answer,
                        ),
                      )
                    }
                    className="size-4 shrink-0 accent-[#2b5fd9] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2b5fd9]"
                  />
                  <span
                    className="mr-1 grid size-7 shrink-0 place-items-center rounded-lg bg-[#13203a]/5 text-xs font-black"
                    aria-hidden
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-sm leading-6 font-medium">
                    {option}
                  </span>
                </label>
              ))}
            </fieldset>
            {submittedAnswers !== null && !pending && (
              <p
                role="status"
                className="mt-4 text-sm leading-6 text-[#13203a]/65"
              >
                Your submitted answers are locked while we recover the saved
                result. Use “Try submitting again” to check the same session.
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#13203a]/10 pt-5">
              <button
                type="button"
                onClick={() => setIndex((previous) => previous - 1)}
                disabled={index === 0 || Boolean(pending)}
                className={`${button} border border-[#13203a]/15 bg-white`}
              >
                <ArrowLeft className="size-4" aria-hidden /> Back
              </button>
              {index < session.questions.length - 1 ? (
                <button
                  type="button"
                  disabled={Boolean(pending) || answers[index] < 0}
                  onClick={() => setIndex((previous) => previous + 1)}
                  className={`${button} bg-[#2b5fd9] text-white hover:bg-[#204db9]`}
                >
                  Next question <ArrowRight className="size-4" aria-hidden />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void finish()}
                  disabled={
                    Boolean(pending) || answered !== session.questions.length
                  }
                  className={`${button} bg-[#2b5fd9] text-white hover:bg-[#204db9]`}
                >
                  {pending === "submit" ? (
                    <>
                      <LoaderCircle
                        className="size-4 motion-safe:animate-spin"
                        aria-hidden
                      />{" "}
                      Checking &amp; saving…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" aria-hidden />{" "}
                      {error ? "Try submitting again" : "Finish & review"}
                    </>
                  )}
                </button>
              )}
            </div>
            <p className="mt-4 text-center text-xs leading-5 text-[#13203a]/60">
              You can change any answer before you finish. Your progress is
              saved when the session is completed.
            </p>
          </section>
        )}

        {session && result && (
          <section aria-labelledby={`${labelId}-result`}>
            <div className="grid gap-5 rounded-2xl border border-[#15987f]/20 bg-[#e7f3ed] p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
              <div>
                <p className="flex items-center gap-2 text-xs font-black tracking-wider text-[#267162] uppercase">
                  <CheckCircle2 className="size-4" aria-hidden /> Session saved
                </p>
                <h3
                  ref={contentHeading}
                  id={`${labelId}-result`}
                  tabIndex={-1}
                  className="mt-2 text-2xl font-black outline-none"
                >
                  {result.correct === result.total
                    ? "A clean sweep. Nicely done."
                    : "You showed up. That’s progress."}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#13203a]/70">
                  {result.correct} of {result.total} correct ·{" "}
                  {course?.title ?? "Study session"}
                  <br />
                  Review the explanations below, especially anything that
                  surprised you.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="rounded-xl bg-white p-4 text-center">
                  <Sparkles
                    className="mx-auto size-5 text-[#2b5fd9]"
                    aria-hidden
                  />
                  <p className="mt-1 text-xl font-black">+{result.xp}</p>
                  <p className="text-[11px] font-bold text-[#13203a]/60">
                    Game XP
                  </p>
                </div>
                <div className="rounded-xl bg-white p-4 text-center">
                  <Trophy
                    className="mx-auto size-5 text-[#a56a00]"
                    aria-hidden
                  />
                  <p className="mt-1 text-xl font-black">+{result.clout}</p>
                  <p className="text-[11px] font-bold text-[#13203a]/60">
                    Clout
                  </p>
                </div>
              </div>
            </div>
            {result.xp === 0 && result.clout === 0 && (
              <p className="mt-3 text-sm leading-6 text-[#267162]">
                You’ve reached today’s game reward limit. This session still
                counts towards your saved study progress.
              </p>
            )}
            {rewardSyncError && (
              <p
                role="status"
                className="mt-3 text-sm leading-6 text-[#267162]"
              >
                Your session and rewards are saved. Reopen the city to refresh
                your game balance.
              </p>
            )}
            <h4 className="mt-7 text-lg font-black">Your study notes</h4>
            <ol className="mt-4 space-y-4">
              {session.questions.map((q, i) => {
                const feedback = result.answers[i];
                const correct = answers[i] === feedback?.answer;
                return (
                  <li
                    key={q.key}
                    className="rounded-2xl border border-[#13203a]/10 bg-white p-5"
                  >
                    <p
                      className={`text-xs font-black ${correct ? "text-[#267162]" : "text-[#99402f]"}`}
                    >
                      {i + 1}. {correct ? "Correct" : "Worth another look"}
                    </p>
                    <h5 className="mt-2 text-sm leading-6 font-bold">
                      {q.prompt}
                    </h5>
                    {!correct && (
                      <p className="mt-3 text-sm leading-6 text-[#13203a]/65">
                        Your answer: {q.options[answers[i]]}
                      </p>
                    )}
                    <p className="mt-2 text-sm leading-6">
                      <span className="font-bold text-[#267162]">
                        {correct ? "Your answer" : "Correct answer"}:
                      </span>{" "}
                      {feedback ? q.options[feedback.answer] : "Unavailable"}
                    </p>
                    <p className="mt-3 border-t border-[#13203a]/10 pt-3 text-sm leading-6 text-[#13203a]/70">
                      {feedback?.explain ??
                        "Try the course notes for more detail."}
                    </p>
                  </li>
                );
              })}
            </ol>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setSession(null);
                  setSubmittedAnswers(null);
                  setResult(null);
                  setError(null);
                  heading.current?.focus();
                }}
                className={`${button} bg-[#13203a] text-white`}
              >
                <BookOpen className="size-4" aria-hidden /> Choose another
                session
              </button>
              <button
                type="button"
                onClick={() => void begin()}
                disabled={Boolean(pending)}
                className={`${button} border border-[#13203a]/15 bg-white`}
              >
                {pending === "start" ? (
                  <>
                    <LoaderCircle
                      className="size-4 motion-safe:animate-spin"
                      aria-hidden
                    />{" "}
                    Opening…
                  </>
                ) : (
                  "Practise this subject again"
                )}
              </button>
              <Link
                href="/games/careers"
                className={`${button} text-[#2b5fd9]`}
              >
                Try a work simulation{" "}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <p className="mt-5 text-xs leading-5 text-[#13203a]/55">
              XP, Clout and city awards recognise activity in the game. They are
              not qualifications or employer endorsements.
            </p>
          </section>
        )}
      </div>
    </div>
  );

  if (!onClose) return room;
  return (
    <div
      className="fixed inset-0 z-[100010] overflow-y-auto overscroll-contain bg-[#0b1526]/75 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (!panel.current?.contains(event.target as Node)) onClose();
      }}
    >
      <div className="mx-auto flex min-h-full w-full items-center justify-center">
        {room}
      </div>
    </div>
  );
}

function StudyDesk() {
  return (
    <svg
      viewBox="0 0 440 280"
      fill="none"
      aria-hidden="true"
      className="pointer-events-none absolute right-0 bottom-0 hidden h-full w-[48%] opacity-90 sm:block"
    >
      <path d="M80 280V118a116 116 0 0 1 232 0v162" fill="#ded7c9" />
      <path d="M95 240V121a101 101 0 0 1 202 0v119H95Z" fill="#bcd8df" />
      <path d="M95 188h202v52H95z" fill="#9cafb5" />
      <path
        d="M110 188v-42h28v42m9 0v-67h40v67m8 0v-37h24v37m9 0V99h25v89m10 0v-51h23v51"
        fill="#859ca8"
      />
      <path d="M239 99V75m-7 24 7-11 7 11" stroke="#859ca8" strokeWidth="3" />
      <circle cx="255" cy="70" r="21" fill="#f8f0ca" />
      <path d="M196 22v218M95 134h202" stroke="#f8f3e9" strokeWidth="7" />
      <path d="M65 244h306l44 36H38l27-36Z" fill="#d5c9b4" />
      <path d="M112 243v37m219-37v37" stroke="#9b7356" strokeWidth="11" />
      <path d="M72 225h302v17H72z" fill="#bb8a62" />
      <path d="M72 225h302v5H72z" fill="#d3ab82" />
      <path d="M151 225v-22h58v22" fill="#2b5fd9" />
      <path
        d="M157 203v22m50-13h-45m45 6h-45"
        stroke="#f7f1e6"
        strokeWidth="2"
      />
      <path d="M142 201v-11h61v11" fill="#d69077" />
      <path d="M150 194h44" stroke="#f7f1e6" strokeWidth="2" />
      <path d="m226 225 24-23 43 4 23 19h-90Z" fill="#faf7ec" />
      <path
        d="m250 202 20 23m-21-13 13 2m-8 4 12 2m12-8 13 2m-8 4 13 2"
        stroke="#bdc3c2"
        strokeWidth="1.5"
      />
      <path
        d="M323 222h27m-14-2V166l-25-30"
        stroke="#596663"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path d="m311 133-13 6-14 23 43-9-16-20Z" fill="#15987f" />
      <path d="m292 159 24-5" stroke="#f2d9a6" strokeWidth="4" />
      <path
        d="M105 225v-20m0 4c-16 0-26-12-21-25 16 0 24 9 21 25Zm1-12c1-19 10-28 24-24 0 16-8 26-24 24Zm-1-2c-10-9-12-24-3-33 12 6 17 20 3 33Z"
        fill="#588b69"
      />
      <path d="M91 207h28l-5 18H96l-5-18Z" fill="#e2ad80" />
      <path d="M217 203v-12h15v12a7.5 7.5 0 0 1-15 0Z" fill="#fbf7eb" />
      <path d="M232 194h5v7h-5" stroke="#fbf7eb" strokeWidth="3" />
      <path
        d="M221 184c-4-4 4-7 0-11"
        stroke="#a79f90"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M248 280v-22a26 26 0 0 1 52 0v22" fill="#78938b" />
      <path
        d="M252 280v-21a22 22 0 0 1 44 0v21"
        stroke="#92aaa2"
        strokeWidth="2"
      />
      <path d="M349 75h36v43h-36z" fill="#d5bd98" />
      <path d="M353 79h28v35h-28z" fill="#f7f1e6" />
      <path d="m359 104 6-13 7 7 5-4" stroke="#15987f" strokeWidth="2" />
    </svg>
  );
}
