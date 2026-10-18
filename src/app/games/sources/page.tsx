import Link from "next/link";

import { CityHeading } from "@/components/game/city/city-panels";
import { SourceStore } from "@/components/game/city/source-store";
import { requireAccount } from "@/lib/account/server";
import { COURSES } from "@/lib/data/courses";
export const metadata = { title: "Learning source store" };
export default async function SourcesPage() {
  await requireAccount("/games/sources");
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <CityHeading
        eyebrow="Learning source store"
        title="Know where your learning comes from."
      >
        Find lessons by year, review source dates and open official past papers
        and mark schemes. Automated checks track availability; they do not
        replace curriculum review.
      </CityHeading>
      <div className="mb-6 flex flex-wrap gap-4 text-sm font-bold">
        <Link className="underline" href="/games/careers/sources">
          Work experience references & question practice →
        </Link>
        <Link className="underline" href="/games/study">
          Scored study sessions →
        </Link>
      </div>
      <SourceStore
        courses={COURSES.map((c) => ({ id: c.id, title: c.title }))}
      />
    </main>
  );
}
