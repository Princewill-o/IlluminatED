import type { Company } from "./companies";
import { generate } from "./generators";
import { type Rng, createRng, pick, shuffle } from "./rng";
import { type GameQuestion, SHIFT_LENGTH } from "./shift";

/** The parts of an IlluminatED bank question the game needs. */
export interface BankItem {
  key: string;
  q: string;
  options: string[];
  answer: number;
  explain: string;
  topicTitle: string;
  courseId: string;
}

/** A key term from the flashcard set, turned into "which term matches?". */
export interface TermItem {
  key: string;
  front: string;
  back: string;
  topicTitle: string;
  courseId: string;
}

export interface DeckSources {
  bank: BankItem[];
  terms: TermItem[];
}

/**
 * Picks only the content a company uses, so the page sends a small payload.
 * With `prefer` (the learner's own course ids), it narrows to their courses
 * when there's enough material, so a GCSE learner isn't handed A level terms.
 * Challenges never pass `prefer`, so both players get the identical deck.
 */
export function sourcesFor(
  company: Company,
  all: DeckSources,
  prefer: string[] = [],
): DeckSources {
  const mine = company.courseIds.filter((id) => prefer.includes(id));
  if (mine.length) {
    const narrowed = sourcesFor({ ...company, courseIds: mine }, all);
    if (narrowed.bank.length + narrowed.terms.length >= 8) return narrowed;
  }
  const ids = new Set(company.courseIds);
  const seen = new Set<string>();
  const keep = <T extends { key: string; courseId: string }>(x: T) => {
    if (!ids.has(x.courseId) || seen.has(x.key)) return false;
    seen.add(x.key);
    return true;
  };
  return { bank: all.bank.filter(keep), terms: all.terms.filter(keep) };
}

const readingTime = (text: string) =>
  Math.min(30, Math.max(15, 15 + Math.round(text.length / 25)));

function fromBank(rng: Rng, b: BankItem): GameQuestion {
  const order = shuffle(
    rng,
    b.options.map((_, i) => i),
  );
  return {
    key: `bank:${b.key}`,
    prompt: b.q,
    options: order.map((i) => b.options[i]),
    answer: order.indexOf(b.answer),
    explain: b.explain,
    topic: b.topicTitle,
    kind: "bank",
    timeLimit: readingTime(b.q + b.options.join(" ")),
  };
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function fromTerm(
  rng: Rng,
  t: TermItem,
  pool: TermItem[],
): GameQuestion | null {
  const others = shuffle(rng, [
    ...new Set(pool.filter((p) => p.front !== t.front).map((p) => p.front)),
  ]).slice(0, 3);
  if (others.length < 2) return null;
  const options = shuffle(rng, [t.front, ...others]);
  // Don't give the game away if the definition repeats the term.
  const clue = t.back.replace(new RegExp(escapeRegExp(t.front), "gi"), "____");
  return {
    key: `term:${t.key}`,
    prompt: `Which key term means: “${clue}”`,
    options,
    answer: options.indexOf(t.front),
    explain: `${t.front}: ${t.back}`,
    topic: t.topicTitle,
    kind: "term",
    timeLimit: readingTime(clue),
  };
}

/**
 * Builds a shift. Real revision questions come first in the mix; generators
 * fill the rest so a shift is never short and replays stay fresh. The same
 * seed and sources always give the same deck (that's how challenges work).
 */
export function buildDeck(
  company: Company,
  sources: DeckSources,
  seed: number,
  length = SHIFT_LENGTH,
): GameQuestion[] {
  const rng = createRng(seed);
  const authored: GameQuestion[] = [];
  for (const b of shuffle(rng, sources.bank)) authored.push(fromBank(rng, b));
  for (const t of shuffle(rng, sources.terms)) {
    const q = fromTerm(rng, t, sources.terms);
    if (q) authored.push(q);
  }
  // About half authored content (when there's enough), the rest generated.
  const authoredCount = Math.min(authored.length, Math.ceil(length / 2));
  const chosen = shuffle(rng, authored).slice(0, authoredCount);
  const generated: GameQuestion[] = [];
  const kinds = company.generators;
  for (
    let i = 0;
    generated.length < length - authoredCount && i < length * 4;
    i++
  ) {
    const kind = kinds.length
      ? kinds[i % kinds.length]
      : pick(rng, ["times", "percent"] as const);
    const g = generate(kind, rng);
    if (generated.some((x) => x.prompt === g.prompt)) continue;
    generated.push({
      key: `gen:${kind}:${i}`,
      prompt: g.prompt,
      options: g.options,
      answer: g.answer,
      explain: g.explain,
      topic: g.topic,
      kind: "gen",
      timeLimit: kind === "grammar" ? 12 : kind === "times" ? 10 : 20,
    });
  }
  // Ease in: a generated warm-up first, then mix.
  const mixed = shuffle(rng, [...chosen, ...generated.slice(1)]);
  return [generated[0], ...mixed].filter(Boolean).slice(0, length);
}
