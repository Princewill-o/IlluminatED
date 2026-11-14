import Link from "next/link";
import { redirect } from "next/navigation";

import { ContentForm, ContentReviewForm } from "@/components/learning-school/forms";
import { getSupabase, getViewer } from "@/lib/social/server";

export const metadata = { title: "Content review · IlluminatED Learning", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ContentReview() {
  const viewer = await getViewer();
  const sb = await getSupabase();
  if (!viewer || !sb) redirect("/sign-in?next=/school/content");
  if ((await sb.rpc("platform_admin_status")).data !== true) redirect("/school");
  const { data, error } = await sb.from("learning_content_review").select("*").order("created_at", { ascending: false }).limit(100);
  const entries = (data ?? []) as { id: string; product: string; kind: string; title: string; topic: string; exam_board: string | null; board_verified: boolean; body: string; answer_explanation: string | null; source_url: string | null; status: string; review_notes: string | null }[];
  return <div className="mx-auto max-w-7xl px-5 py-10"><Link href="/school" className="text-sm font-semibold underline">← School dashboard</Link><h1 className="mt-6 text-4xl font-bold">Content review</h1><p className="mt-4 max-w-3xl leading-7 text-muted-foreground">Prepare resources, questions and mission briefs in one editorial registry. Every new entry starts as a draft. Marking a resource Reviewed publishes a reusable reading page in its product. Questions and mission briefs stay in the editorial workflow until they are integrated into a marked topic pack or playable mission.</p><div className="mt-9 grid items-start gap-8 lg:grid-cols-[1fr_1.2fr]"><ContentForm /><section><h2 className="text-2xl font-bold">Review queue</h2>{error && <p role="alert" className="mt-4">The review queue could not be loaded. Please try again.</p>}<div className="mt-4 space-y-4">{entries.map((entry) => <details key={entry.id} className="rounded-2xl border bg-card p-5"><summary className="cursor-pointer font-bold">{entry.title}<span className="ml-2 text-sm font-normal text-muted-foreground">{entry.status}</span></summary><p className="mt-3 text-xs font-semibold uppercase tracking-wide text-primary">{entry.product} · {entry.kind} · {entry.topic}</p><p className="mt-2 text-sm text-muted-foreground">{entry.exam_board ? `${entry.exam_board} · ${entry.board_verified ? "mapping verified" : "mapping not verified"}` : "No exam board mapping claimed"}</p><p className="mt-4 whitespace-pre-wrap text-sm leading-6">{entry.body}</p>{entry.answer_explanation && <div className="mt-4 rounded-xl bg-muted p-4"><h3 className="text-sm font-bold">Answer and explanation</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{entry.answer_explanation}</p></div>}{entry.source_url && /^https:\/\//.test(entry.source_url) && <a href={entry.source_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm underline">Source reference</a>}{entry.status === "reviewed" && entry.kind === "resource" && <Link href={`/learning-resources/${entry.id}`} className="mt-3 block text-sm font-semibold underline">Open published resource</Link>}<ContentReviewForm id={entry.id} status={entry.status} notes={entry.review_notes ?? ""} /></details>)}{!entries.length && !error && <p className="rounded-2xl border p-5 text-sm text-muted-foreground">No drafts yet. Add the first resource or question.</p>}</div></section></div></div>;
}
