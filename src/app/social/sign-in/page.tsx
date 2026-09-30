import { redirect } from "next/navigation";

import { safeNext } from "@/lib/account/paths";

export default async function SocialSignIn({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  redirect(`/sign-in?next=${encodeURIComponent(safeNext(sp.next, "/social"))}`);
}
