import type { Metadata } from "next";

import { Locker } from "@/components/game/locker";
import { requireAccount } from "@/lib/account/server";
import { loadPlayer } from "@/lib/game/server";

export const metadata: Metadata = { title: "Your Locker" };

export default async function LockerPage() {
  const account = await requireAccount("/games/locker");
  const player = await loadPlayer(account.id);
  return (
    <div id="locker" className="mx-auto max-w-6xl px-4 pt-6 pb-10">
      <p className="text-xs font-black tracking-[0.3em] text-[#a67fff] uppercase">
        The Locker
      </p>
      <h1 className="arcade-display mt-2 text-4xl md:text-5xl">
        Dress for the job you want
      </h1>
      <p className="mt-2 max-w-2xl text-[#b3abc4]">
        Spend Clout on new looks, or unlock the rare stuff by becoming CEO,
        levelling up and keeping your streak alive.
      </p>
      <div className="mt-8">
        <Locker
          initialAvatar={player.avatar}
          initialOwned={player.owned}
          initialClout={player.clout}
          canSave={player.ready}
        />
      </div>
    </div>
  );
}
