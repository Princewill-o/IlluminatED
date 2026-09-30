import Link from "next/link";

import type { Metadata } from "next";

import { PageHeader, Section } from "@/components/kit";

export const metadata: Metadata = {
  title: "Accessibility",
  description: "How IlluminatED is built to work for every learner.",
};

const POINTS = [
  {
    t: "Keyboard",
    d: "Everything works with a keyboard. Every page starts with a “Skip to content” link. Quizzes use 1 to 4 to answer, Enter for next, S to skip and R to retry. Flashcards use Space to flip, K and R to mark, and the arrow keys to move.",
  },
  {
    t: "Screen readers",
    d: "Headings are in a logical order, form fields have labels, and search results and quiz feedback are announced as they appear.",
  },
  {
    t: "Colour and contrast",
    d: "Both themes aim to meet WCAG 2.2 AA contrast for text, and colour is never the only way something is shown.",
  },
  {
    t: "Motion",
    d: "Animations are switched off if your device is set to reduce motion.",
  },
  {
    t: "Zoom and small screens",
    d: "Pages reflow on phones and at 200% zoom or more.",
  },
];

export default function AccessibilityPage() {
  return (
    <>
      <PageHeader
        title="Accessibility"
        intro="We want IlluminatED to work for every learner. Here's what we've done, and how to tell us when something doesn't work."
        crumbs={[{ label: "Home", href: "/" }, { label: "Accessibility" }]}
      />
      <Section rule={false}>
        <dl className="max-w-3xl border-t">
          {POINTS.map((p) => (
            <div
              key={p.t}
              className="grid gap-1 border-b py-5 sm:grid-cols-[200px_1fr] sm:gap-8"
            >
              <dt className="font-semibold">{p.t}</dt>
              <dd className="text-muted-foreground leading-relaxed">{p.d}</dd>
            </div>
          ))}
        </dl>
        <p className="text-muted-foreground mt-8 max-w-3xl leading-relaxed">
          Sites we link to, such as exam boards, Wikipedia and Open Library,
          have their own accessibility. If something here doesn't work for you,
          please{" "}
          <Link
            className="text-foreground underline underline-offset-4"
            href="/about#corrections"
          >
            let us know
          </Link>
          .
        </p>
      </Section>
    </>
  );
}
