
import Link from "next/link";
import { notFound } from "next/navigation";

import type { Metadata } from "next";

import { HomeworkRunner } from "@/components/school/school";
import { requireAccount } from "@/lib/account/server";
import { loadMyHomework } from "@/lib/school/server";

export const metadata: Metadata = { title: "Homework" };

export default async function HomeworkItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await requireAccount(`/homework/${id}`);
  const hw = (await loadMyHomework(account.id)).find((h) => h.id === id);
  if (!hw) notFound();
  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-16">
      <Link href="/homework" className="text-sm font-bold text-primary">
        ← Homework
      </Link>
      <p className="mt-4 text-xs font-black tracking-[0.3em] text-muted-foreground uppercase">{hw.className}</p>
      <h1 className="mt-1 text-3xl font-black tracking-tight md:text-4xl">{hw.title}</h1>
      <p className="mt-1 text-muted-foreground">
        Due {new Date(hw.dueAt).toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" })}
      </p>
      {hw.instructions && <p className="mt-4 rounded-2xl bg-secondary p-4 leading-7">{hw.instructions}</p>}
      <div className="mt-6">
        <HomeworkRunner id={hw.id} questions={hw.questions} previous={hw.mine} />
      </div>
    </div>
  );
}
