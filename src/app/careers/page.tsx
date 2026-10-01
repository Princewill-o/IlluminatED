import type { Metadata } from "next";

import { CareersExplorer } from "@/components/careers-explorer";
import { ExternalLink, PageHeader, Section } from "@/components/kit";
import { OGL_URL } from "@/lib/apprenticeships";

export const metadata: Metadata = {
  title: "Careers and apprenticeships",
  description:
    "Explore apprenticeships by job, level and route, with what you'd do and learn, from Skills England's official standards.",
};

const ROUTES = [
  {
    title: "T Levels",
    body: "Two-year technical courses after GCSEs, equal to three A levels, with an industry placement of at least 45 days.",
    href: "https://www.gov.uk/government/publications/introduction-of-t-levels",
    link: "Introduction to T Levels on GOV.UK",
  },
  {
    title: "Apprenticeships",
    body: "A paid job with training, from age 16. You spend at least some of your working time learning, and the training is free for you.",
    href: "https://www.gov.uk/become-apprentice",
    link: "Become an apprentice on GOV.UK",
  },
  {
    title: "University",
    body: "Degrees usually take three or four years. Apply through UCAS, and check what student finance you can get for fees and living costs.",
    href: "https://www.gov.uk/student-finance",
    link: "Student finance on GOV.UK",
  },
];

export default function CareersPage() {
  return (
    <>
      <PageHeader
        title="Careers and apprenticeships"
        intro="Search every apprenticeship in England by job, level and route. Each one shows the role, the duties, and what you'd learn."
        crumbs={[{ label: "Home", href: "/" }, { label: "Careers" }]}
      />
      <Section rule={false} title="Your options after GCSEs and A levels">
        <ul className="grid gap-8 md:grid-cols-3">
          {ROUTES.map((r) => (
            <li key={r.title}>
              <h3 className="font-semibold">{r.title}</h3>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {r.body}
              </p>
              <p className="mt-2 text-sm">
                <ExternalLink href={r.href}>{r.link}</ExternalLink>
              </p>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground mt-6 text-sm">
          In England you must stay in education or training until you&apos;re
          18, which can be sixth form, college, an apprenticeship, or part-time
          study alongside work or volunteering.{" "}
          <ExternalLink
            href="https://www.gov.uk/know-when-you-can-leave-school"
            className="text-sm"
          >
            When you can leave school
          </ExternalLink>
        </p>
      </Section>
      <Section
        id="explore"
        title="Explore apprenticeships"
        intro="Levels 2 and 3 are like GCSEs and A levels; levels 4 and 5 are higher apprenticeships; levels 6 and 7 are degree apprenticeships."
      >
        <CareersExplorer />
        <p className="text-muted-foreground mt-8 text-xs">
          Contains public sector information from{" "}
          <ExternalLink
            href="https://skillsengland.education.gov.uk/apprenticeships/"
            className="text-xs"
          >
            Skills England
          </ExternalLink>
          , licensed under the{" "}
          <ExternalLink href={OGL_URL} className="text-xs">
            Open Government Licence v3.0
          </ExternalLink>
          . To apply for a vacancy, use{" "}
          <ExternalLink
            href="https://www.findapprenticeship.service.gov.uk/"
            className="text-xs"
          >
            Find an apprenticeship
          </ExternalLink>
          .
        </p>
      </Section>
    </>
  );
}
