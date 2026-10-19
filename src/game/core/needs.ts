/**
 * Life-sim needs, Sims style. They drift down in real time and go back up when
 * you do things: sleep at home, eat, study, ride the bus, see friends.
 * Pure functions so they can be tested; the browser keeps the numbers.
 */

export const NEEDS = [
  { id: "energy", label: "Energy", colour: "#2b5fd9", perHour: -6 },
  { id: "focus", label: "Focus", colour: "#7a5ce6", perHour: -10 },
  { id: "mood", label: "Mood", colour: "#15987f", perHour: -4 },
  { id: "hunger", label: "Hunger", colour: "#e98a1f", perHour: -8 },
  { id: "social", label: "Social", colour: "#d4536a", perHour: -5 },
  { id: "hygiene", label: "Hygiene", colour: "#329eb1", perHour: -7 },
] as const;

export type NeedId = (typeof NEEDS)[number]["id"];
export type Needs = Record<NeedId, number> & { at: number };

export const fresh = (now: number): Needs => ({ energy: 80, focus: 60, mood: 75, hunger: 70, social: 60, hygiene: 80, at: now });

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v * 10) / 10));

/** Needs after time passes (capped at 12 hours so a weekend away doesn't zero everything). */
export function decay(n: Needs, now: number): Needs {
  const hours = Math.min(12, Math.max(0, (now - n.at) / 3_600_000));
  const out = { ...n, at: now };
  for (const d of NEEDS) out[d.id] = clamp((Number.isFinite(n[d.id]) ? n[d.id] : 80) + d.perHour * hours);
  return out;
}

/** What each activity does to your needs. */
export const ACTIVITIES = {
  shower: { label: "Freshened up", change: { hygiene: +55, mood: +8 } },
  bathroom: { label: "Bathroom break", change: { hygiene: +10, mood: +5 } },
  watch: { label: "Watched TV", change: { mood: +18, energy: +5 } },
  relax: { label: "Relaxed at home", change: { energy: +12, mood: +12 } },
  music: { label: "Played music", change: { mood: +20, focus: +5 } },
  sleep: { label: "Had a nap", change: { energy: +45, mood: +5 } },
  hike: { label: "Took in the view", change: { mood: +15, energy: -8, focus: +5 } },
  eat: { label: "Ate something", change: { hunger: +40, mood: +5 } },
  study: { label: "Studied", change: { focus: +20, energy: -5 } },
  bus: { label: "Revised on the bus", change: { focus: +15 } },
  shift: { label: "Worked a shift", change: { energy: -15, mood: +8, hunger: -10 } },
  homework: { label: "Handed in homework", change: { focus: -10, mood: +12 } },
  arcade: { label: "Played the arcade", change: { mood: +10, energy: -3 } },
  wave: { label: "Said hi", change: { social: +6, mood: +2 } },
  drink: { label: "Energy drink", change: { energy: +35 } },
  meal: { label: "Meal deal", change: { hunger: +45, energy: +10 } },
  coffee: { label: "Flat white", change: { energy: +15, focus: +10 } },
  medicine: { label: "Took medicine", change: { energy: +30, mood: +5 } },
  hospital: { label: "Seen by a doctor", change: { energy: +60, mood: +15, hunger: +20 } },
} as const satisfies Record<string, { label: string; change: Partial<Record<NeedId, number>> }>;

export type Activity = keyof typeof ACTIVITIES;

export function apply(n: Needs, a: Activity, now: number): Needs {
  const out = decay(n, now);
  const change = ACTIVITIES[a].change as Partial<Record<NeedId, number>>;
  for (const [k, v] of Object.entries(change)) out[k as NeedId] = clamp(out[k as NeedId] + (v ?? 0));
  return out;
}

/** One word for the portrait. */
export function moodWord(n: Needs) {
  const low = NEEDS.filter((d) => n[d.id] < 25);
  if (low.some((d) => d.id === "energy")) return "Sleepy";
  if (low.some((d) => d.id === "hunger")) return "Hungry";
  if (low.some((d) => d.id === "focus")) return "Distracted";
  if (low.some((d) => d.id === "social")) return "Lonely";
  const avg = NEEDS.reduce((a, d) => a + n[d.id], 0) / NEEDS.length;
  return avg > 70 ? "Happy" : avg > 45 ? "Fine" : "Fed up";
}

/** A gentle hint for whichever need is lowest. */
export function nextHint(n: Needs) {
  const low = [...NEEDS].sort((a, b) => n[a.id] - n[b.id])[0];
  if (n[low.id] > 50) return null;
  return {
    energy: "Low on energy: head home and have a nap.",
    focus: "Focus is low: revise on the bus or at your desk.",
    mood: "Mood's dipping: play a quick arcade game.",
    hunger: "Hungry: grab something from the fridge or Pizzazz Pizza.",
    social: "Feeling lonely: say hi to someone nearby.",
    hygiene: "Freshen up: take a shower at home.",
  }[low.id];
}

/** London weather that changes through the day but is the same for everyone. */
export function weatherAt(d: Date) {
  const day = Math.floor(d.getTime() / 86_400_000);
  const kinds = ["Sunny", "Cloudy", "Light rain", "Fog", "Windy", "Drizzle", "Bright", "Snow"] as const;
  const slot = Math.floor(d.getTime() / 180_000);
  const kind = kinds[((slot * 5 + Math.floor(slot / 8)) % kinds.length + kinds.length) % kinds.length];
  const month = d.getMonth();
  const base = [6, 7, 9, 12, 15, 18, 20, 20, 17, 13, 9, 7][month];
  const hour = d.getHours();
  const temp = Math.round(base + (hour > 11 && hour < 18 ? 3 : hour < 7 ? -3 : 0) + ((day % 5) - 2));
  return { kind, temp: kind === "Snow" ? Math.min(1, temp) : temp };
}

/** A shared game forecast: three real minutes per weather period. */
export function weatherForecast(d: Date) {
  return Array.from({ length: 4 }, (_, index) => {
    const at = new Date((Math.floor(d.getTime() / 180_000) + index) * 180_000);
    return { ...weatherAt(at), at: at.getTime(), label: index ? `In ${index * 3} min` : "Now" };
  });
}
