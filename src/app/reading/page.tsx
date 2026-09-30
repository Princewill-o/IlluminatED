import type { Metadata } from "next";

import { PageHeader } from "@/components/kit";
import { BookSearch, WikiLookup } from "@/components/reading-lookup";

export const metadata: Metadata = {
  title: "Background reading",
  description:
    "Quick topic summaries from Wikipedia and book search from Open Library.",
};

export default function ReadingPage() {
  return (
    <>
      <PageHeader
        title="Background reading"
        intro="A quick overview of a topic, or a book to read around your subject. Good for context. Your course materials still decide what you need to know."
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Resources", href: "/resources" },
          { label: "Background reading" },
        ]}
      />
      <div className="container grid gap-14 py-12 lg:grid-cols-2">
        <section aria-labelledby="wiki-h">
          <h2 id="wiki-h" className="mb-4 text-2xl tracking-tight">
            Topic summary
          </h2>
          <WikiLookup />
        </section>
        <section aria-labelledby="book-h">
          <h2 id="book-h" className="mb-4 text-2xl tracking-tight">
            Find a book
          </h2>
          <BookSearch />
        </section>
      </div>
    </>
  );
}
