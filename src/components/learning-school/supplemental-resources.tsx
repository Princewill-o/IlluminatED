import Link from "next/link";

import { type LearningProduct } from "@/lib/learning-school/catalogue";
import { loadReviewedResources } from "@/lib/learning-school/resources";

/** Reuses published resources wherever their product needs supporting material. */
export async function SupplementalResources({ product }: { product: LearningProduct }) {
  const resources = await loadReviewedResources(product);
  if (!resources.length) return null;
  return <section className="mx-auto mt-12 w-full max-w-6xl px-5" aria-labelledby={`${product}-supporting-resources`}>
    <h2 id={`${product}-supporting-resources`} className="text-2xl font-bold">More learning resources</h2>
    <p className="mt-3 text-sm text-muted-foreground">Reviewed reading guides to support your work. Open a resource without losing your current draft.</p>
    <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{resources.map((resource) => <li key={resource.id}>
      <Link href={`/learning-resources/${resource.id}`} className="block h-full rounded-2xl border bg-card p-5 hover:border-primary">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">{resource.topic}</span>
        <span className="mt-3 block text-lg font-bold">{resource.title}</span>
        {resource.board_verified && resource.exam_board && <span className="mt-3 block text-xs text-muted-foreground">{resource.exam_board} · mapping verified</span>}
      </Link>
    </li>)}</ul>
  </section>;
}
