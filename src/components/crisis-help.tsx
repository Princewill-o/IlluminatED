import { ExternalLink } from "@/components/kit";
import { cn } from "@/lib/utils";

export const HELPLINES = [
  {
    name: "Childline",
    how: (
      <>
        Call <a href="tel:08001111">0800 1111</a> or chat at{" "}
        <ExternalLink href="https://www.childline.org.uk/">
          childline.org.uk
        </ExternalLink>
      </>
    ),
    who: "For anyone under 19. Free, private, open 24 hours.",
  },
  {
    name: "Samaritans",
    how: (
      <>
        Call <a href="tel:116123">116 123</a>
      </>
    ),
    who: "For anyone who's struggling. Free, any time, day or night.",
  },
  {
    name: "Shout",
    how: (
      <>
        Text <strong>SHOUT</strong> to <a href="sms:85258">85258</a>
      </>
    ),
    who: "If you'd rather text than talk. Free, 24 hours.",
  },
  {
    name: "NSPCC Helpline",
    how: (
      <>
        Call <a href="tel:08088005000">0808 800 5000</a>
      </>
    ),
    who: "For adults worried about a child. Weekdays, 10am to 4pm.",
  },
  {
    name: "CEOP",
    how: (
      <ExternalLink href="https://www.ceop.police.uk/Safety-Centre/">
        ceop.police.uk
      </ExternalLink>
    ),
    who: "Report online sexual abuse or grooming to the police.",
  },
] as const;

/** Emergency number first, then UK helplines. Shown on the safeguarding page and after a safeguarding message. */
export function CrisisHelp({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-danger-soft rounded-xl p-5 text-sm leading-relaxed md:p-6",
        className,
      )}
    >
      <p className="text-base font-semibold">
        If you or someone else is in danger right now, call 999.
      </p>
      <p className="text-muted-foreground mt-1">
        Don't wait for us to reply. We read messages as soon as we can, but we
        aren't an emergency service.
      </p>
      <dl
        className={cn(
          "mt-5 grid gap-x-8 gap-y-4 [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-4",
          !compact && "sm:grid-cols-2",
        )}
      >
        {HELPLINES.map((h) => (
          <div key={h.name}>
            <dt className="font-semibold">{h.name}</dt>
            <dd className="mt-0.5">{h.how}</dd>
            <dd className="text-muted-foreground">{h.who}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
