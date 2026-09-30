import type { Metadata } from "next";

import { LibraryBrowser } from "@/components/directories";
import { ExternalLink, PageHeader, Section } from "@/components/kit";
import { LIBRARY, LIBRARY_SOURCE } from "@/lib/data/library";

export const metadata: Metadata = {
  title: "Free learning sites",
  description:
    "Free simulations, explainers and courses for going beyond the textbook.",
};

export default function LibraryPage() {
  return (
    <>
      <PageHeader
        title="Free learning sites"
        intro={
          <>
            {LIBRARY.length} free sites for going beyond the textbook, picked
            from the education section of{" "}
            <ExternalLink href={LIBRARY_SOURCE.url}>FMHY</ExternalLink>. We left
            out anything for downloading paid courses or books, and anything not
            suited to school-age learners.
          </>
        }
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Resources", href: "/resources" },
          { label: "Free learning sites" },
        ]}
      />
      <Section rule={false}>
        <LibraryBrowser />
      </Section>
    </>
  );
}
