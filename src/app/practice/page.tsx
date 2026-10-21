import type { Metadata } from "next";

import { BankPractice } from "@/components/practice/bank-practice";
import { requireAccount } from "@/lib/account/server";

export const metadata: Metadata = { title: "Question bank practice" };

export default async function PracticePage() {
  const account = await requireAccount("/practice");
  return (
    <div className="mx-auto max-w-4xl px-4 pt-6 pb-10">
      <p className="text-xs font-bold tracking-widest text-primary uppercase">Question bank</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">Practise GCSE and A-level questions</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Thousands of questions across 12 GCSE and 14 A-level subjects. Type your answer, get it marked instantly, and see where each question comes from.
      </p>
      <div className="mt-6">
        <BankPractice userId={account.id} />
      </div>
    </div>
  );
}
