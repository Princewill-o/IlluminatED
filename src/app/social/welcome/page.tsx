import { redirect } from "next/navigation";

import { safeNext } from "@/lib/account/paths";

export default async function SocialWelcome({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  redirect(
    `/onboarding?next=${encodeURIComponent(safeNext(sp.next, "/social"))}`,
  );
}
