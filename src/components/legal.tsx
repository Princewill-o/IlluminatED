import Link from "next/link";

import { PageHeader, Section } from "@/components/kit";
import { CONTACT_EMAIL, LEGAL_LAST_UPDATED } from "@/lib/site";
import { cn } from "@/lib/utils";

/** Header, "last updated" line, optional summary box, then readable body text. */
export function LegalPage({
  title,
  intro,
  crumb,
  summary,
  toc,
  children,
}: {
  title: string;
  intro: string;
  crumb: string;
  summary?: React.ReactNode;
  toc?: { id: string; label: string }[];
  children: React.ReactNode;
}) {
  return (
    <>
      <PageHeader
        title={title}
        intro={intro}
        crumbs={[{ label: "Home", href: "/" }, { label: crumb }]}
      >
        <p className="text-muted-foreground text-sm">
          Last updated {LEGAL_LAST_UPDATED}
        </p>
      </PageHeader>
      <Section rule={false}>
        <div
          className={cn(
            "grid gap-14",
            toc && "lg:grid-cols-[minmax(0,1fr)_240px]",
          )}
        >
          <div className="max-w-3xl">
            {summary && (
              <div className="bg-secondary mb-12 rounded-xl p-5 md:p-6">
                <h2 className="text-lg font-semibold">Plain-English summary</h2>
                <div className="mt-3 text-sm leading-relaxed [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5">
                  {summary}
                </div>
              </div>
            )}
            <div className={proseCls}>{children}</div>
          </div>
          {toc && (
            <nav aria-label="On this page" className="hidden text-sm lg:block">
              <div className="sticky top-24">
                <p className="text-muted-foreground mb-3 font-medium">
                  On this page
                </p>
                <ol className="space-y-2">
                  {toc.map((t) => (
                    <li key={t.id}>
                      <a
                        href={`#${t.id}`}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {t.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            </nav>
          )}
        </div>
      </Section>
    </>
  );
}

const proseCls = cn(
  "leading-relaxed",
  "[&_h2]:mt-12 [&_h2]:scroll-mt-24 [&_h2]:text-2xl [&_h2]:tracking-tight first:[&_h2]:mt-0",
  "[&_h3]:mt-6 [&_h3]:font-semibold",
  "[&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5",
  "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4",
  "[&_table]:mt-4 [&_table]:w-full [&_table]:text-sm [&_td]:border-t [&_td]:py-2.5 [&_td]:pr-4 [&_td]:align-top [&_th]:pb-2 [&_th]:pr-4 [&_th]:text-left [&_th]:font-semibold",
);

/** "Use our contact form" or the email address, when one is set. */
export function HowToContact({ topic }: { topic?: string }) {
  const href = topic ? `/contact?topic=${topic}` : "/contact";
  return CONTACT_EMAIL ? (
    <>
      use our <Link href={href}>contact form</Link> or email{" "}
      <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
    </>
  ) : (
    <>
      use our <Link href={href}>contact form</Link>
    </>
  );
}
