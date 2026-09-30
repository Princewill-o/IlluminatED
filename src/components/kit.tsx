import Link from "next/link";

import { ArrowRight, ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

/** Standard page header: breadcrumb, title, one line of intro. */
export function PageHeader({
  title,
  intro,
  crumbs,
  children,
  aside,
}: {
  title: React.ReactNode;
  intro?: React.ReactNode;
  crumbs?: { label: string; href?: string }[];
  children?: React.ReactNode;
  /** Optional illustration shown to the right on wider screens. */
  aside?: React.ReactNode;
}) {
  return (
    <header className="border-b">
      <div
        className={cn(
          "container pt-10 pb-10 lg:pt-14 lg:pb-12",
          aside && "grid items-end gap-8 md:grid-cols-[1fr_auto]",
        )}
      >
        <div>
          {crumbs && <Crumbs items={crumbs} />}
          <h1 className="max-w-3xl text-4xl tracking-tight text-balance md:text-5xl">
            {title}
          </h1>
          {intro && (
            <div className="text-muted-foreground mt-4 max-w-2xl text-lg leading-relaxed">
              {intro}
            </div>
          )}
          {children && <div className="mt-6">{children}</div>}
        </div>
        {aside && <div className="hidden md:block">{aside}</div>}
      </div>
    </header>
  );
}

export function Crumbs({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5">
      <ol className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm">
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden>/</span>}
            {c.href ? (
              <Link href={c.href} className="hover:text-foreground">
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-foreground">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Section({
  title,
  intro,
  children,
  id,
  className,
  action,
  rule = true,
}: {
  title?: React.ReactNode;
  intro?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
  className?: string;
  action?: React.ReactNode;
  /** Thin rule above the section heading. */
  rule?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn("container py-10 lg:py-14", className)}
      aria-labelledby={id && title ? `${id}-title` : undefined}
    >
      {(title || action) && (
        <div
          className={cn(
            "mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-2",
            rule && "border-foreground/80 border-t pt-5",
          )}
        >
          <div className="max-w-2xl">
            {title && (
              <h2
                id={id ? `${id}-title` : undefined}
                className="text-2xl tracking-tight md:text-[1.75rem]"
              >
                {title}
              </h2>
            )}
            {intro && <p className="text-muted-foreground mt-2">{intro}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** A quiet aside. Use sparingly, only when the learner needs to know. */
export function Note({
  children,
  className,
  tone = "default",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "warn";
}) {
  return (
    <div
      role="note"
      className={cn(
        "max-w-3xl border-l-2 py-0.5 pl-4 text-sm leading-relaxed [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-4",
        tone === "warn" ? "border-warm" : "border-primary/40",
        "text-muted-foreground [&_strong]:text-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Kept for the few places a coloured box helps (quiz feedback). */
export function Callout({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "warn" | "check";
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const cls = {
    info: "bg-secondary",
    warn: "bg-accent",
    check: "bg-success-soft",
  }[tone];
  return (
    <div className={cn("rounded-lg p-4 text-sm", cls, className)} role="note">
      {title && <p className="font-semibold">{title}</p>}
      <div className={cn(title && "mt-1", "[&_a]:underline")}>{children}</div>
    </div>
  );
}

export function Tag({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-muted-foreground inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ExternalLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const cls = cn(
    "text-primary inline-flex items-baseline gap-1 font-medium underline decoration-primary/30 underline-offset-4 hover:decoration-primary",
    className,
  );
  if (href.startsWith("/"))
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {children}
      <ArrowUpRight className="size-3.5 shrink-0 self-center" aria-hidden />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

export function SourceLine({
  items,
  className,
}: {
  items: { label: string; href?: string }[];
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs",
        className,
      )}
    >
      {items.map((i, n) =>
        i.href ? (
          <ExternalLink key={n} href={i.href} className="text-xs">
            {i.label}
          </ExternalLink>
        ) : (
          <span key={n}>{i.label}</span>
        ),
      )}
    </p>
  );
}

/** Container for interactive tools (quiz, flashcards, planner, search). */
export function Panel({
  children,
  className,
  as: As = "div",
}: {
  children?: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "aside" | "form";
}) {
  return (
    <As className={cn("bg-card rounded-xl border p-5 md:p-6", className)}>
      {children}
    </As>
  );
}

/** A divided list of links, the default way to present a set of pages. */
export function LinkList({
  items,
  columns = 1,
}: {
  items: { href: string; title: string; description?: string; meta?: string }[];
  columns?: 1 | 2;
}) {
  return (
    <ul
      className={cn(
        "border-t",
        columns === 2 && "md:grid md:grid-cols-2 md:gap-x-10",
      )}
    >
      {items.map((i) => (
        <li key={i.href} className="border-b">
          <Link
            href={i.href}
            className="group hover:bg-muted/60 -mx-3 flex items-start gap-4 rounded-md px-3 py-4 transition-colors"
          >
            <span className="min-w-0 flex-1">
              <span className="block font-semibold group-hover:underline group-hover:underline-offset-4">
                {i.title}
              </span>
              {i.description && (
                <span className="text-muted-foreground mt-0.5 block text-sm leading-relaxed">
                  {i.description}
                </span>
              )}
            </span>
            {i.meta && (
              <span className="text-muted-foreground hidden shrink-0 pt-0.5 text-sm sm:block">
                {i.meta}
              </span>
            )}
            <ArrowRight
              className="text-muted-foreground group-hover:text-foreground mt-1 size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function Empty({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed px-6 py-10 text-center">
      <p className="font-semibold">{title}</p>
      {children && (
        <div className="text-muted-foreground [&_a]:text-primary mx-auto mt-2 max-w-md text-sm [&_a]:underline">
          {children}
        </div>
      )}
    </div>
  );
}

export const fieldCls =
  "bg-background h-10 w-full rounded-md border border-input px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";
export const labelCls = "mb-1.5 block text-sm font-medium";
