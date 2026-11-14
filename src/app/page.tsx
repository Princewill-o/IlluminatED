import Image from "next/image";
import Link from "next/link";

import { ArrowRight, Award, BookOpen, Building2, Check, Clock3, Users } from "lucide-react";
import type { Metadata } from "next";

import { ProductBrand, ProductMark } from "@/components/products/product-brand";
import { SiteStructuredData } from "@/components/seo/structured-data";
import { SUBJECT_PACKS } from "@/lib/learning/packs";
import { PRODUCTS } from "@/lib/learning/products";

export const metadata: Metadata = {
  title: { absolute: "IlluminatED Learning | Four products. One place to grow." },
  description: "Discover IllumWorld virtual work experience, IllumMaths, IllumScience and IllumEnglish. One pupil account and one school dashboard.",
  alternates: { canonical: "/" },
};

const display = "[font-family:var(--font-geist-sans)] font-semibold tracking-[-0.035em]";
const soft = "text-[var(--sky-soft)]";
const frame = "rounded-3xl border-[3px] border-[#1d1a4a] bg-[var(--sky-card)] shadow-[6px_6px_0_#1d1a4a] dark:border-white/75 dark:shadow-[6px_6px_0_rgba(179,175,255,0.4)]";
const button = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-[3px] border-[#1d1a4a] px-6 py-3 font-bold shadow-[4px_4px_0_#1d1a4a] transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 motion-reduce:transform-none";
const inside: Record<string, string[]> = {
  world: ["Tech Repair Trainee", "My Work portfolio", "Careers city"],
  ...Object.fromEntries(["maths", "science", "english"].map(id => [id, [
    ...SUBJECT_PACKS.filter(pack => pack.product === id).map(pack => pack.title),
    ...(id === "maths" ? ["Solo Maths Race"] : []),
  ]])),
};

function Cloud({ className }: { className: string }) {
  return <svg aria-hidden="true" viewBox="0 0 200 90" className={`landing-drift pointer-events-none absolute hidden sm:block dark:hidden ${className}`}>
    <path d="M30 80 Q5 80 8 60 Q10 42 32 44 Q34 18 62 20 Q78 2 104 14 Q130 4 140 30 Q170 24 176 50 Q196 56 190 72 Q186 82 168 80 Z" fill="#fff" stroke="#1d1a4a" strokeWidth="5" strokeLinejoin="round" />
  </svg>;
}

function Shot({ src, alt, className, priority = false }: { src: string; alt: string; className: string; priority?: boolean }) {
  return <figure className={`landing-pop absolute overflow-hidden rounded-2xl border-4 border-[#1d1a4a] bg-white shadow-[8px_8px_0_#1d1a4a] dark:border-white/85 dark:shadow-[8px_8px_0_rgba(179,175,255,0.45)] ${className}`}>
    <Image src={src} alt={alt} width={1600} height={900} sizes="(min-width:1024px) 680px, 95vw" priority={priority} className="h-full w-full object-cover" />
  </figure>;
}

export default function Home() {
  return <div className="learning-home landing-sky relative isolate -mt-24 overflow-hidden pt-24 text-[var(--sky-ink)]">
    <SiteStructuredData />
    <div aria-hidden="true" className="landing-stars-tile pointer-events-none absolute inset-0 hidden dark:block" />

    <section className="relative" aria-labelledby="hero-title">
      <div aria-hidden="true" className="absolute right-[7%] top-14 hidden size-16 rounded-full border-4 border-[#1d1a4a] bg-[#ffd23f] shadow-[0_0_0_14px_rgba(255,210,63,0.3)] lg:block dark:border-transparent dark:bg-[#fff8e1] dark:shadow-[0_0_60px_20px_rgba(255,244,214,0.3)]" />
      <Cloud className="left-[3%] top-16 w-36" />
      <Cloud className="right-[12%] top-72 w-24 [animation-duration:26s]" />
      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-5 pt-12 text-center sm:pt-20">
        <p className="rounded-full border-[3px] border-[#1d1a4a] bg-[#ffd23f] px-4 py-2 text-xs font-black text-[#1d1a4a] shadow-[3px_3px_0_#1d1a4a] sm:text-sm">FOUR PRODUCTS. ONE PLACE TO GROW.</p>
        <h1 id="hero-title" className={`${display} mt-8 max-w-4xl text-5xl leading-[1.04] text-balance sm:text-7xl`}>Big ideas.<br /><span className="learning-hero-gradient">Brighter futures.</span></h1>
        <p className={`mt-6 max-w-2xl text-lg leading-8 ${soft}`}>Explore a world of work. Crack a tricky question. Find your voice. Choose IllumWorld, IllumMaths, IllumScience or IllumEnglish and make your next step count.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-4"><Link href="#products" className={`${button} landing-shine relative overflow-hidden bg-[#5b56c8] text-white`}>Find your product <ArrowRight className="size-4" aria-hidden /></Link><Link href="/world/pilot" className={`${button} bg-white text-[#1d1a4a]`}>For schools <Building2 className="size-4" aria-hidden /></Link></div>
        <p className={`mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-semibold ${soft}`}><span>One account</span><span aria-hidden>·</span><span>Learn your way</span><span aria-hidden>·</span><Link href="/school" className="inline-flex min-h-11 items-center gap-2 underline underline-offset-4"><Users className="size-4" aria-hidden />Join your class</Link></p>
      </div>

      <div className="relative mx-auto mt-10 h-[270px] max-w-7xl sm:h-[420px] lg:h-[500px]" aria-label="Inside IllumWorld">
        <Shot src="/landing/world-cafe.webp" alt="A café inside the playable IllumWorld city" className="left-[2%] top-12 hidden h-[220px] w-[340px] -rotate-6 md:block lg:h-[280px] lg:w-[420px]" />
        <Shot src="/landing/world-university.webp" alt="The university portico in the IllumWorld careers city" className="right-[2%] top-16 hidden h-[220px] w-[340px] rotate-6 md:block lg:h-[270px] lg:w-[430px]" />
        <Shot src="/landing/world-street.webp" alt="IllumWorld's London high street, with shops, traffic and places to explore" priority className="left-1/2 top-3 z-10 h-[230px] w-[88%] -translate-x-1/2 sm:h-[340px] sm:w-[560px] lg:h-[410px] lg:w-[680px]" />
        <Link href="/world" className="landing-bob absolute -top-4 left-[7%] z-20 rounded-2xl border-[3px] border-[#1d1a4a] bg-[#fff8e8] p-2.5 text-[#1d1a4a] shadow-[4px_4px_0_#1d1a4a] sm:left-[15%]"><ProductBrand product="world" className="text-sm sm:text-base" /></Link>
        <span className="landing-bob absolute bottom-2 right-[7%] z-20 rounded-full border-[3px] border-[#1d1a4a] bg-[#b9f0c9] px-4 py-2 text-sm font-black text-[#1d1a4a] shadow-[4px_4px_0_#1d1a4a] [animation-delay:-2s] sm:bottom-7 sm:right-[17%]">Real skills. Your next adventure.</span>
      </div>
    </section>

    <section id="products" className="relative mx-auto max-w-7xl scroll-mt-28 px-5 py-16 sm:px-8 sm:py-20" aria-labelledby="products-title">
      <div className="mx-auto max-w-2xl text-center"><p className="text-sm font-black text-[var(--sky-accent)]">PICK YOUR NEXT ADVENTURE</p><h2 id="products-title" className={`${display} mt-3 text-4xl sm:text-5xl`}>Your interests. Your starting point.</h2><p className={`mt-5 leading-7 ${soft}`}>Each product has a home of its own. Start with a subject, step into a workplace, or switch whenever you are ready.</p></div>
      <div className="mt-12 grid gap-7 md:grid-cols-2 lg:gap-9">{PRODUCTS.map(p => <article key={p.id} className={`${frame} flex flex-col p-6 sm:p-8`}>
        <div className="flex items-center justify-between gap-4"><ProductMark product={p.id} className="size-20" /><span className="max-w-40 rounded-full bg-white/65 px-3 py-2 text-center text-xs font-bold text-[#1d1a4a] dark:bg-white/10 dark:text-white">{p.id === "world" ? "Year 10 · Work experience" : "GCSE foundations · Revision"}</span></div>
        <p className={`mt-5 text-sm font-bold ${soft}`}>{p.label}</p><h3 className={`${display} mt-1 text-3xl sm:text-4xl`}>{p.name}</h3><p className={`mt-4 max-w-lg leading-7 ${soft}`}>{p.description}</p>
        <ul className="mt-6 flex flex-1 flex-wrap content-start gap-2" aria-label={`Inside ${p.name}`}>{inside[p.id]?.map(item => <li key={item} className="rounded-full border border-current/15 px-3 py-1.5 text-xs font-semibold">{item}</li>)}</ul>
        <Link href={p.path} className={`${button} mt-8 self-start bg-white text-[#1d1a4a] dark:bg-[#e8e4ff]`}>Open {p.name} <ArrowRight className="size-4" aria-hidden /></Link>
      </article>)}</div>
    </section>

    <section id="how-it-works" className="relative mx-auto max-w-7xl scroll-mt-28 px-5 py-12 sm:px-8 sm:py-20" aria-labelledby="lesson-title"><div className={`${frame} grid gap-10 p-6 sm:p-10 lg:grid-cols-[1fr_1.1fr] lg:p-12`}>
      <div><p className="inline-flex items-center gap-2 text-sm font-black text-[var(--sky-accent)]"><Building2 className="size-5" aria-hidden /> MADE FOR YOUR CLASS</p><h2 id="lesson-title" className={`${display} mt-5 text-4xl sm:text-5xl`}>A lesson with<br />a life beyond it.</h2><p className={`mt-5 max-w-lg leading-7 ${soft}`}>Give Year 10 a decision worth defending. Pupils inspect three fictional phones, calculate profit and write a customer report. Their teacher reviews the work, with room to revise and improve.</p><Link href="/world/pilot" className={`${button} mt-7 bg-[#5b56c8] text-white`}>Plan a pilot lesson <ArrowRight className="size-4" aria-hidden /></Link></div>
      <div className="rounded-2xl bg-white/55 p-5 dark:bg-white/5 sm:p-7"><ProductBrand product="world" /><h3 className="mt-5 text-2xl font-black">Tech Repair Trainee</h3><p className={`mt-2 flex items-center gap-2 text-sm ${soft}`}><Clock3 className="size-4" aria-hidden /> Year 10 · 35–40 minutes</p><ol className="mt-6 space-y-5">{["Inspect the evidence and calculate the expected profit.","Recommend repair, sale as-is or decline. Explain why.","Write a clear, honest condition report for a customer.","Submit your work and respond to teacher feedback."].map((step,i)=><li key={step} className="flex items-start gap-3 text-sm leading-6"><span className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-[#1d1a4a] bg-[#ffd76a] font-black text-[#1d1a4a]">{i+1}</span>{step}</li>)}</ol></div>
    </div></section>

    <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-2" aria-labelledby="record-title">
      <div><p className="inline-flex items-center gap-2 text-sm font-black text-[var(--sky-accent)]"><Award className="size-5" aria-hidden /> SOMETHING TO BE PROUD OF</p><h2 id="record-title" className={`${display} mt-4 text-4xl sm:text-5xl`}>Skills you can show.<br />Work you can keep.</h2><p className={`mt-5 leading-7 ${soft}`}>Your calculations, decisions and report belong in My Work. Teacher approval unlocks a certificate showing the skills you demonstrated.</p><ul className="mt-6 space-y-3">{["Download your finished project as a PDF.","See your teacher’s feedback and improve your work.","Earn a certificate after an assigned project is approved."].map(item=><li key={item} className="flex gap-3 text-sm leading-6"><Check className="mt-1 size-4 shrink-0 text-[var(--sky-accent)]" aria-hidden />{item}</li>)}</ul><div className="mt-7 flex flex-wrap gap-5"><Link href="/world/my-work" className="inline-flex min-h-11 items-center font-bold underline underline-offset-4">Open My Work</Link><a href="/world/pilot/sample" className="inline-flex min-h-11 items-center font-bold underline underline-offset-4">View the sample certificate</a></div></div>
      <figure className={`${frame} -rotate-1 p-3 sm:p-5`}><Image src="/landing/certificate-sample.webp" alt="Navy-and-gold IllumWorld project certificate, clearly marked SAMPLE - NOT AWARDED" width={1287} height={910} sizes="(min-width:1024px) 50vw, 95vw" className="w-full rounded-xl" /><figcaption className={`mt-4 px-2 text-center text-xs leading-5 ${soft}`}>Teacher-approved project completion. A record of your work, not an externally accredited qualification.</figcaption></figure>
    </section>

    <section className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8" aria-labelledby="shared-title"><div className="grid gap-8 md:grid-cols-2">
      <div className={`${frame} p-7 sm:p-9`}><Users className="size-8 text-[var(--sky-accent)]" aria-hidden /><h2 id="shared-title" className={`${display} mt-5 text-3xl`}>Different products.<br />One learning journey.</h2><p className={`mt-5 leading-7 ${soft}`}>One pupil account keeps your saved practice and projects together. One school dashboard lets teachers assign work, review submissions and keep the class moving.</p><Link href="/school" className="mt-6 inline-flex min-h-11 items-center gap-2 font-bold">Open the school dashboard <ArrowRight className="size-4" aria-hidden /></Link></div>
      <div className={`${frame} p-7 sm:p-9`}><BookOpen className="size-8 text-[var(--sky-accent)]" aria-hidden /><h2 className={`${display} mt-5 text-3xl`}>Your library.<br />Still right here.</h2><p className={`mt-5 leading-7 ${soft}`}>Keep exploring IllumED Slides for primary and secondary school, plus the wider revision library and sixth-form resources. Your existing lesson links still work.</p><div className="mt-6 flex flex-wrap gap-5"><Link href="/curriculum" className="inline-flex min-h-11 items-center font-bold underline underline-offset-4">Lesson slides</Link><Link href="/learn" className="inline-flex min-h-11 items-center font-bold underline underline-offset-4">Revision library</Link></div></div>
    </div></section>

    <section className="relative mx-auto max-w-4xl px-5 pb-24 pt-10 text-center sm:pb-32" aria-labelledby="start-title"><div className="mb-7 flex justify-center gap-3">{PRODUCTS.map(p=><Link key={p.id} href={p.path} aria-label={`Open ${p.name}`} className="rounded-2xl transition hover:-translate-y-1 motion-reduce:transform-none"><ProductMark product={p.id} className="size-14 sm:size-16" /></Link>)}</div><h2 id="start-title" className={`${display} text-4xl sm:text-6xl`}>Where will you go next?</h2><p className={`mx-auto mt-5 max-w-lg leading-7 ${soft}`}>A topic you want to understand. A workplace you want to explore. A little progress starts here.</p><Link href="#products" className={`${button} mt-8 bg-[#5b56c8] text-white`}>Choose your product <ArrowRight className="size-4" aria-hidden /></Link></section>
  </div>;
}
