"use client";

import Link from "next/link";

import { Mascot } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="container grid items-end gap-10 pt-16 md:grid-cols-[1fr_260px]">
      <div className="pb-16">
        <p className="text-muted-foreground text-sm">Something went wrong</p>
        <h1 className="mt-2 text-4xl tracking-tight md:text-5xl">
          Sorry, that didn't load
        </h1>
        <p className="text-muted-foreground mt-4 max-w-lg text-lg">
          It's not something you did. Try again, and if it keeps happening, head
          back to the homepage and come back in a few minutes.
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          <Button type="button" onClick={() => reset()}>
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Go to the homepage</Link>
          </Button>
        </div>
        {error.digest && (
          <p className="text-muted-foreground mt-6 text-xs">
            Error code: {error.digest}
          </p>
        )}
      </div>
      <div className="mx-auto w-48 overflow-hidden rounded-t-3xl bg-[#efe3cc] md:w-full dark:bg-[#2a2317]">
        <Mascot className="mx-auto mt-6 w-[88%]" sizes="260px" />
      </div>
    </section>
  );
}
