import type { Metadata } from "next";

import { Flashcards } from "@/components/flashcards";
import { PageHeader, Section } from "@/components/kit";
import { FLASHCARDS } from "@/lib/data/topics";

export const metadata: Metadata = {
  title: "Flashcards",
  description:
    "Key terms and quick-recall questions, with your progress saved in your browser.",
};

export default function FlashcardsPage() {
  return (
    <>
      <PageHeader
        title="Flashcards"
        intro={`${FLASHCARDS.length} cards made from our topic guides. Answer in your head, flip the card, and be honest about whether you knew it.`}
        crumbs={[{ label: "Home", href: "/" }, { label: "Flashcards" }]}
      />
      <Section rule={false}>
        <Flashcards />
      </Section>
    </>
  );
}
