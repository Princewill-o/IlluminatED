import { redirect } from "next/navigation";

export default async function RacingPage({ searchParams }: { searchParams: Promise<{ ghost?: string }> }) {
  const { ghost } = await searchParams;
  const query = new URLSearchParams({ activity: "racing" });
  if (ghost && /^\d+$/.test(ghost)) query.set("ghost", ghost);
  redirect(`/games/world?${query}`);
}
