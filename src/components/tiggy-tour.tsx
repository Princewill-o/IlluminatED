"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import Link from "next/link";

import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Tiggy, type TiggyAction } from "@/components/tiggy";
import { cn } from "@/lib/utils";

interface Slide {
  action: TiggyAction;
  say: string;
  title: string;
  points: { text: React.ReactNode }[];
}

const SLIDES: Slide[] = [
  {
    action: "wave",
    say: "Hi, I'm Tiggy!",
    title: "This is your dashboard",
    points: [
      {
        text: (
          <>
            <b>Countdown and training plan.</b> The clock counts down to your
            exam date and tells you which stage of revision you're in.
          </>
        ),
      },
      {
        text: (
          <>
            <b>Your charts.</b> See your practice each week, your score in every
            subject, and how many topics are secure.
          </>
        ),
      },
      {
        text: (
          <>
            <b>Revise next.</b> I pick the topics you should work on next, from
            your quiz scores and what you told me you find hard.
          </>
        ),
      },
    ],
  },
  {
    action: "search",
    say: "Let's find your resources.",
    title: "Finding your resources",
    points: [
      {
        text: (
          <>
            <b>Learn</b> in the menu: choose your qualification, then your
            subject. Each topic page has notes, a worked example, key terms and
            a quiz.
          </>
        ),
      },
      {
        text: (
          <>
            <b>Resources → Official resources:</b> past papers, mark schemes and
            specifications, straight from your exam board.
          </>
        ),
      },
      {
        text: (
          <>
            <b>Resources → Free learning library:</b> videos, simulations and
            courses we've checked, for when you want another explanation.
          </>
        ),
      },
    ],
  },
  {
    action: "graduate",
    say: "You've got this.",
    title: "Practise and get help",
    points: [
      {
        text: (
          <>
            <b>Practise → Quiz centre and Flashcards.</b> Every quiz you finish
            is saved and updates your charts.
          </>
        ),
      },
      {
        text: (
          <>
            <b>Grade calculator.</b> Put in your paper marks to see your grade
            and what you need on the papers still to come.
          </>
        ),
      },
      {
        text: (
          <>
            <b>Stuck?</b> Request a tutor for one-to-one help, or ask students
            on IlluminatEDSocial.
          </>
        ),
      },
    ],
  },
];

/**
 * A short dashboard refresher opened by the "Tour with Tiggy" button.
 * New learners complete the full guided tour before they reach this page.
 */
export function TiggyTour({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const reopen = () => {
      openerRef.current = document.activeElement as HTMLElement;
      setIndex(0);
      setOpen(true);
    };
    window.addEventListener("tiggy-tour", reopen);
    return () => window.removeEventListener("tiggy-tour", reopen);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    openerRef.current?.focus();
  }, []);

  const go = useCallback(
    (to: number) => {
      if (to < 0 || to >= SLIDES.length) return;
      setDir(to > index ? 1 : -1);
      setIndex(to);
    },
    [index],
  );

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => closeRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open, index, go, close]);

  const slide = SLIDES[index];
  const last = index === SLIDES.length - 1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tour-title"
            aria-describedby="tour-body"
            className="bg-background relative w-full max-w-3xl overflow-hidden rounded-t-3xl border shadow-2xl sm:rounded-3xl"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 260 }}
          >
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              aria-label="Close tour"
              className="hover:bg-muted absolute top-4 right-4 z-10 grid size-10 place-items-center rounded-full"
            >
              <X className="size-5" aria-hidden />
            </button>

            <div className="grid sm:grid-cols-[0.8fr_1.2fr]">
              <div className="flex items-end justify-center bg-[#efe3cc] px-8 pt-12 dark:bg-[#2a2317]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={slide.action}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="w-40 sm:w-full sm:max-w-[240px]"
                  >
                    <Tiggy
                      action={slide.action}
                      say={slide.say}
                      sayClassName="left-[55%] text-xs sm:text-sm"
                    />
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="flex min-h-[23rem] flex-col p-6 sm:p-8">
                <p className="text-primary text-xs font-semibold tracking-wide uppercase">
                  {index === 0
                    ? `Welcome, ${name}`
                    : `Step ${index + 1} of ${SLIDES.length}`}
                </p>
                <AnimatePresence mode="wait" custom={dir}>
                  <motion.div
                    key={index}
                    custom={dir}
                    initial={{ opacity: 0, x: dir * 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: dir * -30 }}
                    transition={{ duration: 0.25 }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    onDragEnd={(_, info) => {
                      if (info.offset.x < -60) go(index + 1);
                      if (info.offset.x > 60) go(index - 1);
                    }}
                    className="mt-2 flex-1 cursor-grab active:cursor-grabbing"
                  >
                    <h2
                      id="tour-title"
                      className="text-2xl tracking-tight sm:text-3xl"
                    >
                      {slide.title}
                    </h2>
                    <ul id="tour-body" className="mt-5 space-y-3.5">
                      {slide.points.map((p, i) => (
                        <li
                          key={i}
                          className="flex gap-3 text-sm leading-relaxed"
                        >
                          <span className="bg-primary text-primary-foreground mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-xs font-semibold">
                            {i + 1}
                          </span>
                          <span className="[&_b]:font-semibold">{p.text}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                </AnimatePresence>

                <div className="mt-6 flex items-center justify-between gap-4">
                  <div
                    className="flex gap-1.5"
                    role="tablist"
                    aria-label="Slides"
                  >
                    {SLIDES.map((s, i) => (
                      <button
                        key={s.title}
                        type="button"
                        role="tab"
                        aria-selected={i === index}
                        aria-label={`Slide ${i + 1}: ${s.title}`}
                        onClick={() => go(i)}
                        className={cn(
                          "h-2 rounded-full transition-all",
                          i === index
                            ? "bg-primary w-6"
                            : "bg-muted-foreground/25 w-2",
                        )}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => go(index - 1)}
                        className="hover:bg-muted inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-medium"
                      >
                        <ArrowLeft className="size-4" aria-hidden /> Back
                      </button>
                    )}
                    {last ? (
                      <button
                        type="button"
                        onClick={close}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center rounded-full px-5 text-sm font-semibold"
                      >
                        Let's go
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => go(index + 1)}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center gap-1.5 rounded-full px-5 text-sm font-semibold"
                      >
                        Next <ArrowRight className="size-4" aria-hidden />
                      </button>
                    )}
                  </div>
                </div>
                {last && (
                  <p className="text-muted-foreground mt-4 text-xs">
                    You can see this again any time from{" "}
                    <Link
                      href="/dashboard"
                      onClick={close}
                      className="underline underline-offset-4"
                    >
                      your dashboard
                    </Link>
                    .
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Button that reopens Tiggy's tour. */
export function TourButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("tiggy-tour"))}
      className={className}
    >
      Tour with Tiggy
    </button>
  );
}
