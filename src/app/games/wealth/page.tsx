import Link from "next/link";

import { CityHeading, WealthPanel } from "@/components/game/city/city-panels";
import { CARS } from "@/game/core/cars";
import { HOMES } from "@/game/core/homes";
import { requireAccount } from "@/lib/account/server";
import { loadHome } from "@/lib/game/careers-server";
import { loadCity } from "@/lib/game/city-server";
import { getSupabase } from "@/lib/social/server";
export const metadata = { title: "Assets & Wealth" };
export default async function WealthPage() {
  const account = await requireAccount("/games/wealth");
  const [state, home, sb] = await Promise.all([
    loadCity(),
    loadHome(account.id),
    getSupabase(),
  ]);
  const cars = sb
    ? ((await sb.from("player_cars").select("car").eq("user_id", account.id))
        .data ?? [])
    : [];
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <CityHeading
        eyebrow="Your city portfolio"
        title="Build a life. Learn about money."
      >
        Buy assets with the Clout you earn, explore a fictional investment
        portfolio and keep track of every purchase.
      </CityHeading>
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Link href="/games/home" className="bg-card rounded-3xl border p-6">
          <h2 className="text-xl font-black">Your property →</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            {home.owned
              .map((id) => HOMES.find((h) => h.id === id)?.name ?? id)
              .join(", ")}
            . Buy houses, change home and furnish your rooms.
          </p>
        </Link>
        <Link
          href="/games/world?phone=1"
          className="bg-card rounded-3xl border p-6"
        >
          <h2 className="text-xl font-black">Your garage →</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            {cars.length
              ? cars
                  .map((c) => CARS.find((a) => a.id === c.car)?.name ?? c.car)
                  .join(", ")
              : "No cars yet"}
            . Buy and drive cars through the city phone’s Garage.
          </p>
        </Link>
      </div>
      <WealthPanel state={state} />
    </main>
  );
}
