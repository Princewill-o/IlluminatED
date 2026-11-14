import type { Metadata } from "next";

import { SubjectHome } from "@/components/learning/subject-page";

export const metadata: Metadata = { title: "IllumEnglish | Read, write and revise", description: "Original English extracts, evidence-led analysis and writing workshops with saved drafts, model responses and revision rubrics." };
export default function EnglishPage() { return <SubjectHome product="english" />; }
