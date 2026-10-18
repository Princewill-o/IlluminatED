import Link from "next/link";

import {
  CityHeading,
  WeeklyPanel,
  type WeekProgress,
} from "@/components/game/city/city-panels";
import { requireAccount } from "@/lib/account/server";
import { getSupabase } from "@/lib/social/server";
export const metadata = { title: "Weekly challenges" };
const THEMES = [
  {
    title: "Digital society",
    text: "How do we judge claims online and protect personal information?",
    url: "https://www.ncsc.gov.uk/collection/top-tips-for-staying-secure-online",
    source: "National Cyber Security Centre",
  },
  {
    title: "Money in everyday life",
    text: "Explore budgets, choices and the difference between a promise and evidence.",
    url: "https://www.moneyhelper.org.uk/en/everyday-money/budgeting",
    source: "MoneyHelper",
  },
  {
    title: "A changing environment",
    text: "Connect science practice to questions about our environment.",
    url: "https://www.metoffice.gov.uk/weather/climate-change/what-is-climate-change",
    source: "Met Office",
  },
  {
    title: "Work and tomorrow’s skills",
    text: "Think about how your subjects connect with work and career choices.",
    url: "https://nationalcareers.service.gov.uk/explore-careers",
    source: "National Careers Service",
  },
];
export default async function WeeklyPage() {
  await requireAccount("/games/weekly");
  const sb = await getSupabase();
  const { data, error } = sb
    ? await sb.rpc("city_week_progress")
    : { data: null, error: true };
  const progress = error ? null : (data as WeekProgress);
  const weekIndex = progress
    ? Math.floor(Date.parse(`${progress.week}T00:00:00Z`) / 604800000)
    : 0;
  const theme =
    THEMES[((weekIndex % THEMES.length) + THEMES.length) % THEMES.length];
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <CityHeading eyebrow="This week in your city" title={theme.title}>
        {theme.text} Themes rotate weekly around society and skills; they are
        learning prompts, not a live news feed.
      </CityHeading>
      <div className="mb-6 flex flex-wrap gap-4 text-sm font-bold">
        <a
          className="underline"
          href={theme.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Explore the theme with {theme.source} ↗
        </a>
        <Link href="/games/expansions" className="underline">
          Explore themed question packs →
        </Link>
      </div>
      <WeeklyPanel progress={progress} />
    </main>
  );
}
