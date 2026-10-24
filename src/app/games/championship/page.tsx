import { redirect } from "next/navigation";

export default async function ChampionshipPage({ searchParams }: { searchParams: Promise<{ ghost?: string }> }) {
  const { ghost } = await searchParams;
  const query = new URLSearchParams({ activity: "championship" });
  if (ghost && /^\d+$/.test(ghost)) query.set("ghost", ghost);
  redirect(`/games/world?${query}`);
}
