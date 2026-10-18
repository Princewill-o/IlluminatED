import {
  CityHeading,
  IllumshipPanel,
} from "@/components/game/city/city-panels";
import { requireAccount } from "@/lib/account/server";
import { loadCity } from "@/lib/game/city-server";
export const metadata = { title: "Illumship" };
export default async function IllumshipPage() {
  await requireAccount("/games/illumship");
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <CityHeading
        eyebrow="Illumship · Premium membership"
        title="A little more personality."
      >
        Enjoy an ad-free city, collect exotic companions and try unlimited
        companion style previews.
      </CityHeading>
      <IllumshipPanel state={await loadCity()} />
    </main>
  );
}
