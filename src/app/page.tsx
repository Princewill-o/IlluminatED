import Link from "next/link";

import { AppPreview } from "@/components/app-preview";
import { Mascot } from "@/components/brand";
import { LinkList, Section } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { QuizOfTheDay, RecentlyViewed } from "@/components/widgets";
import { coursesByRoute } from "@/lib/data/courses";
import { ROUTES } from "@/lib/data/routes";
import { TOPICS } from "@/lib/data/topics";

const START_TOPICS = [
  "gcse-maths-percentages",
  "gcse-bio-cells",
  "gcse-chem-atomic-structure",
  "gcse-phys-forces",
  "alevel-maths-differentiation",
  "btec-hsc-care-values",
];

const TOOLS = [
  {
    heading: "Practise",
    links: [
      {
        href: "/quizzes",
        title: "Quiz centre",
        text: "Short rounds with an explanation for every answer.",
      },
      {
        href: "/flashcards",
        title: "Flashcards",
        text: "Key terms and quick-recall questions.",
      },
    ],
  },
  {
    heading: "Plan",
    links: [
      {
        href: "/revision",
        title: "Revision planner",
        text: "Plan short sessions and add them to your calendar.",
      },
      {
        href: "/revision#sheets",
        title: "Study sheets",
        text: "Printable notes for every topic.",
      },
    ],
  },
  {
    heading: "Look it up",
    links: [
      {
        href: "/resources",
        title: "Past papers and specifications",
        text: "Straight to each exam board's own pages.",
      },
      {
        href: "/qualifications",
        title: "Qualification search",
        text: "Find your exact course on the Ofqual register.",
      },
      {
        href: "/library",
        title: "Free learning sites",
        text: "Simulations, explainers and courses we rate.",
      },
    ],
  },
  {
    heading: "Get help from people",
    links: [
      {
        href: "/social",
        title: "IlluminatEDSocial",
        text: "Ask students about sixth form, universities and apprenticeships.",
      },
      {
        href: "/social/universities",
        title: "University threads",
        text: "Find what people say about a particular university.",
      },
      {
        href: "/tutors",
        title: "Get a tutor",
        text: "One-to-one help with homework, coursework or exam prep.",
      },
    ],
  },
];

export default function Home() {
  const topics = START_TOPICS.map(
    (id) => TOPICS.find((t) => t.id === id)!,
  ).filter(Boolean);
  return (
    <>
      <section className="container grid items-end gap-10 pt-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:pt-16">
        <div className="pb-4 lg:pb-16">
          <h1 className="text-[2.6rem] leading-[1.05] tracking-tight text-balance md:text-6xl">
            Revision help for the course you're actually taking.
          </h1>
          <p className="text-muted-foreground mt-6 max-w-xl text-lg leading-relaxed">
            Topic guides, practice questions and direct links to official past
            papers for GCSE, A level, BTEC, T Levels and other Level 2 and 3
            courses. Free to use, with an optional account for progress tracking
            and tutors.
          </p>
          <form
            action="/courses"
            method="get"
            role="search"
            className="mt-8 flex max-w-lg gap-2"
          >
            <label htmlFor="home-q" className="sr-only">
              Search for a subject or course
            </label>
            <input
              id="home-q"
              name="q"
              placeholder="Search a subject, e.g. chemistry"
              className="bg-card border-input focus-visible:ring-ring h-12 min-w-0 flex-1 rounded-md border px-4 text-base outline-none focus-visible:ring-2"
            />
            <Button type="submit" size="lg" className="h-12 px-5">
              Search
            </Button>
          </form>
          <p className="text-muted-foreground mt-5 text-sm">
            Or go straight to{" "}
            {ROUTES.map((r, i) => (
              <span key={r.id}>
                <Link
                  href={r.href}
                  className="text-foreground decoration-foreground/25 hover:decoration-foreground font-medium underline underline-offset-4"
                >
                  {r.name}
                </Link>
                {i < ROUTES.length - 2
                  ? ", "
                  : i === ROUTES.length - 2
                    ? " or "
                    : "."}
              </span>
            ))}
          </p>
        </div>
        <div className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-t-[2rem] bg-[#efe3cc] dark:bg-[#2a2317]">
          <Mascot
            priority
            className="relative mx-auto mt-8 w-[88%]"
            sizes="(min-width: 1024px) 370px, 80vw"
          />
        </div>
      </section>
      <div className="border-b" />

      <Section
        id="courses"
        title="Choose your qualification"
        rule={false}
        className="pt-14"
      >
        <LinkList
          items={ROUTES.map((r) => ({
            href: r.href,
            title: r.name,
            description: r.description,
            meta: `${r.years} · ${coursesByRoute(r.id).length} courses`,
          }))}
        />
      </Section>

      <Section id="practice" title="A few minutes of practice">
        <RecentlyViewed />
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <QuizOfTheDay />
          <div>
            <h3 className="text-muted-foreground mb-2 text-sm font-medium">
              Good topics to start with
            </h3>
            <LinkList
              items={topics.map((t) => ({
                href: `/courses/${t.courseId}/${t.id}`,
                title: t.title,
              }))}
            />
          </div>
        </div>
      </Section>

      <Section id="tools" title="Everything else">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map((g) => (
            <div key={g.heading}>
              <h3 className="text-muted-foreground text-sm font-medium">
                {g.heading}
              </h3>
              <ul className="mt-3 space-y-4">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="decoration-foreground/20 hover:decoration-foreground font-semibold underline underline-offset-4"
                    >
                      {l.title}
                    </Link>
                    <p className="text-muted-foreground mt-0.5 text-sm">
                      {l.text}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <AppPreview />
    </>
  );
}
