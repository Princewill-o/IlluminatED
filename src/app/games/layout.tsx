import type { Metadata } from "next";

import { ArcadeFooter, ArcadeHeader } from "@/components/game/arcade-header";
import { GameMembership } from "@/components/game/city/membership";
import { getSupabase } from "@/lib/social/server";

export const metadata: Metadata = {
  robots:{index:false,follow:false},
  title: { absolute: "IlluminatED City", template: "%s | IlluminatED City" },
  description:
    "Build knowledge and explore careers in IlluminatED City. Study your subjects, practise simulated workplace tasks and earn learning awards.",
};

export const dynamic = "force-dynamic";

/** The Play tab. The app shell (or, for public challenge cards, the website chrome) wraps this. */
export default async function GamesLayout({ children }: { children: React.ReactNode }) {
  const sb = await getSupabase();
  const result = sb ? await sb.rpc("tiggy_status") : null;
  const status = Array.isArray(result?.data) ? result.data[0] : result?.data;
  const vip = !result?.error && status?.plan === "premium";
  return (
    <GameMembership vip={vip}><div className="arcade">
      <ArcadeHeader />
      {children}
      <ArcadeFooter />
    </div></GameMembership>
  );
}
