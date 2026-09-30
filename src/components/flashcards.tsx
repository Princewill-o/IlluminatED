"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { Check, Eye, RotateCcw, Shuffle, Undo2 } from "lucide-react";

import { Empty, fieldCls, labelCls } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { COURSES } from "@/lib/data/courses";
import { ROUTES } from "@/lib/data/routes";
import { type Flashcard, FLASHCARDS, TOPICS } from "@/lib/data/topics";
import { STORAGE_KEYS, useStored } from "@/lib/storage";
import type { RouteId } from "@/lib/types";
import { cn } from "@/lib/utils";

type Marks = Record<string, "know" | "review">;

export function Flashcards() {
  const [marks, setMarks] = useStored<Marks>(STORAGE_KEYS.flashcards, {});
  const [route, setRoute] = useState<RouteId | "all">("all");
  const [course, setCourse] = useState("all");
  const [topic, setTopic] = useState("all");
  const [show, setShow] = useState<"all" | "review" | "unmarked">("all");
  const [order, setOrder] = useState<string[] | null>(null);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const courseOptions = COURSES.filter(
    (c) =>
      (route === "all" || c.route === route) &&
      FLASHCARDS.some((f) => c.topicIds.includes(f.topicId)),
  );
  const topicOptions = TOPICS.filter((t) =>
    course === "all"
      ? route === "all" ||
        FLASHCARDS.some((f) => f.topicId === t.id && f.route === route)
      : COURSES.find((c) => c.id === course)?.topicIds.includes(t.id),
  );

  const deck = useMemo(() => {
    const courseTopics =
      course === "all"
        ? null
        : (COURSES.find((c) => c.id === course)?.topicIds ?? []);
    let cards = FLASHCARDS.filter(
      (f) =>
        (route === "all" || f.route === route) &&
        (!courseTopics || courseTopics.includes(f.topicId)) &&
        (topic === "all" || f.topicId === topic),
    );
    if (show === "review")
      cards = cards.filter((c) => marks[c.key] === "review");
    if (show === "unmarked") cards = cards.filter((c) => !marks[c.key]);
    if (order) {
      const pos = new Map(order.map((k, n) => [k, n]));
      cards = [...cards].sort(
        (a, b) => (pos.get(a.key) ?? 0) - (pos.get(b.key) ?? 0),
      );
    }
    return cards;
    // marks intentionally excluded when show === "all" so marking doesn't reshuffle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, course, topic, show, order, show === "all" ? null : marks]);

  useEffect(() => {
    setI(0);
    setFlipped(false);
  }, [route, course, topic, show, order]);

  const card: Flashcard | undefined = deck[Math.min(i, deck.length - 1)];
  const known = deck.filter((c) => marks[c.key] === "know").length;
  const review = deck.filter((c) => marks[c.key] === "review").length;

  const mark = (m: "know" | "review") => {
    if (!card) return;
    setMarks((prev) => ({ ...prev, [card.key]: m }));
    setFlipped(false);
    if (show === "all") setI((n) => Math.min(n + 1, deck.length));
  };

  const shuffleDeck = () => {
    const keys = FLASHCARDS.map((f) => f.key);
    for (let n = keys.length - 1; n > 0; n--) {
      const j = Math.floor(Math.random() * (n + 1));
      [keys[n], keys[j]] = [keys[j], keys[n]];
    }
    setOrder(keys);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (
        tag === "INPUT" ||
        tag === "SELECT" ||
        tag === "TEXTAREA" ||
        tag === "BUTTON"
      )
        return;
      if (e.key === " ") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key.toLowerCase() === "k" && flipped) mark("know");
      else if (e.key.toLowerCase() === "r" && flipped) mark("review");
      else if (e.key === "ArrowRight") {
        setI((n) => Math.min(n + 1, deck.length - 1));
        setFlipped(false);
      } else if (e.key === "ArrowLeft") {
        setI((n) => Math.max(n - 1, 0));
        setFlipped(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const finished = deck.length > 0 && i >= deck.length;

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <aside className="h-fit space-y-4" aria-label="Flashcard filters">
        <div>
          <label htmlFor="fc-route" className={labelCls}>
            Qualification
          </label>
          <select
            id="fc-route"
            className={fieldCls}
            value={route}
            onChange={(e) => {
              setRoute(e.target.value as RouteId | "all");
              setCourse("all");
              setTopic("all");
            }}
          >
            <option value="all">All qualifications</option>
            {ROUTES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="fc-course" className={labelCls}>
            Subject
          </label>
          <select
            id="fc-course"
            className={fieldCls}
            value={course}
            onChange={(e) => {
              setCourse(e.target.value);
              setTopic("all");
            }}
          >
            <option value="all">All subjects</option>
            {courseOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="fc-topic" className={labelCls}>
            Topic
          </label>
          <select
            id="fc-topic"
            className={fieldCls}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          >
            <option value="all">All topics</option>
            {topicOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
        <fieldset>
          <legend className={labelCls}>Show</legend>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["all", "All cards"],
                ["unmarked", "Not yet marked"],
                ["review", "Review it"],
              ] as const
            ).map(([v, l]) => (
              <label
                key={v}
                className="has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:ring-ring cursor-pointer rounded-md border px-3 py-1 text-xs font-medium has-[:focus-visible]:ring-2"
              >
                <input
                  type="radio"
                  name="fc-show"
                  className="sr-only"
                  checked={show === v}
                  onChange={() => setShow(v)}
                />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="text-muted-foreground space-y-1 border-t pt-3 text-sm">
          <p>
            <span className="text-foreground font-semibold">{deck.length}</span>{" "}
            cards in this deck
          </p>
          <p>
            <span className="text-success font-semibold">{known}</span> know it
            · <span className="font-semibold text-[var(--warm)]">{review}</span>{" "}
            review it
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={shuffleDeck}>
            <Shuffle aria-hidden /> Shuffle
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOrder(null)}
            disabled={!order}
          >
            <Undo2 aria-hidden /> In order
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() =>
            setMarks((prev) =>
              Object.fromEntries(
                Object.entries(prev).filter(
                  ([k]) => !deck.some((c) => c.key === k),
                ),
              ),
            )
          }
          disabled={known + review === 0}
        >
          <RotateCcw aria-hidden /> Reset marks for this deck
        </Button>
      </aside>

      <div className="space-y-4">
        {deck.length === 0 ? (
          <Empty
            title={
              show === "review" ? "Nothing left to review." : "No cards match"
            }
          >
            {show === "review"
              ? "Cards you mark “review it” will appear here."
              : "Try another subject or topic."}
          </Empty>
        ) : finished ? (
          <div className="bg-card space-y-3 rounded-xl border p-8 text-center">
            <p className="text-2xl font-semibold">Deck complete</p>
            <p className="text-muted-foreground">
              {known} marked “know it”, {review} marked “review it”.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => setI(0)}>Go again</Button>
              {review > 0 && (
                <Button variant="outline" onClick={() => setShow("review")}>
                  Review the tricky ones
                </Button>
              )}
            </div>
          </div>
        ) : card ? (
          <>
            <p className="text-muted-foreground text-sm">
              {i + 1} of {deck.length} · {card.subject} · {card.kind}
              {marks[card.key] && (
                <span
                  className={
                    marks[card.key] === "know"
                      ? "text-success"
                      : "text-foreground"
                  }
                >
                  {" "}
                  · marked “
                  {marks[card.key] === "know" ? "know it" : "review it"}”
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={() => setFlipped((f) => !f)}
              aria-label={
                flipped ? "Show the prompt side" : "Reveal the answer"
              }
              className={cn(
                "flex min-h-64 w-full flex-col items-center justify-center rounded-xl border p-8 text-center shadow-sm transition-colors",
                flipped ? "bg-secondary" : "bg-card hover:border-foreground/30",
              )}
            >
              <span className="text-muted-foreground mb-3 text-xs font-semibold tracking-widest uppercase">
                {flipped
                  ? "Answer"
                  : card.kind === "Key term"
                    ? "Define this term"
                    : "Question"}
              </span>
              <span
                className="text-xl font-semibold md:text-2xl"
                aria-live="polite"
              >
                {flipped ? card.back : card.front}
              </span>
              {!flipped && (
                <span className="text-muted-foreground mt-4 flex items-center gap-1 text-sm">
                  <Eye className="size-4" aria-hidden /> Tap or press Space to
                  reveal
                </span>
              )}
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => mark("review")}
                disabled={!flipped}
              >
                Review it{" "}
                <kbd className="text-muted-foreground ml-1 text-xs">R</kbd>
              </Button>
              <Button onClick={() => mark("know")} disabled={!flipped}>
                <Check aria-hidden /> Know it{" "}
                <kbd className="ml-1 text-xs opacity-70">K</kbd>
              </Button>
              <Button
                variant="ghost"
                className="ml-auto"
                onClick={() => {
                  setI((n) => Math.max(0, n - 1));
                  setFlipped(false);
                }}
                disabled={i === 0}
              >
                Previous
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setI((n) => n + 1);
                  setFlipped(false);
                }}
              >
                Skip
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              From{" "}
              <Link
                href={`/courses/${card.courseId}/${card.topicId}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {card.topicTitle}
              </Link>{" "}
              · original IlluminatED material. Marks are saved in this browser
              only.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
