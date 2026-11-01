import Link from "next/link";

import { PhoneMessages } from "@/components/game/world/phone-messages";
import { requireAccount } from "@/lib/account/server";
export const metadata = { title: "Messages · Friends & city contacts" };
export default async function FriendsPage() {
  const account = await requireAccount("/games/friends");
  return (
    <main className="mx-auto max-w-4xl px-3 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/games/world?phone=1"
          className="text-primary min-h-11 content-center font-semibold"
        >
          ← Back to your city phone
        </Link>
        <Link
          href="/messages"
          className="min-h-11 content-center text-sm font-semibold underline"
        >
          Company advice messages
        </Link>
        {account.profile.role === "moderator" && (
          <Link
            href="/games/friends/reports"
            className="min-h-11 content-center text-sm font-semibold underline"
          >
            Review reports
          </Link>
        )}
      </div>
      <div className="overflow-hidden rounded-[2rem] border border-[#dce1de] bg-[#f2f2f7] p-2 [color-scheme:light]">
        <PhoneMessages meId={account.id} />
      </div>
    </main>
  );
}
