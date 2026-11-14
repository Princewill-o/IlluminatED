import type { Metadata } from "next";

import { SubjectHome } from "@/components/learning/subject-page";

export const metadata: Metadata = { title: "IllumScience | Observe, reason and practise", description: "Original science mini-packs with labelled diagrams, evidence, worked calculations and marked practice." };
export default function SciencePage() { return <SubjectHome product="science" />; }
