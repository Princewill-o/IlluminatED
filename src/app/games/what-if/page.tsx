import { redirect } from "next/navigation";

export default async function WhatIfPage({ searchParams }: { searchParams: Promise<{ ghost?: string }> }) {
  const { ghost } = await searchParams;
  const query = new URLSearchParams({ activity: "what-if" });
  if (ghost && /^\d+$/.test(ghost)) query.set("ghost", ghost);
  redirect(`/games/world?${query}`);
}
