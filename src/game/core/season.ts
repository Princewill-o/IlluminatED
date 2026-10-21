/**
 * The Season Pass. Season XP comes only from learning and playing well:
 * correct answers, finished homework, quests and event games. Every tier has a
 * free reward; Plus members also get the premium track. Nothing is random and
 * nothing is bought with real money directly: the premium track comes with the
 * Plus subscription, and it never gates core revision.
 */
export const SEASON = {
  id: "s1",
  name: "Season 1: Hero Academy",
  tiers: 30,
  xpPerTier: 120,
  endsAt: Date.UTC(2026, 11, 21),
} as const;

export type Reward =
  | { kind: "item"; id: string; label: string }
  | { kind: "title"; label: string }
  | { kind: "emote"; label: string }
  | { kind: "frame"; label: string; colour: string }
  | { kind: "boost"; label: string; minutes: number };

const hero = (id: string, label: string): Reward => ({ kind: "item", id, label });

/** [free, premium] for each tier, 1..30. */
export const TRACK: [Reward, Reward][] = [
  [{ kind: "title", label: "Recruit" }, hero("top-hero-photon", "Photon suit")],
  [{ kind: "emote", label: "Wave hello" }, { kind: "frame", label: "Gold frame", colour: "#ffd23f" }],
  [{ kind: "boost", label: "30-min double XP", minutes: 30 }, hero("top-hero-byte", "Byte suit")],
  [{ kind: "frame", label: "Sky frame", colour: "#7cc4ff" }, { kind: "emote", label: "Power pose" }],
  [hero("top-hero-helix", "Helix suit"), { kind: "title", label: "Sidekick" }],
  [{ kind: "emote", label: "Celebrate" }, { kind: "boost", label: "1-hour double XP", minutes: 60 }],
  [{ kind: "title", label: "Quiz Cadet" }, hero("top-hero-catalyst", "Catalyst suit")],
  [{ kind: "boost", label: "30-min double XP", minutes: 30 }, { kind: "frame", label: "Lightning frame", colour: "#55f0d0" }],
  [{ kind: "frame", label: "Leaf frame", colour: "#2e9d55" }, { kind: "emote", label: "Hero landing" }],
  [hero("top-hero-quill", "Quill suit"), { kind: "title", label: "Fog Fighter" }],
  [{ kind: "emote", label: "Thumbs up" }, { kind: "boost", label: "1-hour double XP", minutes: 60 }],
  [{ kind: "title", label: "Streak Keeper" }, { kind: "frame", label: "Ember frame", colour: "#f07d1a" }],
  [{ kind: "boost", label: "30-min double XP", minutes: 30 }, { kind: "title", label: "Night Watch" }],
  [{ kind: "frame", label: "Violet frame", colour: "#6a4bd6" }, { kind: "emote", label: "Victory spin" }],
  [{ kind: "title", label: "League Member" }, hero("top-hero-quotient", "Captain Quotient suit")],
  [{ kind: "emote", label: "Bow" }, { kind: "frame", label: "Starfield frame", colour: "#14123a" }],
  [{ kind: "boost", label: "1-hour double XP", minutes: 60 }, { kind: "title", label: "Shield Bearer" }],
  [{ kind: "frame", label: "Ruby frame", colour: "#c4433a" }, { kind: "boost", label: "2-hour double XP", minutes: 120 }],
  [{ kind: "title", label: "Problem Solver" }, { kind: "emote", label: "Mic drop" }],
  [{ kind: "emote", label: "Dance" }, { kind: "title", label: "Lumen Captain" }],
  [{ kind: "boost", label: "1-hour double XP", minutes: 60 }, { kind: "frame", label: "Prism frame", colour: "#ff6fa9" }],
  [{ kind: "title", label: "Scholar" }, { kind: "emote", label: "Air guitar" }],
  [{ kind: "frame", label: "Silver frame", colour: "#c9cbd6" }, { kind: "title", label: "Mastermind" }],
  [{ kind: "emote", label: "Salute" }, { kind: "boost", label: "2-hour double XP", minutes: 120 }],
  [{ kind: "title", label: "Fog Breaker" }, { kind: "frame", label: "Aurora frame", colour: "#9be8c4" }],
  [{ kind: "boost", label: "1-hour double XP", minutes: 60 }, { kind: "emote", label: "Cape swish" }],
  [{ kind: "frame", label: "Comet frame", colour: "#ffd98a" }, { kind: "title", label: "Legend in Training" }],
  [{ kind: "title", label: "Veteran" }, { kind: "frame", label: "Diamond frame", colour: "#b3e5ff" }],
  [{ kind: "emote", label: "Hero pose" }, { kind: "title", label: "Lumen Legend" }],
  [{ kind: "title", label: "Season 1 Hero" }, { kind: "frame", label: "Hero Academy frame", colour: "#5b56c8" }],
];

