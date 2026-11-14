import type { Metadata } from "next";

import { SubjectHome } from "@/components/learning/subject-page";

export const metadata: Metadata = { title: "IllumMaths | Learn, practise and race", description: "Original maths mini-packs with worked examples, marked practice and solo accuracy-first Maths Races." };
export default function MathsPage() { return <SubjectHome product="maths" />; }
