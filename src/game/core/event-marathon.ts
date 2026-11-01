export const MARATHON_PRIZES = [50, 25, 10] as const;
export const MARATHON_RULES = "2026-11-v1";

/** Thirty days ending at midnight London time on the first of next month. */
export function marathonDates(now = new Date()) {
  const london = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit" }).formatToParts(now);
  const year = Number(london.find(p => p.type === "year")!.value);
  const month = Number(london.find(p => p.type === "month")!.value);
  let end = Math.max(Date.UTC(year, month, 1), Date.UTC(2026, 11, 1));
  const zone = new Intl.DateTimeFormat("en", { timeZone: "Europe/London", timeZoneName: "shortOffset" }).formatToParts(end).find(p => p.type === "timeZoneName")?.value;
  if (zone === "GMT+1") end -= 3_600_000;
  return { start: end - 30 * 86400_000, end };
}

export const marathonClosing = (end: number) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", dateStyle: "long", timeStyle: "short" }).format(end - 1);
