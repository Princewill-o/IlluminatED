import { notFound } from "next/navigation";

import type { Metadata } from "next";

import { SubjectDetail } from "@/components/learning/subject-page";
import { ALL_SUBJECT_PACKS, findSubjectPack } from "@/lib/learning/packs";

type Props = { params: Promise<{topic:string}>; searchParams: Promise<{assignment?:string}> };
export function generateStaticParams() { return ALL_SUBJECT_PACKS.filter((pack) => pack.product === "maths").map((pack) => ({topic:pack.slug})); }
export async function generateMetadata({params}:Props):Promise<Metadata> { const pack=findSubjectPack("maths",(await params).topic); return {title:pack ? `${pack.title} | IllumMaths` : "Topic not found"}; }
export default async function MathsTopic({params,searchParams}:Props) { const pack=findSubjectPack("maths",(await params).topic); if(!pack) notFound(); const query=await searchParams; return <SubjectDetail pack={pack} assignment={typeof query.assignment === "string" ? query.assignment : null} />; }
