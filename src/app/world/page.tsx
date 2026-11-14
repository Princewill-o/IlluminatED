import Image from "next/image";
import Link from "next/link";

import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  FileCheck2,
  Wrench,
} from "lucide-react";
import type { Metadata } from "next";

import { SupplementalResources } from "@/components/learning-school/supplemental-resources";
import { ProductBrand } from "@/components/products/product-brand";

export const metadata: Metadata = {
  title: { absolute: "IllumWorld | Virtual work experience" },
  description:
    "Explore a careers city and complete a Year 10 workplace project. Inspect devices, defend decisions and build a portfolio in IllumWorld.",
};

const display =
  "[font-family:var(--font-geist-sans)] font-black tracking-[-0.04em]";
const soft = "text-[#1d1a4a]/75 dark:text-white/75";
const accent = "text-[#5141b5] dark:text-[#cbc1ff]";
const panel =
  "rounded-3xl border-[3px] border-[#1d1a4a] bg-white/85 shadow-[6px_6px_0_#1d1a4a] dark:border-white/80 dark:bg-[#17153b]/95 dark:shadow-[6px_6px_0_rgba(179,175,255,0.45)]";
const primaryButton =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-[3px] border-[#1d1a4a] bg-[#5141b5] px-6 py-3 font-bold text-white shadow-[4px_4px_0_#1d1a4a] transition-transform motion-safe:hover:-translate-y-0.5 dark:border-white/80 dark:bg-[#d8d1ff] dark:text-[#1d1a4a] dark:shadow-[4px_4px_0_rgba(179,175,255,0.45)]";
const secondaryButton =
  "inline-flex min-h-12 items-center justify-center rounded-xl border-[3px] border-[#1d1a4a] bg-white px-6 py-3 font-bold text-[#1d1a4a] shadow-[4px_4px_0_#1d1a4a] transition-transform motion-safe:hover:-translate-y-0.5 dark:border-white/80 dark:bg-[#251e53] dark:text-white dark:shadow-[4px_4px_0_rgba(179,175,255,0.45)]";

export default async function IllumWorldHome() {
  return (
    <div className="product-home relative bg-transparent text-[#1d1a4a] dark:text-white">
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:py-24">
        <div>
          <ProductBrand
            product="world"
            className="mb-5 text-xl sm:text-2xl [&_svg]:size-14 sm:[&_svg]:size-16"
          />
          <p className="inline-flex rounded-full border-[3px] border-[#1d1a4a] bg-[#ffd76a] px-4 py-1.5 text-sm font-black text-[#1d1a4a] shadow-[3px_3px_0_#1d1a4a]">
            Virtual work experience
          </p>
          <h1 className={`${display} mt-6 text-5xl leading-[1.04] sm:text-6xl`}>
            Step into a workplace.
            <br />
            <span className={accent}>Make a real decision.</span>
          </h1>
          <p className={`${soft} mt-6 max-w-xl text-lg leading-relaxed`}>
            A careers city where pupils practise the judgement, calculations and
            communication that a workplace project needs. Start in the repair
            shop.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/world/tech-repair-trainee" className={primaryButton}>
              Enter the repair shop{" "}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link href="/world/pilot" className={secondaryButton}>
              Plan a school lesson
            </Link>
          </div>
          <p className={`${soft} mt-5 text-sm font-semibold`}>
            Year 10 · 35–40 minutes · One complete assessed project
          </p>
        </div>
        <figure className={`${panel} overflow-hidden lg:rotate-2`}>
          <Image
            src="/landing/world-street.webp"
            alt="A street in the existing IlluminatED careers city"
            width={1600}
            height={900}
            priority
            className="aspect-[4/3] w-full object-cover"
          />
          <figcaption className="flex items-center gap-2 border-t-[3px] border-[#1d1a4a] p-4 text-sm font-bold dark:border-white/80">
            <Building2 className={`${accent} size-5 shrink-0`} aria-hidden />
            Your city is the setting. Your work is the outcome.
          </figcaption>
        </figure>
      </section>
      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <div className={`${panel} p-6 sm:p-10`}>
          <p className="inline-flex rounded-full border-2 border-[#1d1a4a] bg-[#b9f0c9] px-3 py-1 text-sm font-black text-[#1d1a4a]">
            Mission 01
          </p>
          <div className="mt-3 grid gap-8 md:grid-cols-[1.4fr_1fr]">
            <div>
              <h2 className={`${display} text-3xl sm:text-4xl`}>
                Tech Repair Trainee
              </h2>
              <p className={`${soft} mt-4 max-w-2xl leading-relaxed`}>
                A shop has three fictional phones to assess. Inspect the faults
                and costs, calculate expected profit, recommend repair, as-is
                sale or decline, then write a customer-facing report.
              </p>
              <p className={`${soft} mt-4 leading-relaxed`}>
                Profit alone does not settle the decision. A suspected battery
                fault could use up a narrow margin. Explain which evidence
                supports your judgement and what is still unknown.
              </p>
              <Link
                href="/world/tech-repair-trainee"
                className={`${primaryButton} mt-6`}
              >
                Start the mission <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/games/world?map=venture-hub"
                className="mt-3 block py-2 text-sm font-bold underline underline-offset-4"
              >
                Visit the repair workshop in the city (optional)
              </Link>
              <p className={`${soft} mt-1 text-xs leading-relaxed`}>
                The direct lesson opens the same project without loading the 3D
                world, making it suitable for a school laptop.
              </p>
            </div>
            <ol className="space-y-4">
              {[
                [
                  Wrench,
                  "Inspect",
                  "Read three device cases and identify uncertainties.",
                ],
                [
                  ClipboardCheck,
                  "Decide",
                  "Calculate profit and justify your recommendation.",
                ],
                [
                  FileCheck2,
                  "Build your portfolio",
                  "Submit, revise and download your teacher-approved work.",
                ],
              ].map(([Icon, title, description]) => {
                const Symbol = Icon as typeof Wrench;
                return (
                  <li key={String(title)} className="flex gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl border-2 border-[#1d1a4a] bg-[#e3d9ff] text-[#1d1a4a] shadow-[2px_2px_0_#1d1a4a]">
                      <Symbol className="size-6" aria-hidden />
                    </span>
                    <div>
                      <h3 className="font-bold">{String(title)}</h3>
                      <p className={`${soft} mt-1 text-sm leading-relaxed`}>
                        {String(description)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          <Link
            href="/world/my-work"
            className={`${panel} p-6 transition-transform motion-safe:hover:-translate-y-1`}
          >
            <h2 className="text-xl font-bold">My Work</h2>
            <p className={`${soft} mt-2 text-sm leading-relaxed`}>
              Resume drafts, read feedback and download projects and earned
              certificates.
            </p>
          </Link>
          <Link
            href="/games/world?map=city"
            className={`${panel} p-6 transition-transform motion-safe:hover:-translate-y-1`}
          >
            <h2 className="text-xl font-bold">Explore the city</h2>
            <p className={`${soft} mt-2 text-sm leading-relaxed`}>
              Enter the existing playable city with your account. The lesson
              also works directly from a teacher’s link.
            </p>
          </Link>
          <Link
            href="/school"
            className={`${panel} p-6 transition-transform motion-safe:hover:-translate-y-1`}
          >
            <h2 className="text-xl font-bold">Your class</h2>
            <p className={`${soft} mt-2 text-sm leading-relaxed`}>
              Join your class and open the mission your teacher assigned.
            </p>
          </Link>
        </div>
      </section>
      <SupplementalResources product="world" />
    </div>
  );
}
