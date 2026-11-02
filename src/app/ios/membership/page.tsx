import Link from "next/link";

import { BookOpen, GraduationCap, Heart } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your membership",
  robots: { index: false, follow: false },
};

export default function IOSMembershipPage() {
  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-md flex-col justify-center gap-5 px-6 py-12">
      <span className="grid size-16 place-items-center rounded-3xl bg-blue-500/10 text-blue-600">
        <GraduationCap size={30} aria-hidden />
      </span>
      <h1 className="text-3xl font-bold tracking-tight">
        Your next chapter is here.
      </h1>
      <p className="text-muted-foreground leading-7">
        This iOS app doesn’t offer digital subscription purchases. Sign in to
        use the features included with your existing account or school access.
      </p>
      <p className="text-muted-foreground text-sm leading-6">
        Free study and the app’s offline revision and focus timer are available.
        Your current membership stays linked to your account.
      </p>
      <Link
        href="/games/study"
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 font-semibold text-white"
      >
        <BookOpen size={19} aria-hidden />
        Go to study
      </Link>
      <Link
        href="/games/world"
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-5 font-semibold"
      >
        <Heart size={19} aria-hidden />
        Back to my life
      </Link>
      <Link
        href="/contact?topic=billing"
        className="py-2 text-sm underline underline-offset-4"
      >
        Membership support
      </Link>
    </main>
  );
}
