import Link from "next/link";


import { SubjectDiagram } from "./subject-diagram";
import { SubjectPractice } from "./subject-practice";
import { SubjectProgress } from "./subject-progress";
import styles from "./subjects.module.css";

import { SupplementalResources } from "@/components/learning-school/supplemental-resources";
import { SUBJECT_PACKS, type SubjectPack, type SubjectProduct } from "@/lib/learning/packs";

const names: Record<SubjectProduct,string> = {maths:"IllumMaths",science:"IllumScience",english:"IllumEnglish"};
const descriptions: Record<SubjectProduct,string> = {
  maths:"Understand the method, work through an example and practise until the reasoning clicks. Then race your own best with accuracy first.",
  science:"Explore evidence through labelled diagrams, calculations and careful explanations. Learn what a result can tell you and what still needs checking.",
  english:"Read original extracts, build interpretations with evidence, and draft writing for a real audience. Compare, revise and keep your own voice.",
};
export function SubjectHome({ product }: { product: SubjectProduct }) {
  const packs = SUBJECT_PACKS.filter((pack) => pack.product === product);
  return <div className={styles.page} data-product={product}>
    <header className={styles.hero}><p className={styles.eyebrow}>{names[product]} · focused learning</p><h1>{product === "maths" ? "Make every step add up." : product === "science" ? "Ask. Observe. Explain." : "Find the words. Make your point."}</h1><p>{descriptions[product]}</p><p className={styles.muted}>Three complete starter mini-packs for KS3 and GCSE foundations. Original IllumED material; these focused packs do not cover a whole exam specification or guarantee a grade.</p></header>
    <div className={styles.grid}>{packs.map((pack) => <article className={styles.card} key={pack.slug}><span className={styles.badge}>{pack.level} · {pack.minutes} min</span><h2>{pack.title}</h2><p>{pack.summary}</p><span className={styles.muted}>{pack.questions.length} marked questions · worked example{pack.writing ? " · writing workshop" : " · visual explanation"}</span><Link className={styles.button} href={`/${product}/${pack.slug}`}>Open topic →</Link></article>)}</div>
    <SubjectProgress product={product} />
    <section className={styles.section}><h2>Learn in a way that stays useful</h2><ol className={styles.steps}><li>Read the explanation and work through the example before revealing each answer.</li><li>Try a four-question practice set. Use every explanation to understand the answer.</li><li>Retry a different set. {product === "english" ? "Draft, compare with the model and revise against the rubric." : product === "maths" ? "Try a solo Maths Race when you are ready; accuracy comes before speed." : "Explain your reasoning and consider the limits of the evidence."}</li><li>Sign in to save results and drafts, or practise freely as a guest. Class assignments use your verified class account.</li></ol></section>
    <SupplementalResources product={product} />
  </div>;
}
export function SubjectDetail({ pack, assignment }: { pack: SubjectPack; assignment: string | null }) {
  return <div className={styles.page} data-product={pack.product}>
    <Link className={styles.return} href={`/${pack.product}`}>← All {names[pack.product]} topics</Link>
    <header className={styles.hero}><p className={styles.eyebrow}>{names[pack.product]} · {pack.level}</p><h1>{pack.title}</h1><p>{pack.summary}</p><p className={styles.muted}>{pack.minutes} minutes suggested · original learning material · no exam-grade prediction</p><div className={styles.actions}><a className={styles.button} href="#worked-example">Worked example</a><a className={styles.secondary} href={pack.writing ? "#writing-workshop" : "#practice"}>{pack.writing ? "Start writing" : "Try questions"}</a></div></header>
    <section className={styles.section}><h2>What you will practise</h2><ul className={styles.list}>{pack.outcomes.map((outcome) => <li key={outcome}>{outcome}</li>)}</ul></section>
    <section className={styles.section}><h2>Understand the idea</h2>{pack.explanation.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}<SubjectDiagram kind={pack.diagram} /></section>
    {pack.evidence && <section className={styles.section} id="source-evidence"><h2>{pack.evidence.title}</h2><blockquote className={styles.quote}>{pack.evidence.text}</blockquote></section>}
    <section className={styles.section} id="worked-example"><p className={styles.eyebrow}>Walk through the reasoning</p><h2>Worked example</h2><p><strong>{pack.workedExample.question}</strong></p><ol className={styles.steps}>{pack.workedExample.steps.map((step) => <li key={step}>{step}</li>)}</ol><p className={styles.feedback}><strong>{pack.workedExample.answer}</strong></p></section>
    <SubjectPractice key={`${pack.product}:${pack.slug}:${assignment ?? "solo"}`} pack={pack} assignment={assignment} />
  </div>;
}
