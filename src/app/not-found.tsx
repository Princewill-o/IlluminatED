import Link from "next/link";

import { Mascot } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="container grid items-end gap-10 pt-16 md:grid-cols-[1fr_260px]">
      <div className="pb-16">
        <p className="text-muted-foreground text-sm">Error 404</p>
        <h1 className="mt-2 text-4xl tracking-tight md:text-5xl">
          We can't find that page
        </h1>
        <p className="text-muted-foreground mt-4 max-w-lg text-lg">
          It may have moved, or the link might be wrong. Try the course list
          instead.
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/courses">Browse courses</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Go to the homepage</Link>
          </Button>
        </div>
      </div>
      <div className="mx-auto w-48 overflow-hidden rounded-t-3xl bg-[#efe3cc] md:w-full dark:bg-[#2a2317]">
        <Mascot className="mx-auto mt-6 w-[88%]" sizes="260px" />
      </div>
    </section>
  );
}
