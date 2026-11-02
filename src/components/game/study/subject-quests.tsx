"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";

import animations from "../world/game-feedback.module.css";

import {
  chooseSubjectQuest,
  loadSubjectQuests,
  questLibraryLesson,
  startSubjectQuest,
  submitSubjectQuest,
} from "@/app/games/study/quest-actions";
import { notifyPlayerChanged } from "@/components/app/app-shell";
import { LessonSlides } from "@/components/learn/lesson-slides";
import { announceGameMoment } from "@/game/core/game-moments";
import {
  questComplete,
  subjectQuestSummary,
  type SubjectQuest,
  type SubjectQuestBoard,
  type SubjectQuestContent,
  type SubjectQuestResult,
  type SubjectQuestSession,
} from "@/game/core/subject-quests";

const button =
  "min-h-11 rounded-full px-5 py-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40";
type Supplement = Awaited<ReturnType<typeof questLibraryLesson>>;
export function SubjectQuests({
  onClose,
  onReward,
}: {
  courses?: { id: string; title: string; level: string }[];
  onClose?: () => void;
  onReward?: (reward: { xp: number; clout: number }) => void;
}) {
  const [board, setBoard] = useState<SubjectQuestBoard | null>(null),
    [course, setCourse] = useState(() => {
      const subject =
        typeof window !== "undefined"
          ? (new URLSearchParams(window.location.search).get("subject") ?? "")
          : "";
      return /^[a-z0-9-]{2,80}$/.test(subject) ? subject : "";
    });
  const [selected, setSelected] = useState<SubjectQuest | null>(null),
    [content, setContent] = useState<SubjectQuestContent | null>(null);
  const [slide, setSlide] = useState(0),
    [supplement, setSupplement] = useState<Supplement>(null);
  const [session, setSession] = useState<SubjectQuestSession | null>(null),
    [answers, setAnswers] = useState<number[]>([]),
    [index, setIndex] = useState(0);
  const [submittedAnswers, setSubmittedAnswers] = useState<number[] | null>(
    null,
  );
  const [result, setResult] = useState<SubjectQuestResult | null>(null),
    [error, setError] = useState<string | null>(null),
    [pending, setPending] = useState(false);
  const locked = useRef(false),
    alive = useRef(true),
    root = useRef<HTMLElement>(null),
    rewarded = useRef(new Set<string>());
  const close = useRef(onClose);
  close.current = onClose;
  const modal = Boolean(onClose);
  async function refresh() {
    const response = await loadSubjectQuests();
    if (!alive.current) return;
    if (response.ok) {
      setBoard(response.board);
      setCourse((current) =>
        response.board.quests.some((quest) => quest.courseId === current)
          ? current
          : "",
      );
    } else setError(response.error);
  }
  useEffect(() => {
    alive.current = true;
    void refresh().catch(() =>
      setError("Could not load your study quests. Try again."),
    );
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    root.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (document.querySelector("[data-game-cutscene]")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!locked.current) close.current?.();
      }
      if (event.key !== "Tab") return;
      const items = Array.from(
        root.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input:not(:disabled),select,textarea,[tabindex="0"]',
        ) ?? [],
      ).filter((element) => element.getClientRects().length > 0);
      const first = items[0],
        last = items[items.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === root.current)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", key, true);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", key, true);
      if (previous?.isConnected) previous.focus();
    };
  }, [modal]);
  async function run(action: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true;
    setPending(true);
    setError(null);
    try {
      await action();
    } catch {
      if (alive.current)
        setError(
          "Your connection was interrupted. Your saved progress is kept; try again.",
        );
    } finally {
      locked.current = false;
      if (alive.current) setPending(false);
    }
  }
  async function choose(quest: SubjectQuest) {
    await run(async () => {
      const response = await chooseSubjectQuest(quest.courseId, quest.topicId);
      if (!response.ok) {
        setError(response.error);
        return;
      }
      setSelected(quest);
      setContent(response.content);
      setSlide(0);
      setSupplement(null);
      setSession(null);
      setResult(null);
      announceGameMoment({
        kind: "quest",
        title: quest.title,
        message: `Your ${quest.courseTitle} mission: learn, recall, then test your understanding.`,
        scene: true,
      });
      await refresh();
    });
  }
  async function review() {
    if (!selected) return;
    await run(async () => {
      const response = await chooseSubjectQuest(
        selected.courseId,
        selected.topicId,
        true,
      );
      if (!response.ok) {
        setError(response.error);
        return;
      }
      setSelected({ ...selected, reviewed: true });
      announceGameMoment({
        kind: "revision",
        title: "Lesson reviewed",
        message:
          "Your practice round is unlocked. Try recalling the key ideas without looking.",
      });
      await refresh();
    });
  }
  async function begin(courseId: string, topicId: string | null) {
    await run(async () => {
      const response = await startSubjectQuest(courseId, topicId);
      if (!response.ok) {
        setError(response.error);
        return;
      }
      setSession(response.session);
      setAnswers(response.session.questions.map(() => -1));
      setSubmittedAnswers(null);
      setIndex(0);
      setResult(null);
      if (topicId === null)
        announceGameMoment({
          kind: "checkpoint",
          title: "Practice checkpoint",
          message:
            "Work independently. Aim for 98% or higher, then review every mistake.",
          scene: true,
        });
    });
  }
  async function finish() {
    if (!session || answers.some((answer) => answer < 0)) return;
    await run(async () => {
      const frozen = submittedAnswers ?? answers.slice();
      setSubmittedAnswers(frozen);
      const response = await submitSubjectQuest(session.id, frozen);
      if (!response.ok) {
        setError(response.error);
        return;
      }
      setResult(response.result);
      await refresh();
      if (!rewarded.current.has(session.id)) {
        rewarded.current.add(session.id);
        announceGameMoment({
          kind: response.result.xp ? "reward" : "revision",
          title: response.result.xp
            ? "Quest rewards unlocked"
            : `Practice result: ${response.result.score}%`,
          message: response.result.xp
            ? `+${response.result.xp} XP · +${response.result.clout} Clout. Your progress is saved.`
            : response.result.passed
              ? "Progress saved. Aim for 98% and keep building your understanding."
              : "Your next mission: revisit each missed answer and try the topic again.",
          scene: Boolean(response.result.xp),
        });
        try {
          notifyPlayerChanged();
          if (response.result.xp || response.result.clout)
            onReward?.({
              xp: response.result.xp,
              clout: response.result.clout,
            });
        } catch {
          setError(
            "Your result and rewards were saved. Reopen the game to refresh the balance display.",
          );
        }
      }
    });
  }
  function back() {
    setSelected(null);
    setContent(null);
    setSession(null);
    setResult(null);
    setSupplement(null);
    setError(null);
  }
  const quests = board?.quests ?? [],
    courses = Array.from(
      new Map(quests.map((quest) => [quest.courseId, quest.courseTitle])),
    );
  const current = selected
    ? (quests.find(
        (quest) =>
          quest.courseId === selected.courseId &&
          quest.topicId === selected.topicId,
      ) ?? selected)
    : null;
  const notes = content
    ? [
        { title: "Your mission", text: content.summary },
        ...content.objectives.map((text) => ({ title: "Learning goal", text })),
        ...content.explanation.map((text, i) => ({
          title: `Learn · ${i + 1}`,
          text,
        })),
        ...(content.workedExample
          ? [
              {
                title: content.workedExample.question,
                text: [
                  ...content.workedExample.steps,
                  `Answer: ${content.workedExample.answer}`,
                ].join("\n\n"),
              },
            ]
          : []),
        ...content.keyTerms.map((term) => ({
          title: term.term,
          text: term.definition,
        })),
        ...content.misconceptions.map((item) => ({
          title: "Avoid this mistake",
          text: `${item.wrong}\n\n${item.right}`,
        })),
      ]
    : [];
  const question = session?.questions[index];
  const panel = (
    <section
      ref={root}
      tabIndex={-1}
      role={onClose ? "dialog" : undefined}
      aria-modal={Boolean(onClose) || undefined}
      aria-label="Your subject study quests"
      className="bg-background text-foreground mx-auto w-full max-w-6xl rounded-3xl border p-4 shadow-xl outline-none sm:p-7"
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-primary text-sm font-bold">
            Study Quarter · Choose your mission
          </p>
          <h2 className="mt-2 text-3xl font-black">Your subject quests</h2>
          <p className="text-muted-foreground mt-3 max-w-3xl text-sm leading-relaxed">
            Only subjects you picked in your account appear here. Choose any
            quest, learn its content, then score at least 80% in two practice
            rounds. Your choice and progress are saved.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className={`${button} bg-card text-card-foreground shrink-0 border`}
          >
            Back to game
          </button>
        )}
      </header>
      <p className="bg-muted my-5 rounded-xl border p-4 text-sm">
        Complete every available topic quest in a subject to unlock its practice
        exam checkpoint. A recent pass stays current for 14 days. This tracks
        our available material; check your exam-board specification and
        teacher’s advice for full exam preparation.
      </p>
      {error && (
        <p
          role="alert"
          className="border-destructive/50 bg-destructive/10 my-4 rounded-xl border p-4"
        >
          {error}{" "}
          <button
            type="button"
            disabled={pending}
            onClick={() => void run(refresh)}
            className="ml-2 font-bold underline"
          >
            Reload saved progress
          </button>
        </p>
      )}
      {!board && !error && <p role="status">Loading your selected subjects…</p>}
      {pending && (
        <p role="status" className="text-primary my-3 text-sm font-bold">
          Saving your quest…
        </p>
      )}
      {board && quests.length === 0 && (
        <div className="rounded-2xl border p-6">
          <h3 className="text-xl font-bold">Pick your subjects first</h3>
          <p className="mt-3">
            Choose subjects in your account, then return to build your quest
            board.
          </p>
          <Link
            href="/dashboard/settings"
            className={`${button} bg-primary text-primary-foreground mt-4 inline-block`}
          >
            Choose subjects
          </Link>
        </div>
      )}
      {session ? (
        result ? (
          <div className="bg-card text-card-foreground my-6 rounded-2xl border p-5">
            <h3 className="text-2xl font-bold">
              {session.topicId
                ? "Quest practice complete"
                : "Practice exam checkpoint complete"}
            </h3>
            <p className="mt-4 text-3xl font-black">
              {result.score}% · {result.correct}/{result.total}
            </p>
            <p className="mt-3">
              {result.passed
                ? session.topicId
                  ? `${result.passes}/2 successful practice rounds saved. Choose your next step.`
                  : "Practice checkpoint passed. Use the explanations and official past papers to continue preparing."
                : "Keep practising. Review the explanations, revisit the lesson and try again."}
            </p>
            <p className="text-primary mt-3 font-bold">
              {result.xp || result.clout
                ? `+${result.xp} XP · +${result.clout} Clout`
                : session.topicId
                  ? "First full quest completion: 40 XP + 20 Clout. Repeat attempts improve your evidence without repeat rewards."
                  : "First practice exam pass: 100 XP + 50 Clout. Rewards are paid once per subject."}
            </p>
            <details className="mt-5 rounded-xl border p-4">
              <summary className="min-h-11 cursor-pointer font-bold">
                Review answers and explanations
              </summary>
              {session.questions.map((item, i) => (
                <div key={item.key} className="mt-5">
                  <h4 className="font-semibold">{item.prompt}</h4>
                  <p className="mt-2">
                    Your answer: {item.options[answers[i]]}
                  </p>
                  <p className="text-primary mt-1 font-bold">
                    Correct answer: {item.options[result.answers[i]?.answer]}
                  </p>
                  <p className="mt-2 text-sm">{result.answers[i]?.explain}</p>
                </div>
              ))}
            </details>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={() => void begin(session.courseId, session.topicId)}
                className={`${button} bg-primary text-primary-foreground`}
              >
                Practise again
              </button>
              <button
                type="button"
                onClick={back}
                className={`${button} border`}
              >
                Choose another quest
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-card text-card-foreground my-6 rounded-2xl border p-5">
            <p className="text-primary text-sm font-bold">
              {session.topicId
                ? "Quest practice"
                : "Practice exam checkpoint · untimed"}{" "}
              · {index + 1}/{session.questions.length}
            </p>
            <h3 className="mt-4 text-2xl font-bold">{question?.prompt}</h3>
            <fieldset className="mt-5 space-y-3">
              <legend className="sr-only">Choose one answer</legend>
              {question?.options.map((option, i) => (
                <label
                  key={i}
                  className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-4 ${answers[index] === i ? "border-primary bg-primary/10" : "bg-background"}`}
                >
                  <input
                    type="radio"
                    name={`quest-${session.id}-${index}`}
                    checked={answers[index] === i}
                    onChange={() =>
                      setAnswers((previous) =>
                        previous.map((answer, n) => (n === index ? i : answer)),
                      )
                    }
                    disabled={pending || submittedAnswers !== null}
                  />
                  {option}
                </label>
              ))}
            </fieldset>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={index === 0 || pending}
                onClick={() => setIndex((value) => value - 1)}
                className={`${button} border`}
              >
                ← Previous
              </button>
              {index < session.questions.length - 1 ? (
                <button
                  type="button"
                  disabled={answers[index] < 0 || pending}
                  onClick={() => setIndex((value) => value + 1)}
                  className={`${button} bg-primary text-primary-foreground`}
                >
                  Next question →
                </button>
              ) : (
                <button
                  type="button"
                  disabled={answers.some((answer) => answer < 0) || pending}
                  onClick={() => void finish()}
                  className={`${button} bg-primary text-primary-foreground`}
                >
                  Submit answers
                </button>
              )}
              <button
                type="button"
                disabled={pending}
                onClick={back}
                className={`${button} border`}
              >
                Leave attempt
              </button>
            </div>
          </div>
        )
      ) : selected && content ? (
        <div className="my-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-primary text-sm font-bold">
                {selected.courseTitle}
              </p>
              <h3 className="mt-1 text-2xl font-black">{selected.title}</h3>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={back}
              className={`${button} border`}
            >
              Choose a different quest
            </button>
          </div>
          {content.draftPractice && (
            <p className="text-muted-foreground rounded-xl border p-4 text-sm">
              Some practice items in this quest await subject-expert approval.
              Use this as draft practice alongside your teacher’s materials.
            </p>
          )}
          {content.foundationFrom && (
            <p className="text-muted-foreground rounded-xl border p-4 text-sm">
              Shared foundation material from {content.foundationFrom}. This
              refresher supports your chosen subject; it does not cover its
              entire specification.
            </p>
          )}
          <div
            key={`${selected.topicId}-${slide}`}
            className={`${animations.lesson} rounded-3xl bg-[#13203a] p-6 text-white sm:p-9`}
          >
            <p className="text-sm font-bold text-[#c9bdff]">
              Lesson {slide + 1}/{notes.length}
            </p>
            <h4 className="mt-4 text-2xl font-bold">{notes[slide]?.title}</h4>
            <p className="mt-5 text-lg leading-relaxed whitespace-pre-line">
              {notes[slide]?.text}
            </p>
          </div>
          {content.sources?.map((source, i) => (
            <p key={i} className="text-muted-foreground text-xs">
              {source.source} · {source.licence}
            </p>
          ))}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={slide === 0 || pending}
              onClick={() => setSlide((value) => value - 1)}
              className={`${button} border`}
            >
              ← Previous slide
            </button>
            {slide < notes.length - 1 ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => setSlide((value) => value + 1)}
                className={`${button} bg-primary text-primary-foreground`}
              >
                Next slide →
              </button>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => void review()}
                className={`${button} bg-primary text-primary-foreground`}
              >
                {current?.reviewed
                  ? "✓ Lesson reviewed"
                  : "I’ve reviewed this lesson"}
              </button>
            )}
          </div>
          {content.retrieval.length > 0 && (
            <section className="rounded-2xl border p-5">
              <h4 className="font-bold">
                Recall challenge · explain it without your notes
              </h4>
              <p className="text-muted-foreground mt-2 text-sm">
                Say or write your answer first. Reveal the model answer, check
                your reasoning, then revisit any gaps. These self-checks do not
                award a scored pass.
              </p>
              {content.retrieval.map((item, i) => (
                <details key={i} className="mt-3 rounded-xl border p-4">
                  <summary className="min-h-11 cursor-pointer font-semibold">
                    {item.q}
                  </summary>
                  <p className="mt-3 whitespace-pre-line">{item.a}</p>
                </details>
              ))}
            </section>
          )}
          <div className="rounded-2xl border p-5">
            <h4 className="font-bold">Your quest steps</h4>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>
                {current?.reviewed ? "✓" : "○"} Review the lesson
                (self-reported).
              </li>
              <li>{current?.passes ?? 0}/2 practice passes at 80% or more.</li>
              <li>
                {questComplete(current ?? selected)
                  ? "✓ Complete · practice evidence is current"
                  : "Keep a successful practice round within the last 14 days."}
              </li>
            </ol>
            <button
              type="button"
              disabled={
                pending || !current?.reviewed || !selected.questionCount
              }
              onClick={() => void begin(selected.courseId, selected.topicId)}
              className={`${button} bg-primary text-primary-foreground mt-4`}
            >
              Choose this practice quest ·{" "}
              {selected.questionCount < 5 ? selected.questionCount : 5}{" "}
              questions
            </button>
            <p className="text-muted-foreground mt-3 text-xs">
              First completion earns 40 XP and 20 Clout. You can choose another
              quest at any time.
            </p>
          </div>
          {content.route === "gcse" && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                void run(async () => {
                  const lesson = await questLibraryLesson(
                    selected.courseId,
                    selected.topicId,
                  );
                  if (lesson) setSupplement(lesson);
                  else
                    setError(
                      "No matching imported lesson was found. Your quest lesson above is still available.",
                    );
                })
              }
              className={`${button} border`}
            >
              Load an extra IllumED lesson in game
            </button>
          )}
          {supplement && (
            <div className="rounded-2xl border p-5">
              <h4 className="text-xl font-bold">
                Extended learning · {supplement.lessons.length} supporting
                lessons
              </h4>
              <p className="text-muted-foreground my-3 text-sm">
                Explore matching lessons and the first match’s wider unit. These
                are supporting materials; check the titles against your
                syllabus.
              </p>
              <label className="my-4 block text-sm font-bold">
                Choose a supporting lesson
                <select
                  disabled={pending}
                  value={supplement.slug}
                  onChange={(event) => {
                    const slug = event.target.value;
                    void run(async () => {
                      const lesson = await questLibraryLesson(
                        selected.courseId,
                        selected.topicId,
                        slug,
                      );
                      if (lesson) setSupplement(lesson);
                      else
                        setError(
                          "That supporting lesson is unavailable. Try another.",
                        );
                    });
                  }}
                  className="bg-background text-foreground mt-2 min-h-11 w-full rounded-xl border p-3"
                >
                  {supplement.lessons.map((lesson) => (
                    <option key={lesson.slug} value={lesson.slug}>
                      {lesson.title}
                    </option>
                  ))}
                </select>
              </label>
              <LessonSlides
                key={supplement.slug}
                slug={supplement.slug}
                title={supplement.title}
                slides={supplement.slides}
                questions={supplement.questions}
              />
              <p className="text-muted-foreground text-xs">
                Adapted from{" "}
                <a
                  href={supplement.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Oak National Academy
                </a>
                , Open Government Licence v3.0. Supplementary material, not a
                guarantee of exam-board coverage.
              </p>
            </div>
          )}
        </div>
      ) : board && quests.length > 0 ? (
        <>
          <label className="my-5 block text-sm font-bold">
            Choose your subject
            <select
              value={course}
              onChange={(event) => setCourse(event.target.value)}
              className="bg-background text-foreground mt-2 min-h-11 w-full rounded-xl border p-3"
            >
              <option value="">All my selected subjects</option>
              {courses.map(([id, title]) => (
                <option key={id} value={id}>
                  {title}
                </option>
              ))}
            </select>
          </label>
          {courses
            .filter(([id]) => !course || course === id)
            .map(([id, title]) => {
              const items = quests.filter((quest) => quest.courseId === id),
                summary = subjectQuestSummary(items),
                exam = board.exams.find((exam) => exam.courseId === id),
                evidence = board.evidence?.find((item) => item.courseId === id);
              return (
                <section key={id} className="my-7 space-y-4">
                  <div className="bg-card text-card-foreground rounded-2xl border p-5">
                    <h3 className="text-xl font-black">{title}</h3>
                    <p className="mt-2 text-sm">
                      {summary.completed}/{summary.total} topic quests complete
                      · {summary.percent}% of available quest material
                    </p>
                    <progress
                      value={summary.completed}
                      max={summary.total}
                      aria-label={`${title} quest completion`}
                      className="accent-primary my-3 h-3 w-full"
                    />
                    <p className="text-sm">
                      {exam?.passed
                        ? `Practice checkpoint passed · best ${exam.bestScore}%. Keep preparing with your teacher and official papers.`
                        : summary.examUnlocked
                          ? "Ready for the practice exam checkpoint"
                          : "Complete your topic quests in any order to unlock the practice exam checkpoint."}
                    </p>
                    <button
                      type="button"
                      disabled={!summary.examUnlocked || pending}
                      onClick={() => void begin(id, null)}
                      className={`${button} bg-primary text-primary-foreground mt-4`}
                    >
                      {summary.examUnlocked
                        ? "Choose practice exam checkpoint"
                        : "Practice exam checkpoint locked"}
                    </button>
                  </div>
                  <div className="bg-card text-card-foreground rounded-2xl border border-[#cc3b88]/40 p-5">
                    <p className="text-primary text-xs font-black tracking-wider uppercase">
                      Your 98% practice goal
                    </p>
                    <h4 className="mt-2 text-xl font-bold">
                      {evidence?.targetAchieved
                        ? "Practice target achieved"
                        : evidence &&
                            (evidence.availableQuestions < 40 || evidence.draft)
                          ? "More reviewed material needed"
                          : "Build consistent evidence"}
                    </h4>
                    <p className="mt-3 text-sm">
                      Aim for at least 98% on the latest checkpoints from three
                      different days within 14 days, covering at least 40
                      distinct questions, with at least 10 questions per
                      checkpoint. A paper with fewer than 50 questions needs
                      every answer correct to reach 98%.
                    </p>
                    <dl className="my-4 grid grid-cols-3 gap-3 text-center">
                      <div className="bg-muted rounded-xl p-3">
                        <dt className="text-xs">Available questions</dt>
                        <dd className="mt-1 text-xl font-black">
                          {evidence?.availableQuestions ?? "—"}
                        </dd>
                      </div>
                      <div className="bg-muted rounded-xl p-3">
                        <dt className="text-xs">98%+ days</dt>
                        <dd className="mt-1 text-xl font-black">
                          {evidence?.qualifyingDays ?? 0}/3
                        </dd>
                      </div>
                      <div className="bg-muted rounded-xl p-3">
                        <dt className="text-xs">Distinct questions</dt>
                        <dd className="mt-1 text-xl font-black">
                          {evidence?.distinctQuestions ?? 0}/40
                        </dd>
                      </div>
                    </dl>
                    {evidence?.draft && (
                      <p className="my-3 text-sm font-semibold">
                        Some items await subject-expert review. The mastery
                        milestone stays unavailable while this course contains
                        draft practice.
                      </p>
                    )}
                    <p className="text-muted-foreground text-sm">
                      This is a practice milestone, not a predicted grade.
                      Available quests are not a full specification audit.
                      Complete your exam-board syllabus, timed official papers
                      and extended written or practical work with teacher
                      feedback.
                    </p>
                    <Link
                      href="/curriculum"
                      target="_blank"
                      className="text-primary mt-3 inline-block min-h-11 py-3 text-sm font-bold underline"
                    >
                      Find more IllumED lessons ↗
                    </Link>
                  </div>
                  {Boolean(evidence?.weakTopics.length) && (
                    <div className="rounded-2xl border p-5">
                      <h4 className="font-bold">Your revision missions</h4>
                      <p className="text-muted-foreground mt-2 text-sm">
                        Topics with a missed answer on your latest attempt at
                        that question. Revisit the lesson and practise again.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {items
                          .filter((quest) =>
                            evidence?.weakTopics.includes(quest.topicId),
                          )
                          .map((quest) => (
                            <button
                              type="button"
                              key={quest.topicId}
                              disabled={pending}
                              onClick={() => void choose(quest)}
                              className={`${button} border-primary text-primary border`}
                            >
                              Revise {quest.title} →
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {items.map((quest) => (
                      <button
                        type="button"
                        key={quest.topicId}
                        disabled={pending}
                        onClick={() => void choose(quest)}
                        className={`${animations.card} bg-card text-card-foreground focus-visible:outline-ring rounded-2xl border p-5 text-left focus-visible:outline-2 ${quest.active ? "border-primary ring-primary ring-1" : "hover:border-primary"}`}
                      >
                        <span className="text-primary text-xs font-bold">
                          {questComplete(quest)
                            ? "✓ Quest complete"
                            : quest.active
                              ? "Your chosen quest"
                              : quest.passes >= 2
                                ? "Review due"
                                : "Choose this quest"}
                        </span>
                        <strong className="mt-2 block text-lg">
                          {quest.title}
                        </strong>
                        <span className="text-muted-foreground mt-3 block text-sm">
                          {quest.reviewed
                            ? "Lesson reviewed"
                            : "Read the lesson"}{" "}
                          · {quest.passes}/2 successful practice rounds
                        </span>
                        <span className="mt-3 block text-sm font-bold">
                          {quest.questionCount
                            ? "Open quest →"
                            : "Lesson available · scored practice coming later"}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          <Link
            href="/dashboard/settings"
            className="text-primary inline-block py-3 text-sm font-bold underline"
          >
            Change the subjects you picked
          </Link>
        </>
      ) : null}
    </section>
  );
  return onClose ? (
    <div className="absolute inset-0 z-[100024] overflow-y-auto bg-black/65 p-3 sm:p-6">
      {panel}
    </div>
  ) : (
    panel
  );
}
