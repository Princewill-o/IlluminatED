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

export const metadata: Metadata = {
  title: { absolute: "IllumWorld | Virtual work experience" },
  description:
    "Explore a careers city and complete a Year 10 workplace project. Inspect devices, defend decisions and build a portfolio in IllumWorld.",
};
export default async function IllumWorldHome() {
  return (
    <div className="bg-background text-foreground">
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:py-24">
        <div>
          <p className="text-primary text-sm font-bold tracking-[0.18em] uppercase">
            IllumWorld · Virtual work experience
          </p>
          <h1 className="mt-5 text-5xl leading-[1.06] font-black tracking-tight sm:text-6xl">
            Step into a workplace.
            <br />
            <span className="text-primary">Make a real decision.</span>
          </h1>
          <p className="text-muted-foreground mt-6 max-w-xl text-lg leading-relaxed">
            A careers city where pupils practise the judgement, calculations and
            communication that a workplace project needs. Start in the repair
            shop.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/world/tech-repair-trainee"
              className="bg-primary text-primary-foreground inline-flex min-h-12 items-center gap-2 rounded-xl px-6 py-3 font-bold"
            >
              Enter the repair shop{" "}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/world/pilot"
              className="inline-flex min-h-12 items-center rounded-xl border px-6 py-3 font-bold"
            >
              Plan a school lesson
            </Link>
          </div>
          <p className="text-muted-foreground mt-5 text-sm">
            Year 10 · 35–40 minutes · One complete assessed project
          </p>
        </div>
        <figure className="bg-card overflow-hidden rounded-3xl border">
          <Image
            src="/landing/world-street.webp"
            alt="A street in the existing IlluminatED careers city"
            width={1600}
            height={900}
            priority
            className="aspect-[4/3] w-full object-cover"
          />
          <figcaption className="flex items-center gap-2 p-4 text-sm">
            <Building2 className="text-primary size-5" aria-hidden />
            Your city is the setting. Your work is the outcome.
          </figcaption>
        </figure>
      </section>
      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <div className="bg-card rounded-3xl border p-6 sm:p-10">
          <p className="text-primary text-sm font-bold">Mission 01</p>
          <div className="mt-3 grid gap-8 md:grid-cols-[1.4fr_1fr]">
            <div>
              <h2 className="text-3xl font-black">Tech Repair Trainee</h2>
              <p className="text-muted-foreground mt-4 max-w-2xl leading-relaxed">
                A shop has three fictional phones to assess. Inspect the faults
                and costs, calculate expected profit, recommend repair, as-is
                sale or decline, then write a customer-facing report.
              </p>
              <p className="text-muted-foreground mt-4 leading-relaxed">
                Profit alone does not settle the decision. A suspected battery
                fault could use up a narrow margin. Explain which evidence
                supports your judgement and what is still unknown.
              </p>
              <Link
                href="/world/tech-repair-trainee"
                className="text-primary mt-6 inline-flex min-h-11 items-center gap-2 font-bold"
              >
                Start the mission <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/games/world?map=venture-hub"
                className="mt-3 block py-2 text-sm font-bold underline underline-offset-4"
              >
                Visit the repair workshop in the city (optional)
              </Link>
              <p className="text-muted-foreground mt-1 text-xs">
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
                    <Symbol
                      className="text-primary mt-1 size-6 shrink-0"
                      aria-hidden
                    />
                    <div>
                      <h3 className="font-bold">{String(title)}</h3>
                      <p className="text-muted-foreground mt-1 text-sm">
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
          <Link href="/world/my-work" className="rounded-2xl border p-6">
            <h2 className="text-xl font-bold">My Work</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Resume drafts, read feedback and download projects and earned
              certificates.
            </p>
          </Link>
          <Link href="/games/world?map=city" className="rounded-2xl border p-6">
            <h2 className="text-xl font-bold">Explore the city</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Enter the existing playable city with your account. The lesson
              also works directly from a teacher’s link.
            </p>
          </Link>
          <Link href="/school" className="rounded-2xl border p-6">
            <h2 className="text-xl font-bold">Your class</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Join your class and open the mission your teacher assigned.
            </p>
          </Link>
        </div>
      </section>
      <SupplementalResources product="world" />
    </div>
  );
}
