import Image from "next/image";
import Link from "next/link";

import { ArrowRight, Award, BriefcaseBusiness, Gamepad2, MapPin, Shirt } from "lucide-react";
import type { Metadata } from "next";

import { ProductBrand } from "@/components/products/product-brand";

export const metadata: Metadata = {
  title: { absolute: "IllumWorld | Your city. Your next chapter." },
  description: "Play IllumWorld: create your character, explore the city and try short in-game role contracts. Three short shifts, practical skills and an IlluminatED completion certificate.",
};

const display = "[font-family:var(--font-geist-sans)] font-black tracking-[-0.04em]";
const soft = "text-[#1d1a4a]/75 dark:text-white/75";
const accent = "text-[#5141b5] dark:text-[#cbc1ff]";
const panel = "rounded-3xl border-[3px] border-[#1d1a4a] bg-white/85 shadow-[6px_6px_0_#1d1a4a] dark:border-white/80 dark:bg-[#17153b]/95 dark:shadow-[6px_6px_0_rgba(179,175,255,0.45)]";
const primaryButton = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-[3px] border-[#1d1a4a] bg-[#5141b5] px-6 py-3 font-bold text-white shadow-[4px_4px_0_#1d1a4a] transition-transform motion-safe:hover:-translate-y-0.5 motion-reduce:transform-none dark:border-white/80 dark:bg-[#d8d1ff] dark:text-[#1d1a4a] dark:shadow-[4px_4px_0_rgba(179,175,255,0.45)]";
const secondaryButton = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-[3px] border-[#1d1a4a] bg-white px-6 py-3 font-bold text-[#1d1a4a] shadow-[4px_4px_0_#1d1a4a] transition-transform motion-safe:hover:-translate-y-0.5 motion-reduce:transform-none dark:border-white/80 dark:bg-[#251e53] dark:text-white dark:shadow-[4px_4px_0_rgba(179,175,255,0.45)]";

export default function IllumWorldHome() {
  return <div className="product-home relative bg-transparent text-[#1d1a4a] dark:text-white">
    <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:py-24">
      <div>
        <ProductBrand product="world" className="mb-5 text-xl sm:text-2xl [&_svg]:size-14 sm:[&_svg]:size-16" />
        <p className="inline-flex items-center gap-2 rounded-full border-[3px] border-[#1d1a4a] bg-[#ffd76a] px-4 py-1.5 text-sm font-black text-[#1d1a4a] shadow-[3px_3px_0_#1d1a4a]"><Gamepad2 className="size-4" aria-hidden /> THE ILLUMWORLD GAME</p>
        <h1 className={`${display} mt-6 text-5xl leading-[1.04] sm:text-6xl`}>Your city.<br /><span className={accent}>Your next chapter.</span></h1>
        <p className={`${soft} mt-6 max-w-xl text-lg leading-relaxed`}>Create your character, explore the city and take on a new role. In IllumWorld, your next adventure could start on the high street, at a workplace or with a short in-game contract.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/games/world?map=city" className={primaryButton}>Play IllumWorld <ArrowRight className="size-4" aria-hidden /></Link>
          <Link href="/world/contracts" className={secondaryButton}>Explore role contracts</Link>
        </div>
        <p className={`${soft} mt-5 text-sm font-semibold`}>A playable city · Your own character · Short, skill-building contracts</p>
      </div>
      <figure className={`${panel} overflow-hidden lg:rotate-2`}>
        <Image src="/landing/world-current-square.jpg" alt="A character and computer-controlled residents in IllumWorld’s town hall and fountain square" width={1152} height={648} priority sizes="(min-width:1024px) 50vw, 95vw" className="aspect-[4/3] w-full object-cover" />
        <figcaption className="flex items-center gap-2 border-t-[3px] border-[#1d1a4a] p-4 text-sm font-bold dark:border-white/80"><Gamepad2 className={`${accent} size-5 shrink-0`} aria-hidden /> Captured inside the actual game.</figcaption>
      </figure>
    </section>

    <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8" aria-labelledby="inside-world-title">
      <h2 id="inside-world-title" className={`${display} text-3xl sm:text-4xl`}>Make this world yours.</h2>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [Shirt, "Your character", "Choose your look and head into the city as yourself."],
          [MapPin, "Your next stop", "Explore streets, homes and workplaces. Find somewhere new to go."],
          [BriefcaseBusiness, "Your next role", "Try an in-game role through a short contract with practical decisions."],
          [Award, "Your progress", "Complete a role course and keep an IlluminatED completion certificate."],
        ].map(([Icon,title,description])=>{
          const Symbol=Icon as typeof Shirt;
          return <article key={String(title)} className={`${panel} p-6`}><Symbol className={`${accent} size-8`} aria-hidden /><h3 className="mt-4 text-xl font-bold">{String(title)}</h3><p className={`${soft} mt-3 text-sm leading-relaxed`}>{String(description)}</p></article>;
        })}
      </div>
    </section>

    <section className="mx-auto grid max-w-7xl items-center gap-9 px-5 pb-16 sm:px-8 lg:grid-cols-2" aria-labelledby="contracts-title">
      <figure className={`${panel} overflow-hidden lg:-rotate-1`}><Image src="/landing/world-current-workplace.jpg" alt="An over-the-shoulder view of the character approaching computers and a helpdesk in an IllumWorld workplace" width={750} height={410} sizes="(min-width:1024px) 50vw, 95vw" className="aspect-[4/3] w-full object-cover" /><figcaption className={`${soft} border-t-[3px] border-[#1d1a4a] p-4 text-sm dark:border-white/80`}>Workplaces are part of the game. Every role is an educational simulation.</figcaption></figure>
      <div>
        <p className="inline-flex rounded-full border-2 border-[#1d1a4a] bg-[#b9f0c9] px-3 py-1 text-sm font-black text-[#1d1a4a]">THREE SHORT SHIFTS. ONE ROLE TO TRY.</p>
        <h2 id="contracts-title" className={`${display} mt-5 text-3xl sm:text-4xl`}>A contract you can actually finish.</h2>
        <p className={`${soft} mt-5 leading-relaxed`}>Try data analysis, business analysis or cybersecurity in a short in-game course. See your contract’s shifts and estimated learning time before you start — around 25 minutes altogether.</p>
        <ol className="mt-6 space-y-4">{["Read the role brief and learn a useful skill.","Make a decision, practise and complete each shift’s checks.","Finish the contract and download your IlluminatED certificate."].map((step,i)=><li key={step} className="flex items-start gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-[#1d1a4a] bg-[#ffd76a] text-sm font-black text-[#1d1a4a]">{i+1}</span><p className={`${soft} pt-1 text-sm leading-relaxed`}>{step}</p></li>)}</ol>
        <Link href="/world/contracts" className={`${primaryButton} mt-7`}>Choose an in-game role <ArrowRight className="size-4" aria-hidden /></Link>
        <p className={`${soft} mt-4 text-xs leading-relaxed`}>These are independent IlluminatED learning activities. They are not employment, a real company placement, or Microsoft or Coursera qualifications.</p>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
      <div className="grid gap-5 md:grid-cols-3">
        <Link href="/world/contracts#certificates" className={`${panel} p-6 transition-transform motion-safe:hover:-translate-y-1`}><Award className={`${accent} size-7`} aria-hidden /><h2 className="mt-4 text-xl font-bold">Finish it. Keep the record.</h2><p className={`${soft} mt-3 text-sm leading-relaxed`}>Earn a branded record of the in-game course you completed. Your contract explains the checks required.</p></Link>
        <Link href="/world/pilot" className={`${panel} p-6 transition-transform motion-safe:hover:-translate-y-1`}><Gamepad2 className={`${accent} size-7`} aria-hidden /><h2 className="mt-4 text-xl font-bold">Bring your class into the game.</h2><p className={`${soft} mt-3 text-sm leading-relaxed`}>Plan a guided session around a role, a decision and a useful discussion.</p></Link>
        <div className={`${panel} p-6`}><h2 className="text-xl font-bold">Need subject support?</h2><p className={`${soft} mt-3 text-sm leading-relaxed`}>Maths, Science and English support Years 7–11. You can study a subject without playing the game.</p><div className="mt-4 flex flex-wrap gap-4 text-sm font-bold"><Link href="/maths" className="inline-flex min-h-11 items-center underline underline-offset-4">Maths</Link><Link href="/science" className="inline-flex min-h-11 items-center underline underline-offset-4">Science</Link><Link href="/english" className="inline-flex min-h-11 items-center underline underline-offset-4">English</Link></div></div>
      </div>
      <p className={`${soft} mt-8 text-center text-xs leading-relaxed`}>IllumWorld is a game with fictional educational activities and computer-controlled residents. In-game certificates record learning activity; they are not regulated qualifications.</p>
    </section>
  </div>;
}
