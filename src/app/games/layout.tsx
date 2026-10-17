import type { Metadata } from "next";

import { ArcadeFooter, ArcadeHeader } from "@/components/game/arcade-header";

export const metadata: Metadata = {
  robots:{index:false,follow:false},
  title: { absolute: "IlluminatED City", template: "%s | IlluminatED City" },
  description:
    "Build knowledge and explore careers in IlluminatED City. Study your subjects, practise simulated workplace tasks and earn learning awards.",
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
