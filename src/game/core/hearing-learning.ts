import type { StreetCourtCase } from "./civilian-conflict";

export interface HearingQuestion {
  title: string;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
}
/** Reading, numeracy and evidence skills within a fictional hearing, not legal advice. */
export function hearingQuestions(file: StreetCourtCase): HearingQuestion[] {
  const e = file.evidence,
    first = e.firstAttacker === "player" ? "You" : file.npcName;
  return [
    {
      title: "Opening statement",
      prompt: "Which statement agrees with the recorded first landed hit?",
      options: [
        `${first} landed the first hit.`,
        "Nobody can tell who hit first.",
        "The loudest person must have hit first.",
      ],
      answer: 0,
      explanation:
        "Compare each claim with the recorded sequence. Confidence and volume are not evidence.",
    },
    {
      title: "Witness testimony",
      prompt: `${e.witnesses ? "A witness says" : "In a practice example, a witness says"} “${e.firstAttacker === "player" ? file.npcName : "the player"} definitely hit first”, but the incident record names ${first}. What should you do?`,
      options: [
        "Accept the confident statement without checking.",
        "Point out the contradiction and compare independent evidence.",
        "Insult the witness.",
      ],
      answer: 1,
      explanation:
        "Witnesses can misremember. Check timing, viewpoint and corroborating evidence rather than assuming every confident claim is true.",
    },
    {
      title: "Check the figures",
      prompt: `The record shows ${e.damageToPlayer} damage to you and ${e.damageToCivilian} to the civilian. What is the combined total?`,
      options: [
        String(e.damageToPlayer + e.damageToCivilian),
        String(e.damageToPlayer + e.damageToCivilian + 12),
        String(Math.max(0, e.damageToPlayer - e.damageToCivilian)),
      ],
      answer: 0,
      explanation:
        "Add the two recorded amounts. Keep damage to each person separate when describing what happened.",
    },
    {
      title: "A reliable account",
      prompt:
        "You cannot remember an exact detail. What is the most reliable response?",
      options: [
        "Invent a detail that helps your case.",
        "Copy another person's story.",
        "Say what you know and clearly identify what you are unsure about.",
      ],
      answer: 2,
      explanation:
        "Honesty includes explaining uncertainty. A gap in memory is different from proof that something did not happen.",
    },
    {
      title: "De-escalation",
      prompt: "Which choice could prevent another incident?",
      options: [
        "Follow the other person and argue again.",
        "Give space, seek help and explain calmly.",
        "Ask friends to shove the person.",
      ],
      answer: 1,
      explanation:
        "Walking away, making space and asking for help reduce escalation. A disagreement does not require a physical response.",
    },
  ];
}

export function witnessStatements(file: StreetCourtCase) {
  const names = [
    "Alex Morgan",
    "Sam Patel",
    "Jordan Lewis",
    "Taylor Brown",
    "Casey Wilson",
  ];
  return Array.from(
    { length: Math.min(5, Math.max(0, file.evidence.witnesses)) },
    (_, index) => {
      const agrees = index !== 0 || file.evidence.witnesses === 1;
      const first = agrees
        ? file.evidence.firstAttacker
        : file.evidence.firstAttacker === "player"
          ? "civilian"
          : "player";
      return {
        name: names[(Math.abs(file.seed) + index) % names.length],
        claim:
          (first === "player" ? "The player" : file.npcName) +
          " landed the first hit.",
        agrees,
      };
    },
  );
}
