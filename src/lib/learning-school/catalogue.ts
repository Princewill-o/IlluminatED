export type LearningProduct = "world" | "maths" | "science" | "english";
export const ASSIGNABLE_RESOURCES: { product: LearningProduct; slug: string; title: string; time: string }[] = [
  { product: "world", slug: "tech-repair-trainee", title: "Tech Repair Trainee", time: "35–40 minutes · Year 10" },
  { product: "maths", slug: "percentages", title: "Percentages", time: "GCSE maths" },
  { product: "maths", slug: "ratio-proportion", title: "Ratio and proportion", time: "GCSE maths" },
  { product: "maths", slug: "profit-financial-maths", title: "Profit and financial maths", time: "GCSE maths" },
  { product: "science", slug: "cells-microscopy", title: "Cells and microscopy", time: "GCSE biology" },
  { product: "science", slug: "particles-materials", title: "Particles and materials", time: "GCSE chemistry" },
  { product: "science", slug: "electricity-circuits", title: "Electricity and circuits", time: "GCSE physics" },
  { product: "english", slug: "reading-evidence", title: "Reading for evidence", time: "GCSE English Language" },
  { product: "english", slug: "language-analysis", title: "Language analysis", time: "GCSE English Language" },
  { product: "english", slug: "writing-audience", title: "Writing for an audience", time: "GCSE English Language" },
];
export const PRODUCT_NAMES: Record<LearningProduct, string> = { world: "IllumWorld", maths: "IllumMaths", science: "IllumScience", english: "IllumEnglish" };
export function assignmentUrl(product: LearningProduct, slug: string, id: string) {
  const known = ASSIGNABLE_RESOURCES.some((r) => r.product === product && r.slug === slug);
  return known ? `/${product}/${slug}?assignment=${encodeURIComponent(id)}` : "/school";
}
export function progressLabel(status?: string) {
  return ({ started: "Started", submitted: "Submitted", completed: "Completed", changes_requested: "Changes requested", approved: "Approved" } as Record<string, string>)[status ?? ""] ?? "Joined · not started";
}
