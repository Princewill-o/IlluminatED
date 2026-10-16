import Link from "next/link";

import { Video } from "lucide-react";

/** The nudge to become a creator, shown on the dashboard, Me page and game screens. */
export function CreatorCard({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/creators"
      className="group relative block overflow-hidden rounded-3xl bg-[#1f4fbf] p-6 text-white md:p-7"
    >
      <span aria-hidden className="absolute -top-10 -right-10 size-40 rounded-full bg-[#f2d9a6]/30" />
      <span className="relative flex items-center gap-2 text-xs font-black tracking-widest text-[#f2d9a6] uppercase">
        <Video className="size-4" aria-hidden /> Creator scheme
      </span>
      <span className="relative mt-3 block text-2xl font-black md:text-3xl">Get paid to post about IlluminatED</span>
      {!compact && (
        <span className="relative mt-2 block max-w-md text-sm leading-6 text-white/85">
          Film your best Promotion Panic run, your job shift or your room on TikTok, Reels or Shorts. Send us the link: we pay for every video we approve, and you
          get 150 Clout for every friend who joins with your link.
        </span>
      )}
      <span className="relative mt-5 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-black text-[#13203a] group-hover:bg-[#f7f1e6]">
        Get your link →
      </span>
    </Link>
  );
}
