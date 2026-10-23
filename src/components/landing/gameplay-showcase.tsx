"use client";

import { BookOpen, Bus, Map as MapIcon, Shirt, Wallet } from "lucide-react";

import GlassFolder from "@/components/ui/glass-folder-cards";
import { IconFolder, type FolderIcon } from "@/components/ui/icon-folder";

/** A white lucide icon on an app-style gradient tile. */
const app = (label: string, background: string, Icon: typeof MapIcon): FolderIcon => ({
  label,
  background,
  node: <Icon className="size-[46%] text-white" strokeWidth={2.2} aria-hidden />,
});

const PHONE_APPS: FolderIcon[] = [
  app("Maps", "linear-gradient(135deg,#6ee26b,#2fb3ff)", MapIcon),
  app("Bus", "linear-gradient(135deg,#ff4f4f,#c8102e)", Bus),
  app("Study", "linear-gradient(135deg,#ffb340,#ff7a00)", BookOpen),
  app("Locker", "linear-gradient(135deg,#ff8ad1,#d6339b)", Shirt),
  app("Wallet", "linear-gradient(135deg,#3a3a3c,#000000)", Wallet),
];

/**
 * The gameplay film, then the platform as folders you can open: subjects hold
 * real study tools, and the in-game phone fans out its apps.
 */
export function GameplayShowcase({ accent, soft, display, card }: { accent: string; soft: string; display: string; card: string }) {
  return (
    <>
      {/* Gameplay film: 30 players studying, chatting, calling and working in London. */}
      <section className="relative container py-20" aria-labelledby="gameplay-title">
        <div className="mx-auto max-w-2xl text-center">
          <p className={`text-sm font-bold ${accent}`}>Gameplay</p>
          <h2 id="gameplay-title" className={`${display} mt-3 text-4xl sm:text-5xl`}>One London. Real players. Real revision.</h2>
          <p className={`mt-4 ${soft}`}>Study groups, friends&apos; calls, bus rides and shifts at work, all in the same world.</p>
        </div>
        <div className="mx-auto mt-10 max-w-5xl overflow-hidden rounded-3xl border-4 border-[#1d1a4a] bg-[#13203a] shadow-[10px_10px_0_#1d1a4a] dark:border-white/85 dark:shadow-[10px_10px_0_rgba(179,175,255,0.45)]">
          <video
            className="pointer-events-none block aspect-video w-full select-none"
            src="/landing/gameplay-crowd.mp4"
            poster="/landing/gameplay-crowd-poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            disablePictureInPicture
            disableRemotePlayback
            tabIndex={-1}
            aria-label="Gameplay film: players chatting on a London street, riding a bus, studying together, on a video call and working a shift"
          />
        </div>
      </section>

      {/* Folders: hover to lean the glass, click to open. */}
      <section className="relative container pb-24" aria-labelledby="folders-title">
        <div className="mx-auto max-w-2xl text-center">
          <p className={`text-sm font-bold ${accent}`}>Everything in one place</p>
          <h2 id="folders-title" className={`${display} mt-3 text-4xl sm:text-5xl`}>Open a folder. Start learning.</h2>
          <p className={`mt-4 ${soft}`}>Every subject keeps its quizzes, flashcards and resources together. Tap a folder to open it.</p>
        </div>
        <div className="mx-auto mt-12 grid max-w-[1180px] grid-cols-1 items-end justify-items-center gap-x-10 gap-y-12 md:grid-cols-2 xl:grid-cols-3">
          <GlassFolder
            label="Revision"
            meta="GCSE · A-level · BTEC"
            art="aurora"
            seed={3}
            action="none"
            width={300}
            files={[
              { name: "Practice quizzes", meta: "4,400+", image: "/landing/game-study-october.jpg", href: "/practice" },
              { name: "Flashcards", meta: "Key terms", href: "/flashcards" },
              { name: "Revision guides", meta: "By subject", href: "/revision" },
            ]}
          />
          <GlassFolder
            label="Careers"
            meta="Simulated workplaces"
            tone="dark"
            art="ember"
            seed={11}
            action="none"
            labelPlacement="top-left"
            width={300}
            appearDelay={140}
            files={[
              { name: "Work a shift", meta: "In the game", image: "/landing/game-city-life.webp", href: "/games" },
              { name: "Career paths", meta: "Explore", href: "/careers" },
              { name: "Library", meta: "Resources", href: "/library" },
            ]}
          />
          <GlassFolder
            label="Homework"
            meta="Set by your teacher"
            art="verdant"
            seed={7}
            action="none"
            labelPlacement="top-right"
            width={300}
            appearDelay={280}
            files={[
              { name: "Your quests", meta: "Due soon", image: "/landing/game-hub.webp", href: "/homework" },
              { name: "Quizzes", meta: "Marked instantly", href: "/quizzes" },
            ]}
          />
        </div>

        <div className={`${card} mx-auto mt-20 grid max-w-5xl items-center gap-8 p-8 md:grid-cols-[1fr_minmax(0,420px)] md:p-10`}>
          <div>
            <p className={`text-sm font-bold ${accent}`}>Your phone in London</p>
            <h3 className={`${display} mt-2 text-3xl`}>Every app you need, one tap away.</h3>
            <p className={`mt-3 leading-7 ${soft}`}>
              Find your way with Maps, hop on a bus to anywhere, open the Study room, change your look in the Locker and spend the Clout
              you earn by learning. Hover the folder to fan them out.
            </p>
          </div>
          <div className="flex justify-center">
            <IconFolder theme="dark" title="Phone" tags={PHONE_APPS.map((a) => a.label ?? "")} icons={PHONE_APPS} spread={62} />
          </div>
        </div>
      </section>
    </>
  );
}
