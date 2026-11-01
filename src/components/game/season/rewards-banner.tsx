import Link from "next/link";

import { Gift, Trophy } from "lucide-react";

import { MARATHON_PRIZES, marathonClosing, marathonDates } from "@/game/core/event-marathon";

export function RewardsBanner() {
  const { end } = marathonDates();
  return (
    <section id="events" aria-labelledby="event-rewards-title" className="relative overflow-hidden rounded-3xl border-2 border-[#ffd23f]/50 bg-gradient-to-br from-[#172446] via-[#403080] to-[#653c91] p-6 text-white sm:p-8">
      <p className="flex items-center gap-2 text-sm font-black tracking-widest text-[#ffe788] uppercase"><Trophy className="size-5" aria-hidden /> Events · 30-day marathon</p>
      <h2 id="event-rewards-title" className="mt-3 text-3xl font-black sm:text-4xl">Learn. Climb the leaderboard. Win Amazon vouchers.</h2>
      <p className="mt-3 max-w-2xl leading-7 text-white/85">The best three eligible players on the marathon leaderboard win real Amazon vouchers at month end. Answer Championship questions to score; every correct answer is worth 10 points.</p>
      <ol className="mt-5 grid gap-3 sm:grid-cols-3">{MARATHON_PRIZES.map((value, i) => <li key={value} className="flex items-center gap-3 rounded-2xl bg-white/10 p-4"><Gift className="size-6 text-[#ffe788]" aria-hidden /><div><p className="text-xs font-bold text-white/70">{["1st place", "2nd place", "3rd place"][i]}</p><p className="text-2xl font-black">£{value} voucher</p></div></li>)}</ol>
      <p className="mt-4 text-sm leading-6 text-white/80">Free entry · UK residents aged 13+ · Under-18s need a parent or guardian’s permission · Closes {marathonClosing(end)} London time. Prizes follow eligibility and score review. Amazon is not a sponsor.</p>
      <p className="mt-2 text-sm text-white/75">Also earn virtual Clout, IllumED Coins, badges and kart unlocks through gameplay. Coins have no cash value.</p>
      <div className="mt-5 flex flex-wrap gap-3"><Link href="/games/world?activity=championship" className="rounded-full bg-[#ffd23f] px-5 py-3 font-black text-[#172446]">Enter in game</Link><Link href="/events/marathon" className="rounded-full border border-white/40 px-5 py-3 font-bold">Dates & full rules</Link></div>
    </section>
  );
}
