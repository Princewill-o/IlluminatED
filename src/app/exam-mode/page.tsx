import type { Metadata } from "next";

import { StudyTimer } from "@/components/study-timers";
import { requireAccount } from "@/lib/account/server";

export const metadata: Metadata = { title: "Exam mode" };
export const dynamic = "force-dynamic";

export default async function ExamModePage() {
  await requireAccount("/exam-mode");
  return <main className="container py-8"><StudyTimer mode="exam" /></main>;
}
