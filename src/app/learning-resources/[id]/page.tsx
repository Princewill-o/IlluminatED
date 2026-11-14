import Link from "next/link";
import { notFound } from "next/navigation";

import type { Metadata } from "next";

import { PRODUCT_NAMES } from "@/lib/learning-school/catalogue";
import { loadReviewedResources } from "@/lib/learning-school/resources";

export const metadata: Metadata = { title: "Learning resource | IlluminatED Learning" };
export const dynamic = "force-dynamic";

export default async function ReviewedResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const resource = (await loadReviewedResources(null, id))[0];
  if (!resource) notFound();
  return <article className="mx-auto max-w-3xl px-5 py-12">
    <Link href={`/${resource.product}`} className="text-sm font-semibold underline">← {PRODUCT_NAMES[resource.product]}</Link>
    <p className="mt-8 text-sm font-semibold uppercase tracking-widest text-primary">{resource.topic}</p>
    <h1 className="mt-3 text-4xl font-bold tracking-tight">{resource.title}</h1>
    <p className="mt-4 text-sm leading-6 text-muted-foreground">Reviewed {new Date(resource.reviewed_at).toLocaleDateString("en-GB", { timeZone: "Europe/London" })}{resource.board_verified && resource.exam_board ? ` · ${resource.exam_board} mapping verified` : " · No exam-board mapping claimed"}</p>
    <div className="mt-8 whitespace-pre-wrap rounded-2xl border bg-card p-6 text-base leading-8 sm:p-8">{resource.body}</div>
    {resource.source_url && /^https:\/\//.test(resource.source_url) && <a href={resource.source_url} target="_blank" rel="noreferrer" className="mt-6 inline-block text-sm font-semibold underline">Source reference</a>}
    <p className="mt-8 text-sm text-muted-foreground">This supporting resource can be used independently or alongside a workplace mission.</p>
  </article>;
}
