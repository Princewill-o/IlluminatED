import type { Metadata } from "next";

import { Locker } from "@/components/game/locker";
import { COSMETICS, DEFAULT_AVATAR, isFree } from "@/game/core/cosmetics";
import { requireAccount } from "@/lib/account/server";
import { loadPlayer } from "@/lib/game/server";

export const metadata: Metadata = { title: "Your Locker" };

export default async function LockerPage() {
  if (process.env.NODE_ENV === "development" && process.env.ILLUMINATED_PREVIEW === "1") {
    return (
      <div id="locker" className="mx-auto max-w-6xl px-4 pt-6 pb-10">
        <p className="text-xs font-black tracking-[0.3em] text-ink-lilac uppercase">Local preview</p>
        <h1 className="arcade-display mt-2 text-4xl md:text-5xl">Create your Blocky character</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">Choose from 100 new Blender presets and the original 16 Blocky characters. Try 120 outfit sets, capes and equipment, then apply your look to the local game.</p>
        <div className="mt-8">
          <Locker initialAvatar={DEFAULT_AVATAR} initialOwned={COSMETICS.filter(isFree).map((item) => item.id)} initialClout={0} canSave={false} localPreview />
        </div>
      </div>
    );
  }
  const account = await requireAccount("/games/locker");
  const player = await loadPlayer(account.id);
  return (
    <div id="locker" className="mx-auto max-w-6xl px-4 pt-6 pb-10">
      <p className="text-xs font-black tracking-[0.3em] text-ink-lilac uppercase">
        The Locker
      </p>
      <h1 className="arcade-display mt-2 text-4xl md:text-5xl">
        Dress for the job you want
      </h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Spend Clout on new looks, or unlock the rare stuff by becoming CEO,
        levelling up and keeping your streak alive.
      </p>
      <div className="mt-8">
        <Locker
          initialAvatar={player.avatar}
          initialOwned={player.owned}
          initialClout={player.clout}
          canSave={player.ready}
          userId={account.id}
        />
      </div>
    </div>
  );
}
