import Link from "next/link";

import { VenturePanel } from "@/components/game/world/venture-panel";
import { requireAccount } from "@/lib/account/server";
export const metadata = { title: "Venture · Run your own business" };
export default async function VenturePage() {
  const account = await requireAccount("/games/venture");
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link
        href="/games/world?map=venture-hub"
        className="mb-5 inline-block font-semibold underline"
      >
        Visit Venture Yard →
      </Link>
      <VenturePanel meId={account.id} />
    </main>
  );
}
