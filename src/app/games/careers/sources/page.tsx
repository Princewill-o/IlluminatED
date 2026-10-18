import Link from "next/link";

import { CityHeading } from "@/components/game/city/city-panels";
import { WorkReference } from "@/components/game/city/work-reference";
import { requireAccount } from "@/lib/account/server";
export const metadata = { title: "Work experience references" };
export default async function WorkSourcesPage() {
  await requireAccount("/games/careers/sources");
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <CityHeading
        eyebrow="Simulated work · reference library"
        title="Practise, then understand why."
      >
        Explore original workplace questions, answers and explanations alongside
        official reference material. These are educational simulations, not an
        employment placement, professional qualification or clinical advice.
      </CityHeading>
      <Link
        href="/games/careers"
        className="text-primary mb-6 inline-block min-h-11 text-sm font-bold underline"
      >
        Back to careers →
      </Link>
      <WorkReference />
    </main>
  );
}
