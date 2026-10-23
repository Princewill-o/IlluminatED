import type { Metadata } from "next";

import { SchoolLeague } from "@/components/game/schools/school-league";
import { requireAccount } from "@/lib/account/server";

export const metadata: Metadata = { title: "School vs School" };

export default async function SchoolsPage() {
  await requireAccount("/games/schools");
  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 pb-12">
      <SchoolLeague />
    </div>
  );
}
