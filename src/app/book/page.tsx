import { Check } from "lucide-react";
import type { Metadata } from "next";


import { BookForm } from "@/components/book/book-form";

export const metadata: Metadata = {
  title: "Book a demo",
  description: "See IlluminatED, the revision game for GCSE, A level, BTEC and T Level students, and set up access for your school, college or sixth form.",
};

const ORGS = new Set(["individual", "school", "college", "sixth-form"]);

export default async function BookPage({ searchParams }: { searchParams: Promise<{ for?: string }> }) {
  const sp = await searchParams;
  const initial = sp.for && ORGS.has(sp.for) ? (sp.for as "individual" | "school" | "college" | "sixth-form") : undefined;
  return (
    <div className="container max-w-6xl pt-10 pb-20 lg:pt-16">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
        <div>
          <p className="text-sm font-bold tracking-widest text-primary uppercase">Book a demo</p>
          <h1 className="mt-3 text-4xl leading-[1.05] tracking-tight text-balance md:text-5xl">See IlluminatED in action</h1>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            IlluminatED is built for students, schools, colleges and sixth forms. Access is set up after a short call, so we can match it to your learners and your
            courses.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              ["A 20-minute video call", "We walk you through London, jobs, homework and the teacher view."],
              ["Set up for your learners", "Courses, exam boards and classes ready from day one."],
              ["Pricing that fits", "Schools and colleges get bundle pricing, cheaper per learner than individual plans."],
            ].map(([t, d]) => (
              <li key={t} className="flex gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-4" aria-hidden />
                </span>
                <span>
                  <span className="block font-bold">{t}</span>
                  <span className="text-muted-foreground">{d}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-8 rounded-3xl bg-secondary p-5">
            <p className="font-bold">Already have an account?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your school or college has set you up, or we have.{" "}
              <a href="/sign-in" className="font-semibold text-primary underline">
                Log in here
              </a>
              .
            </p>
          </div>
        </div>
        <BookForm initialOrg={initial} />
      </div>
    </div>
  );
}
