import { ArrowUpRight, BookOpenCheck } from "lucide-react";

const EVIDENCE = [
  {
    value: "+0.49",
    title: "Learning with game elements",
    text: "A meta-analysis of 19 studies with 1,686 learners found higher knowledge and application scores with gamification than with comparison teaching approaches.",
    detail: "Hedges’ g = 0.49 · 95% confidence interval 0.30–0.69",
    source: "Sailer & Homner, 2020",
    href: "https://link.springer.com/article/10.1007/s10648-019-09498-w",
  },
  {
    value: "+0.33",
    title: "Learning through digital games",
    text: "Across 57 studies, learners using educational digital games achieved higher learning scores on average than learners in non-game comparison groups.",
    detail: "Hedges’ g = 0.33 · 95% confidence interval 0.19–0.48",
    source: "Clark, Tanner-Smith & Killingsworth, 2016",
    href: "https://journals.sagepub.com/doi/10.3102/0034654315582065",
  },
];

/** General learning research, clearly separated from claims about this product. */
export function LearningEvidence() {
  return (
    <section className="border-y bg-card" aria-labelledby="learning-evidence-title">
      <div className="container py-12 sm:py-16">
        <p className="flex items-center gap-2 text-xs font-bold tracking-widest text-primary uppercase"><BookOpenCheck className="size-4" aria-hidden /> Why learn through play?</p>
        <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_1fr] lg:gap-12">
          <h2 id="learning-evidence-title" className="max-w-xl text-3xl leading-tight tracking-tight sm:text-4xl">Better learning is the goal. Research gives us a reason to play.</h2>
          <p className="max-w-xl leading-relaxed text-muted-foreground">Understanding and applying knowledge matter for exam preparation. Peer-reviewed research suggests that well-designed gamification and educational games can help these learning outcomes. That is why IlluminatED connects play with subject practice, explanations and progress you can return to.</p>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {EVIDENCE.map((item) => (
            <article key={item.source} className="rounded-2xl border bg-background p-5 sm:p-6">
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1"><span className="text-4xl font-black tracking-tight text-primary">{item.value}</span><span className="text-sm font-semibold text-muted-foreground">standard deviations</span></p>
              <h3 className="mt-3 text-lg font-bold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">{item.detail}</p>
              <a href={item.href} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary underline underline-offset-4">{item.source}<ArrowUpRight className="size-4 shrink-0" aria-hidden /><span className="sr-only"> (opens in a new tab)</span></a>
            </article>
          ))}
        </div>
        <p className="mt-5 max-w-4xl text-sm leading-6 text-muted-foreground">These figures are average differences in learning scores across other educational settings, measured as effect sizes. They are not percentage increases in exam marks or pass rates, and they are not IlluminatED results. Outcomes varied between studies; IlluminatED has not yet been independently evaluated for exam-grade improvements.</p>
      </div>
    </section>
  );
}
