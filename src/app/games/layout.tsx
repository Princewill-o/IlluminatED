import type { Metadata } from "next";

import { ArcadeFooter, ArcadeHeader } from "@/components/game/arcade-header";

export const metadata: Metadata = {
  title: { absolute: "IlluminatED City", template: "%s | IlluminatED City" },
  description:
    "Revise by playing. Climb from intern to CEO at Goggle, Barklays, Tescow and more in Promotion Panic.",
};

export const dynamic = "force-dynamic";

/** The Play tab. The app shell (or, for public challenge cards, the website chrome) wraps this. */
export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="arcade">
      <ArcadeHeader />
      {children}
      <ArcadeFooter />
    </div>
  );
}
