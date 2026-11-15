import Link from "next/link";

import { ArrowRight, Gamepad2 } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bring your class into the game | IllumWorld",
  description: "Plan a guided IllumWorld game session: choose an in-game role contract, explore a short three-shift course and discuss pupils’ decisions.",
};

export default function WorldPilotPage() {
  return <article className="mx-auto max-w-5xl px-5 py-12 text-[#1d1a4a] dark:text-white">
    <p className="text-primary inline-flex items-center gap-2 text-sm font-bold tracking-widest uppercase"><Gamepad2 className="size-5" aria-hidden /> IllumWorld · School pilot</p>
    <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">A role to try.<br />A decision to talk about.</h1>
    <p className="text-muted-foreground mt-5 max-w-3xl text-lg leading-relaxed">Bring pupils into the IllumWorld game for a guided session. Choose a short in-game role contract, work through its learning and checks, then discuss how pupils made their decisions.</p>
    <div className="mt-7 flex flex-wrap gap-3">
      <Link href="/games/world?map=city" className="bg-primary text-primary-foreground inline-flex min-h-12 items-center gap-2 rounded-xl px-6 py-3 font-bold">Play IllumWorld <ArrowRight className="size-4" aria-hidden /></Link>
      <Link href="/world/contracts" className="inline-flex min-h-12 items-center rounded-xl border px-6 py-3 font-bold">Compare role contracts</Link>
      <Link href="/book?for=school&product=world&activity=role-contracts" className="inline-flex min-h-12 items-center rounded-xl border px-6 py-3 font-bold">Request a school pilot</Link>
    </div>
    <section className="bg-card mt-10 grid gap-6 rounded-3xl border p-6 sm:grid-cols-3" aria-label="Plan your session">
      {[
        ["Choose a role", "Start with data analysis, business analysis or cybersecurity. Preview the course and choose a role that matches your pupils’ readiness."],
        ["Plan the time", "Each role has three short shifts and around 25 minutes of learning. Allow extra time to enter the game, ask questions and discuss decisions."],
        ["Get ready", "Use the playable city in a modern browser. Check your school’s device, network and account arrangements before the class session."],
      ].map(([title,body])=><div key={title}><h2 className="font-bold">{title}</h2><p className="text-muted-foreground mt-3 text-sm leading-relaxed">{body}</p></div>)}
    </section>
    <section className="mt-12"><h2 className="text-2xl font-bold">A simple classroom sequence</h2><ol className="mt-5 space-y-5">{[
      ["Before playing", "Read the role brief together. Ask pupils what the role needs to know, what a useful result would look like, and what they would need to check."],
      ["During the contract", "Pupils work through the short shifts, use the explanations and answer the checks. Pause after a decision to compare approaches; a quick answer is not always a well-explained one."],
      ["After playing", "Ask pupils to explain one decision with evidence, one mistake they corrected and one question they would ask in a real workplace."],
    ].map(([title,body],i)=><li key={title} className="flex gap-4"><span className="bg-secondary grid size-9 shrink-0 place-items-center rounded-full border font-black">{i+1}</span><div><h3 className="font-bold">{title}</h3><p className="text-muted-foreground mt-2 leading-relaxed">{body}</p></div></li>)}</ol></section>
    <section className="bg-secondary mt-12 rounded-3xl border p-7"><h2 className="text-2xl font-bold">A record of in-game learning</h2><p className="text-muted-foreground mt-4 leading-relaxed">Completing a role contract’s required checks unlocks an IlluminatED in-game course completion certificate. It records the role course and learning activity; it does not claim a real placement, company endorsement or a regulated qualification.</p><Link href="/world/contracts#certificates" className="mt-5 inline-flex min-h-11 items-center gap-2 font-bold underline underline-offset-4">See how completion certificates work <ArrowRight className="size-4" aria-hidden /></Link></section>
    <section className="mt-12"><h2 className="text-2xl font-bold">Support the skills beside the game</h2><p className="text-muted-foreground mt-4 leading-relaxed">Use IllumMaths, IllumScience and IllumEnglish for separate Years 7–11 subject support. Choose a year group and topic to revisit a method, explore evidence or practise writing. The subject resources also work independently of the game.</p><div className="mt-5 flex flex-wrap gap-5 font-bold"><Link href="/maths" className="inline-flex min-h-11 items-center underline underline-offset-4">IllumMaths</Link><Link href="/science" className="inline-flex min-h-11 items-center underline underline-offset-4">IllumScience</Link><Link href="/english" className="inline-flex min-h-11 items-center underline underline-offset-4">IllumEnglish</Link></div></section>
    <p className="text-muted-foreground mt-12 border-t pt-6 text-sm leading-relaxed">IllumWorld roles are fictional educational simulations, not real employment. In-game practice checks support learning and discussion; teachers remain responsible for school assessment and choosing suitable activities.</p>
  </article>;
}
