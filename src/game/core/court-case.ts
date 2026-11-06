/**
 * A Crown Court case file you actually argue: the facts differ every trial, so the right
 * questions, the right evidence and a good closing speech have to be worked out, not guessed.
 * Fictional and simplified, for a secondary-school audience.
 */
import { type Rng, createRng, pick, shuffle } from "./rng";

export type Question = { id: string; ask: string; answer: string; /** Does this answer help the defence? */ helps: number };
export type Exhibit = { id: string; name: string; detail: string; strength: number; why: string };
export interface CourtCase {
  time: string;
  place: string;
  /** What the witness says first. */
  statement: string;
  questions: Question[];
  /** The two witness lines that contradict each other (question ids), or null if none do. */
  contradiction: [string, string] | null;
  cctv: { time: string; quality: string; matches: boolean };
  locker: Exhibit[];
}

const PLACES = ["the Orchard Road shops", "Riverside Walk", "the bus station", "the high street cashpoint"];
const pad = (n: number) => String(n).padStart(2, "0");
const clock = (mins: number) => `${pad(Math.floor(mins / 60) % 24)}:${pad(mins % 60)}`;

export function courtCase(seed: number): CourtCase {
  const rng: Rng = createRng(seed);
  const at = 17 * 60 + Math.floor(rng() * 150); // between 5pm and 7:30pm
  const place = pick(rng, PLACES);
  const far = rng() < 0.6, dark = rng() < 0.6, quick = rng() < 0.6, glasses = rng() < 0.4;
  const jacket = pick(rng, ["a dark jacket", "a grey hoodie", "a red coat"]);
  const contradicts = rng() < 0.65;
  const later = contradicts ? pick(rng, ["a white t-shirt", "a yellow raincoat", "a green tracksuit"]) : jacket;
  const questions: Question[] = shuffle(rng, [
    { id: "distance", ask: "How far away were you?", answer: far ? "Across the road. Maybe thirty metres." : "Right next to them, a couple of metres.", helps: far ? 0.1 : -0.05 },
    { id: "light", ask: "What was the lighting like?", answer: dark ? "It was getting dark. The streetlights weren't on yet." : "Broad daylight.", helps: dark ? 0.1 : -0.04 },
    { id: "time", ask: "How long did you see them for?", answer: quick ? "Only a second or two." : "A good minute.", helps: quick ? 0.1 : -0.04 },
    { id: "glasses", ask: "Do you wear glasses, and were you wearing them?", answer: glasses ? "I do… I'd left them at home." : "I don't need glasses.", helps: glasses ? 0.12 : 0 },
    { id: "clothes", ask: "What were they wearing, exactly?", answer: `I'm sure it was ${later}.`, helps: 0 },
    { id: "lead", ask: "You're making this up, aren't you?", answer: "No! (The judge frowns at the question.)", helps: -0.08 },
  ]);
  const cctvTime = rng() < 0.5 ? clock(at) : clock(at + 27);
  const strongAt = at + Math.floor(rng() * 9) - 4;
  const locker: Exhibit[] = shuffle(rng, [
    { id: "ticket", name: "Bus ticket", detail: `Route 24, touched in at Canary Wharf at ${clock(strongAt)}.`, strength: 0.22, why: `It puts you miles away from ${place} at ${clock(strongAt)}, within minutes of the offence.` },
    { id: "receipt", name: "Shop receipt", detail: `Corner shop next to ${place}, ${clock(at - 3)}.`, strength: -0.18, why: `It puts you right next to ${place} three minutes before. That helps the prosecution!` },
    { id: "text", name: "Text from a friend", detail: `"See you later" sent at ${clock(at - 140)}.`, strength: 0.02, why: "It's hours before and doesn't say where you were. It barely helps." },
    { id: "photo", name: "Gym check-in", detail: `Checked in at Brixton leisure centre at ${clock(at + 95)}.`, strength: 0.03, why: "It's well after the offence, so it can't show where you were at the time." },
  ]);
  return {
    time: clock(at),
    place,
    statement: `I saw someone in ${jacket} near ${place} at about ${clock(at)}. I think it was the defendant.`,
    questions,
    contradiction: contradicts ? ["statement", "clothes"] : null,
    cctv: { time: cctvTime, quality: pick(rng, ["blurry, faces not visible", "grainy and from behind"]), matches: cctvTime === clock(at) },
    locker,
  };
}

/** Points for the parts of a closing speech that make a real argument, and what the judge noticed. */
export function scoreClosing(text: string, c: CourtCase, used: { exhibit?: string; askedFound: string[] }) {
  const t = text.toLowerCase();
  const words = t.split(/\s+/).filter(Boolean).length;
  const notes: string[] = [];
  let score = 0;
  const has = (...k: string[]) => k.some((w) => t.includes(w));
  if (has("reasonable doubt", "not sure", "be sure", "beyond doubt")) { score += 0.08; notes.push("You reminded the jury they must be sure."); }
  if (has("burden", "prove", "proof")) { score += 0.05; notes.push("You put the burden of proof on the prosecution."); }
  if (has("witness") && has("dark", "far", "distance", "second", "glasses", "metres", "light", "clothes", "jacket", "hoodie", "coat")) { score += 0.08; notes.push("You picked apart the witness's view."); }
  if (has("cctv", "camera", "footage") && has("blurry", "grainy", "face", "time", "timestamp", "behind")) { score += 0.07; notes.push("You challenged the CCTV."); }
  if (used.exhibit && has("bus", "ticket", "receipt", "gym", "text", c.locker.find((e) => e.id === used.exhibit)?.name.toLowerCase().split(" ")[0] ?? "~")) { score += 0.05; notes.push("You tied your evidence into the speech."); }
  if (has(":") && /\d\d:\d\d/.test(t)) { score += 0.03; notes.push("You used the times."); }
  if (words >= 25) score += 0.03; else if (words < 8) { score -= 0.05; notes.push("Very short: the jury needed more."); }
  if (has("i did it", "i admit", "it was me", "guilty")) { score -= 0.25; notes.push("That sounded like an admission."); }
  if (has("stupid", "idiot", "liar", "shut up") || (text.length > 12 && text === text.toUpperCase())) { score -= 0.1; notes.push("Shouting and insults don't persuade a jury."); }
  return { score: Math.max(-0.35, Math.min(0.3, score)), notes };
}
