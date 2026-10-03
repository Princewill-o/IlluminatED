import Image from "next/image";
import Link from "next/link";

import { PREMIUM_MONTHLY_LABEL, q4OfferOpen } from "@/lib/campaign";

/** Shared landscape artwork for the public signup journey and the learner dashboard. */
export function Q4CampaignArtwork({ compact = false }: { compact?: boolean }) {
  if (!q4OfferOpen()) return null;
  return (
    <section
      aria-label="Q4 Lock In offer"
      className={`relative isolate overflow-hidden rounded-3xl border-2 border-blue-300 bg-[#124ce5] text-white shadow-[0_8px_0_#082b91] ${compact ? "mb-8" : "mb-10"}`}
    >
      <Image
        src="/campaign/q4-lock-in-landscape.png"
        alt="Tiggy studying with revision books and a pencil on a bright blue Q4 Lock In background"
        width={2048}
        height={683}
        priority={!compact}
        className="absolute inset-0 -z-10 size-full object-cover object-center"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#124ce5] via-[#124ce5]/90 to-[#124ce5]/35" />
      <div className={`relative max-w-xl ${compact ? "p-5 sm:p-7" : "p-6 sm:p-9"}`}>
        <p className="inline-flex -rotate-2 rounded-full border-2 border-blue-950 bg-yellow-300 px-3 py-1.5 text-xs font-black tracking-wide text-blue-950">
          Q4 LOCK IN
        </p>
        <h2 className={`mt-4 font-bold tracking-tight ${compact ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"}`}>
          Big goals. Little lion. Let&apos;s lock in.
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-blue-50 sm:text-base">
          Sign up now and get Premium free for 30 days. Payment details are collected securely, then {PREMIUM_MONTHLY_LABEL} unless you cancel before the trial ends.
        </p>
        <Link href="/premium?campaign=q4" className="mt-5 inline-flex rounded-full border-2 border-blue-950 bg-white px-5 py-2.5 text-sm font-bold text-blue-950 shadow-[3px_3px_0_#072373] hover:bg-yellow-100">
          See the offer
        </Link>
      </div>
    </section>
  );
}
