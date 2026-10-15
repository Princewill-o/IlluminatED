/**
 * Promotion Panic: one "shift" is up to 12 tasks. Answer fast to build a
 * streak, climb the career ladder, and don't collect three strikes.
 * Pure functions only, so web, mobile and desktop all score identically.
 */
export interface GameQuestion {
  key: string;
  prompt: string;
  options: string[];
  answer: number;
  explain: string;
  topic: string;
  kind: "bank" | "term" | "gen";
  /** Seconds allowed. */
  timeLimit: number;
}

export const SHIFT_LENGTH = 12;
export const MAX_STRIKES = 3;

export const RANKS = [
  { title: "Intern", min: 0, perk: "A lanyard. It's slightly sticky." },
  {
    title: "Junior Assistant",
    min: 200,
    perk: "You may now use the good stapler.",
  },
  {
    title: "Assistant Manager",
    min: 600,
    perk: "A chair that spins. Use responsibly.",
  },
  {
    title: "Manager",
    min: 1200,
    perk: "Your own mug. Nobody else may touch it.",
  },
  {
    title: "Director",
    min: 2000,
    perk: "A desk plant that is actually alive.",
  },
  {
    title: "Vice President",
    min: 2900,
    perk: "Access to the secret biscuit drawer.",
  },
  {
    title: "CEO",
    min: 3900,
    perk: "The corner office. And the corner of every other office.",
  },
  {
    title: "Galactic Overlord",
    min: 5200,
    perk: "You now own the moon. Please water it.",
  },
] as const;

export const CEO_RANK = 6;

export const rankFor = (score: number) => {
  let r = 0;
  RANKS.forEach((rank, i) => {
    if (score >= rank.min) r = i;
  });
  return r;
};

/** Streak counts the current answer: 1–2 ×1, 3–5 ×2, 6–8 ×3, 9+ ×4. */
export const multiplierFor = (streak: number) =>
  streak >= 9 ? 4 : streak >= 6 ? 3 : streak >= 3 ? 2 : 1;

/** 100 for being right, up to 100 more for speed, times the streak multiplier. */
export const pointsFor = (timeLeftFraction: number, streak: number) => {
  const t = Math.min(1, Math.max(0, timeLeftFraction));
  return Math.round((100 + 100 * t) * multiplierFor(streak));
};

/** Highest score a run with this many correct answers could possibly reach. */
export const maxScoreFor = (correct: number) => correct * 800;

export type PowerUp = "coffee" | "blame" | "tiggy";

export const POWER_UPS: Record<
  PowerUp,
  { name: string; help: string }
> = {
  coffee: {
    name: "Coffee Break",
    help: "+10 seconds on the clock",
  },
  blame: {
    name: "Blame the Intern",
    help: "Skip this task. No strike, streak kept",
  },
  tiggy: { name: "Ask Tiggy", help: "Removes two wrong answers" },
};

export interface AnswerResult {
  correct: boolean;
  timedOut: boolean;
  skipped: boolean;
  chosen: number | null;
  points: number;
  promotedTo: number | null;
}

export interface ShiftState {
  questions: GameQuestion[];
  index: number;
  score: number;
  streak: number;
  bestStreak: number;
  strikes: number;
  correct: number;
  answered: number;
  rank: number;
  powerUps: Record<PowerUp, boolean>;
  /** Options hidden by Ask Tiggy on the current question. */
  hidden: number[];
  bonusSeconds: number;
  phase: "question" | "feedback" | "over";
  last: AnswerResult | null;
  fired: boolean;
}

export function startShift(questions: GameQuestion[]): ShiftState {
  return {
    questions: questions.slice(0, SHIFT_LENGTH),
    index: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    strikes: 0,
    correct: 0,
    answered: 0,
    rank: 0,
    powerUps: { coffee: true, blame: true, tiggy: true },
    hidden: [],
    bonusSeconds: 0,
    phase: "question",
    last: null,
    fired: false,
  };
}

export const currentQuestion = (s: ShiftState) => s.questions[s.index];

export const timeLimitFor = (s: ShiftState) =>
  (currentQuestion(s)?.timeLimit ?? 20) + s.bonusSeconds;

/** Record an answer (or a timeout when choice is null). */
export function answer(
  s: ShiftState,
  choice: number | null,
  timeLeftFraction: number,
): ShiftState {
  if (s.phase !== "question") return s;
  const q = currentQuestion(s);
  const correct = choice !== null && choice === q.answer;
  const streak = correct ? s.streak + 1 : 0;
  const points = correct ? pointsFor(timeLeftFraction, streak) : 0;
  const score = s.score + points;
  const rank = rankFor(score);
  const strikes = correct ? s.strikes : s.strikes + 1;
  return {
    ...s,
    score,
    streak,
    bestStreak: Math.max(s.bestStreak, streak),
    strikes,
    correct: s.correct + (correct ? 1 : 0),
    answered: s.answered + 1,
    rank,
    phase: "feedback",
    fired: strikes >= MAX_STRIKES,
    last: {
      correct,
      timedOut: choice === null,
      skipped: false,
      chosen: choice,
      points,
      promotedTo: rank > s.rank ? rank : null,
    },
  };
}

export function applyPowerUp(s: ShiftState, p: PowerUp, seed = 0): ShiftState {
  if (s.phase !== "question" || !s.powerUps[p]) return s;
  const powerUps = { ...s.powerUps, [p]: false };
  if (p === "coffee")
    return { ...s, powerUps, bonusSeconds: s.bonusSeconds + 10 };
  if (p === "blame") {
    return {
      ...s,
      powerUps,
      phase: "feedback",
      last: {
        correct: false,
        timedOut: false,
        skipped: true,
        chosen: null,
        points: 0,
        promotedTo: null,
      },
    };
  }
  const q = currentQuestion(s);
  const wrong = q.options.map((_, i) => i).filter((i) => i !== q.answer);
  // Keep one wrong answer, chosen by the seed so a replay hides the same ones.
  const keep = wrong[Math.abs(seed + s.index) % wrong.length];
  return {
    ...s,
    powerUps,
    hidden: wrong.filter((i) => i !== keep).slice(0, 2),
  };
}

/** Move on from feedback to the next question, or end the shift. */
export function next(s: ShiftState): ShiftState {
  if (s.phase !== "feedback") return s;
  const index = s.index + 1;
  if (s.fired || index >= s.questions.length) {
    return { ...s, phase: "over" };
  }
  return { ...s, index, phase: "question", hidden: [], bonusSeconds: 0 };
}

export const accuracy = (s: ShiftState) =>
  s.answered ? Math.round((s.correct / s.answered) * 100) : 0;
