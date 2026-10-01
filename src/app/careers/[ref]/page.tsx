import Link from "next/link";
import { notFound } from "next/navigation";

import type { Metadata } from "next";

import {
  Callout,
  ExternalLink,
  Note,
  PageHeader,
  Section,
} from "@/components/kit";
import {
  OGL_URL,
  STANDARD_REF,
  type StandardDetail,
  levelLabel,
} from "@/lib/apprenticeships";
import { getStandard } from "@/lib/server/skills-england";

type Params = { params: Promise<{ ref: string }> };

/** The standard, or null if Skills England couldn't be reached. Unknown references 404. */
async function load(ref: string): Promise<StandardDetail | null> {
  if (!STANDARD_REF.test(ref)) notFound();
  let s: StandardDetail | null | undefined;
  try {
    s = await getStandard(ref);
  } catch {
    return null;
  }
  if (!s) notFound();
  return s;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { ref } = await params;
  if (!STANDARD_REF.test(ref)) return {};
  const s = await getStandard(ref).catch(() => null);
  return s
    ? { title: `${s.title} apprenticeship`, description: s.overview }
    : {};
}

function List({
  title,
  items,
  total,
  noun,
}: {
  title: string;
  items: string[];
  total: number;
  noun: string;
}) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <ul className="text-muted-foreground mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
      {total > items.length && (
        <p className="text-muted-foreground mt-2 text-xs">
          Showing {items.length} of {total} {noun}.
        </p>
      )}
    </div>
  );
}

export default async function StandardPage({ params }: Params) {
  const { ref } = await params;
  const s = await load(ref.toUpperCase());
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Careers", href: "/careers" },
    { label: s ? s.title : ref.toUpperCase() },
  ];

  if (!s)
    return (
      <>
        <PageHeader title="Apprenticeship" crumbs={crumbs} />
        <Section rule={false}>
          <Callout tone="warn" title="We couldn't reach Skills England">
            Try again in a few minutes, or{" "}
            <a
              href={`https://skillsengland.education.gov.uk/apprenticeship-standards/${ref.toLowerCase()}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              open this apprenticeship on the Skills England website
            </a>
            .
          </Callout>
        </Section>
      </>
    );

  const funding =
    s.maxFunding !== null
      ? s.maxFunding.toLocaleString("en-GB", {
          style: "currency",
          currency: "GBP",
          maximumFractionDigits: 0,
        })
      : null;

  return (
    <>
      <PageHeader title={s.title} intro={s.overview} crumbs={crumbs}>
        <dl className="grid max-w-3xl gap-x-10 gap-y-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">Level</dt>
            <dd className="font-medium">{levelLabel(s.level)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Route</dt>
            <dd className="font-medium">{s.route || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Typical length</dt>
            <dd className="font-medium">
              {s.duration !== null ? `${s.duration} months` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="font-medium">{s.status || "—"}</dd>
          </div>
        </dl>
        <p className="text-muted-foreground mt-3 text-sm">
          Reference {s.ref}
          {s.version && `, version ${s.version}`}
          {funding &&
            ` · Government funding for the training up to ${funding} (paid to the employer and provider, not a wage)`}
        </p>
      </PageHeader>

      {!s.open && (
        <Section rule={false} className="pb-0">
          <Note tone="warn">
            This apprenticeship isn&apos;t currently taking new starts. Look for
            a newer or similar one in the{" "}
            <Link href="/careers">apprenticeship search</Link>.
          </Note>
        </Section>
      )}

      <Section id="role" title="The job">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-4">
            {s.summary && (
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {s.summary}
              </p>
            )}
            {s.jobTitles.length > 0 && (
              <p className="text-sm">
                <span className="font-semibold">Typical job titles: </span>
                <span className="text-muted-foreground">
                  {s.jobTitles.join(", ")}
                </span>
              </p>
            )}
          </div>
          <List
            title="Main duties"
            items={s.duties}
            total={s.counts.duties}
            noun="duties"
          />
        </div>
      </Section>

      <Section id="ksb" title="What you'd learn">
        <div className="grid gap-10 lg:grid-cols-3">
          <List
            title="Knowledge"
            items={s.knowledge}
            total={s.counts.knowledge}
            noun="knowledge points"
          />
          <List
            title="Skills"
            items={s.skills}
            total={s.counts.skills}
            noun="skills"
          />
          <List
            title="Behaviours"
            items={s.behaviours}
            total={s.counts.behaviours}
            noun="behaviours"
          />
        </div>
      </Section>

      <Section id="entry" title="Entry requirements">
        <div className="max-w-3xl space-y-4">
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
            {s.entryRequirements ||
              "Skills England doesn't set entry requirements for this apprenticeship. Each employer decides its own, so check the vacancy."}
          </p>
          {s.englishAndMaths && (
            <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
              {s.englishAndMaths}
            </p>
          )}
          <p className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <ExternalLink href={s.pageUrl}>
              Full standard on Skills England
            </ExternalLink>
            <ExternalLink href="https://www.findapprenticeship.service.gov.uk/">
              Find an apprenticeship vacancy
            </ExternalLink>
          </p>
        </div>
        <p className="text-muted-foreground mt-10 text-xs">
          Contains public sector information from Skills England, licensed under
          the{" "}
          <ExternalLink href={OGL_URL} className="text-xs">
            Open Government Licence v3.0
          </ExternalLink>
          .
        </p>
      </Section>
    </>
  );
}
