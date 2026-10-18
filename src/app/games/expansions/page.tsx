import {
  CityHeading,
  ExpansionPanel,
} from "@/components/game/city/city-panels";
import { requireAccount } from "@/lib/account/server";
import { loadCity } from "@/lib/game/city-server";
export const metadata = { title: "Expansion packs" };
export default async function ExpansionPage() {
  await requireAccount("/games/expansions");
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <CityHeading
        eyebrow="The adventure collection"
        title="New stories. Earned through learning."
      >
        Spend earned Clout to unlock cartoon characters and question-based
        adventures.
      </CityHeading>
      <ExpansionPanel state={await loadCity()} />
    </main>
  );
}