/** How players earn Season XP. Learning pays most. */
export const XP_FOR = {
  correct: 10,
  quizDone: 25,
  homework: 60,
  dailyQuest: 30,
  eventWin: 80,
  eventPlay: 20,
  activity: 5,
} as const;
export type XpReason = keyof typeof XP_FOR;

export interface PassState {
  season: string;
  xp: number;
  /** Claimed tiers on each track. */
  free: number[];
  premium: number[];
  /** Double XP until this time (ms). */
  boostUntil: number;
  /** Items unlocked from the pass, wearable in the Locker. */
  items: string[];
  titles: string[];
  title: string | null;
}

export const freshPass = (): PassState => ({ season: SEASON.id, xp: 0, free: [], premium: [], boostUntil: 0, items: [], titles: [], title: null });

export const tierFor = (xp: number) => Math.min(SEASON.tiers, Math.floor(xp / SEASON.xpPerTier));
export const tierProgress = (xp: number) => (tierFor(xp) >= SEASON.tiers ? 1 : (xp % SEASON.xpPerTier) / SEASON.xpPerTier);

/** XP for one action, with the live event's boost and any double-XP reward applied. */
export function xpGain(reason: XpReason, eventBoost: number, s: PassState, now: number) {
  return Math.round(XP_FOR[reason] * eventBoost * (s.boostUntil > now ? 2 : 1));
}

export function canClaim(s: PassState, tier: number, track: "free" | "premium", premium: boolean) {
  if (tier < 1 || tier > SEASON.tiers || tierFor(s.xp) < tier) return false;
  if (track === "premium" && !premium) return false;
  return !s[track].includes(tier);
}

export function claim(s: PassState, tier: number, track: "free" | "premium", premium: boolean, now: number): PassState {
  if (!canClaim(s, tier, track, premium)) return s;
  const reward = TRACK[tier - 1][track === "free" ? 0 : 1];
  const next: PassState = { ...s, [track]: [...s[track], tier] };
  if (reward.kind === "item") next.items = [...new Set([...s.items, reward.id])];
  if (reward.kind === "title") next.titles = [...new Set([...s.titles, reward.label])];
  if (reward.kind === "boost") next.boostUntil = Math.max(now, s.boostUntil) + reward.minutes * 60_000;
  return next;
}

/** Storage is per account so siblings sharing a laptop keep their own pass. */
export const passKey = (userId: string) => `illuminated:pass:${SEASON.id}:${userId}`;

export function readPass(storage: Pick<Storage, "getItem"> | null, userId: string): PassState {
  try {
    const raw = storage?.getItem(passKey(userId));
    const p = raw ? (JSON.parse(raw) as Partial<PassState>) : null;
    if (!p || p.season !== SEASON.id) return freshPass();
    return { ...freshPass(), ...p, xp: Math.max(0, Number(p.xp) || 0) };
  } catch {
    return freshPass();
  }
}

export function writePass(storage: Pick<Storage, "setItem"> | null, userId: string, s: PassState) {
  try {
    storage?.setItem(passKey(userId), JSON.stringify(s));
  } catch {
    /* storage may be unavailable (private mode); the pass still works this session */
  }
}
