import Link from "next/link";
import { notFound } from "next/navigation";

import type { Metadata } from "next";

import { LessonSlides } from "@/components/learn/lesson-slides";
import { lessonAdaptation } from "@/lib/education/lesson-adaptation";
import { OAK_LICENCE } from "@/lib/education/school-stages";
import { publicLessonDeck } from "@/lib/server/lesson-materials";
import { lessonPractice, oakLesson } from "@/lib/server/oak-library";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{slug:string}> }): Promise<Metadata> {
  const lesson=await oakLesson((await params).slug);
  return { title: lesson?.title ?? "Lesson not found" };
}
export default async function LessonPage({ params }: { params: Promise<{slug:string}> }) {
  const lesson=await oakLesson((await params).slug);
  if(!lesson) notFound();
  const content=lesson.content;
  const adaptation=lessonAdaptation(lesson);
  const [originalDeck,questions]=await Promise.all([publicLessonDeck(lesson),lessonPractice(lesson.slug)]);
  return <article className="container max-w-3xl py-10 sm:py-16">
    <Link href={`/curriculum?keyStage=${lesson.key_stage}&subject=${lesson.subject}`} className="font-semibold text-primary underline">← More {lesson.subject_title} lessons</Link>
    <p className="mt-7 text-sm font-bold text-muted-foreground">{lesson.key_stage.toUpperCase()} · {lesson.subject_title}{lesson.years.length?` · Year ${lesson.years.join(", ")}`:""}</p>
    <h1 className="mt-2 text-3xl font-black sm:text-4xl">{lesson.title}</h1><p className="mt-3 text-muted-foreground">{lesson.unit_title}</p>
    {lesson.restricted ? <div className="my-7 rounded-2xl border bg-muted p-6"><h2 className="text-xl font-bold">This lesson has restricted resources</h2><p className="mt-3">We show its curriculum listing but do not reproduce restricted teaching material. Check the original Oak lesson for access conditions.</p></div> : <>
      <LessonSlides slug={lesson.slug} title={lesson.title} slides={adaptation.slides} questions={questions.length?questions:adaptation.questions} />
      {originalDeck&&<details className="my-5 rounded-xl border p-5"><summary className="min-h-11 cursor-pointer text-sm font-semibold">Original teaching resources</summary><p className="mt-2 text-sm text-muted-foreground">The original illustrated PowerPoint is available as well as the IllumED text slides. It retains the publisher’s design and credits.</p><a href={`/api/education/oak/${lesson.slug}/original-slides`} className="mt-3 inline-flex min-h-11 items-center rounded-full border border-primary px-5 py-2 text-sm font-bold text-primary">Download original PowerPoint ↓</a></details>}
      {content.pupilLessonOutcome && <section className="my-7 rounded-2xl border border-primary/25 bg-primary/5 p-6"><h2 className="text-xl font-bold">What you’ll learn</h2><p className="mt-3">{content.pupilLessonOutcome}</p></section>}
      {(content.contentGuidance?.length || content.supervisionLevel) ? <aside className="my-6 rounded-xl border p-5"><h2 className="font-bold">Before you start</h2>{content.supervisionLevel&&<p>{content.supervisionLevel}</p>}{content.contentGuidance?.map((item,i)=><p key={i}>{item.contentGuidanceLabel} {item.contentGuidanceDescription}</p>)}</aside> : null}
      {Array.isArray(content.keyLearningPoints)&&content.keyLearningPoints.length>0&&<section className="my-7"><h2 className="text-2xl font-bold">Key learning points</h2><ul className="mt-4 list-disc space-y-3 pl-6">{content.keyLearningPoints.map((point,i)=><li key={i}>{point.keyLearningPoint}</li>)}</ul></section>}
      {Array.isArray(content.lessonKeywords)&&content.lessonKeywords.length>0&&<section className="my-7"><h2 className="text-2xl font-bold">Words to know</h2><dl className="mt-4 space-y-4">{content.lessonKeywords.map((word,i)=><div key={i} className="rounded-xl bg-muted p-4"><dt className="font-bold">{word.keyword}</dt><dd className="mt-1">{word.description}</dd></div>)}</dl></section>}
      {Array.isArray(content.misconceptionsAndCommonMistakes)&&content.misconceptionsAndCommonMistakes.length>0&&<section className="my-7"><h2 className="text-2xl font-bold">Common mistakes</h2>{content.misconceptionsAndCommonMistakes.map((item,i)=><div key={i} className="mt-4 rounded-xl border p-5"><h3 className="font-bold">{item.misconception}</h3><p className="mt-2">{item.response}</p></div>)}</section>}
      {content.transcript_sentences&&<details className="my-7 rounded-xl border p-5"><summary className="min-h-11 cursor-pointer text-lg font-bold">Read the teaching transcript</summary><div className="mt-4 space-y-4 leading-relaxed">{content.transcript_sentences.split(/\n\s*\n/).filter(Boolean).map((text,i)=><p key={i} className="whitespace-pre-line">{text}</p>)}</div></details>}
      {Array.isArray(content.teacherTips)&&content.teacherTips.length>0&&<details className="my-7 rounded-xl border p-5"><summary className="min-h-11 cursor-pointer font-bold">For parents, carers and teachers</summary><ul className="mt-4 list-disc space-y-3 pl-5">{content.teacherTips.map((item,i)=><li key={i}>{item.teacherTip}</li>)}</ul></details>}
    </>}
    <footer className="mt-6 border-t pt-5 text-xs leading-relaxed text-muted-foreground">IllumED Slides adapts “{lesson.title}”, {lesson.subject_title}, by <a href={lesson.source_url} target="_blank" rel="noopener noreferrer" className="underline">Oak National Academy ↗</a>. {!lesson.restricted&&<>Licensed under the <a href={OAK_LICENCE} className="underline">Open Government Licence v3.0</a>. </>}Slides and recall practice adapted by IlluminatED; no publisher endorsement. Restricted lessons have listing information only.</footer>
  </article>;
}
