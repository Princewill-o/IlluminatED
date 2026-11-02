/** Presentation only. Wallets, jobs and rewards still come from the server. */
export const PHONE_MEDIA =
  "(max-width: 767px), (pointer: coarse) and (max-width: 1023px)";

export function phoneLayout(
  matches: boolean,
  userAgent: string,
  touchPoints: number,
) {
  return (
    matches ||
    (touchPoints > 0 && /iPhone|iPod|Android.*Mobile/i.test(userAgent))
  );
}

export interface LifeEntry {
  id: string;
  text: string;
  at: number;
}

export const journalKey = (userId: string) =>
  `illuminated:life-journal:${userId}`;

export function readJournal(raw: string | null): LifeEntry[] {
  try {
    const value: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(value)) return [];
    return value
      .filter((entry): entry is LifeEntry =>
        Boolean(
          entry &&
          typeof entry === "object" &&
          typeof entry.id === "string" &&
          typeof entry.text === "string" &&
          entry.text.length <= 300 &&
          typeof entry.at === "number" &&
          Number.isFinite(entry.at) &&
          entry.at >= 0 &&
          entry.at <= 8.64e15,
        ),
      )
      .slice(0, 30);
  } catch {
    return [];
  }
}

export function appendJournal(
  entries: LifeEntry[],
  text: string,
  at: number,
): LifeEntry[] {
  return [
    { id: `${at}-${entries.length}`, text: text.slice(0, 300), at },
    ...entries,
  ].slice(0, 30);
}
