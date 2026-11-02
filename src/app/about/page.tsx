import Link from "next/link";

import type { Metadata } from "next";

import { CorrectionForm } from "@/components/correction-form";
import { ExternalLink, PageHeader, Section } from "@/components/kit";

export const metadata: Metadata = {
  title: "About",
  description:
    "What IlluminatED covers, where its content comes from, and how to report a mistake.",
};

const HOW = [
  {
    t: "What we cover",
    d: "GCSE (especially Year 11), A level, BTEC, T Levels and other Level 2 and 3 courses, mainly as taught in England. We also link to the boards used in Wales and Northern Ireland.",
  },
  {
    t: "Where the content comes from",
    d: "Topic guides and quiz questions are written by us, and each shows when it was last reviewed. Specifications, papers and mark schemes stay on the exam boards' own sites. We link to them rather than copying them.",
  },
  {
    t: "Live information",
    d: "Qualification details come from Ofqual's public register and statistics from the Department for Education. Background reading comes from Wikipedia and Open Library. Each result shows its source and when it was fetched.",
  },
  {
    t: "How quiz scores work",
    d: "Your score counts answers you got right first time. Retrying helps you learn but doesn't change the score. Scores are for practice, not predicted grades.",
  },
  {
    t: "Finding your exam board",
    d: "Ask your teacher, or look at the front page of a mock or past paper from school. Then use the qualification search to find the exact specification.",
  },
  {
    t: "Accounts",
    d: "Anyone aged 13+ can sign up for free. Core study is free; paid plans are optional. Schools and colleges agree licences separately. See our access and pricing page for details.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="About IlluminatED"
        intro="A learning game connecting subject practice, workplace simulations and saved progress. Sign up free, or discuss a school pilot."
        crumbs={[{ label: "Home", href: "/" }, { label: "About" }]}
      />
      <Section rule={false}>
        <dl className="grid gap-x-12 gap-y-10 md:grid-cols-2">
          {HOW.map((h) => (
            <div key={h.t}>
              <dt className="font-semibold">{h.t}</dt>
              <dd className="text-muted-foreground mt-2 leading-relaxed">
                {h.d}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-muted-foreground mt-12 max-w-3xl text-sm leading-relaxed">
          IlluminatED isn't connected to or endorsed by AQA, Pearson, OCR,
          WJEC/Eduqas, CCEA, NCFE, City & Guilds, Ofqual or the Department for
          Education. More in the{" "}
          <Link className="underline underline-offset-4" href="/faq">
            FAQ
          </Link>
          ,{" "}
          <Link className="underline underline-offset-4" href="/your-data">
            Your data
          </Link>
          ,{" "}
          <Link className="underline underline-offset-4" href="/privacy">
            privacy policy
          </Link>{" "}
          and our{" "}
          <Link className="underline underline-offset-4" href="/accessibility">
            accessibility statement
          </Link>
          .
        </p>
      </Section>
      <Section
        id="corrections"
        title="Report a mistake"
        intro="If something's wrong or out of date, tell us. A link to the right page of your specification helps us fix it quickly."
      >
        <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
          <CorrectionForm />
          <div className="text-muted-foreground space-y-4 text-sm leading-relaxed">
            <p>
              We check every report against the awarding body's documents before
              changing anything, then update the page's review date.
            </p>
            <p>
              If the problem is in an exam board's own document, contact the
              board directly, for example{" "}
              <ExternalLink href="https://www.aqa.org.uk/">AQA</ExternalLink>,{" "}
              <ExternalLink href="https://qualifications.pearson.com/">
                Pearson
              </ExternalLink>{" "}
              or <ExternalLink href="https://www.ocr.org.uk/">OCR</ExternalLink>
              .
            </p>
          </div>
        </div>
      </Section>
      <Section id="credits" title="Art credits">
        <p className="text-muted-foreground max-w-2xl leading-relaxed">
          The city, buildings, vehicles, trees and characters in IlluminatED&apos;s game world are built from{" "}
          <ExternalLink href="https://kenney.nl">Kenney</ExternalLink>&apos;s free CC0 3D kits (City Kit Commercial,
          City Kit Suburban, City Kit Roads and Nature Kit), rendered and styled by our team. Thank you, Kenney.
        </p>
        <p className="text-muted-foreground mt-4 max-w-2xl leading-relaxed">
          Selected shops and offices are adapted from <ExternalLink href="https://sketchfab.com/3d-models/low-poly-city-pack-c693dae1fe06403ea1e0bcf4e9db108a">Low Poly City-Pack by medmgames</ExternalLink> and <ExternalLink href="https://sketchfab.com/3d-models/low-poly-city-game-ready-c7e3a158515c4e9da31ae52c30403cef">Low Poly City Game-Ready by costoWRLD</ExternalLink>, licensed under <ExternalLink href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</ExternalLink>. We extracted individual buildings and adjusted their scale and signs.
        </p>
        <p className="text-muted-foreground mt-4 max-w-2xl leading-relaxed">
          Player characters and residents use Popyca&apos;s <ExternalLink href="https://creativecommons.org/publicdomain/zero/1.0/">CC0 Blocky Characters free samples</ExternalLink>. Motor cars use Quaternius&apos; Realistic Car Pack, converted to GLB and adapted to the city&apos;s driving scale.
        </p>
        <p className="text-muted-foreground mt-4 max-w-2xl leading-relaxed">
          Office furniture is adapted from the 3D Voxel Office Pack by <ExternalLink href="https://twitter.com/EggnCheesePls">MariaIsMe / Maria Is Me</ExternalLink> under CC BY 4.0. Hospital furniture is adapted from Hospital Assets by <ExternalLink href="https://atomicrealm.itch.io">Atomic Realm</ExternalLink>, used under the supplied asset licence.
        </p>
        <p className="text-muted-foreground mt-4 max-w-2xl leading-relaxed">
          Controller UI Elements by <ExternalLink href="https://arks.itch.io/ps4-buttons">Mikkel Julian “Arks” Petersen / Arks @ScissorMarks</ExternalLink>.
        </p>
        <p className="text-muted-foreground mt-4 max-w-2xl leading-relaxed">
          Instrumental recordings by isaiah658, Igor Gundarev and Abstraction / Tallbeard Studios (Ben Burnes), released under CC0. <ExternalLink href="/audio/credits.json">Track credits and original source links</ExternalLink>.
        </p>
      </Section>
    </>
  );
}
