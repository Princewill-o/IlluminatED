import { notFound } from "next/navigation";

import { CharacterLineup, ThumbRenderer } from "./lineup";

/** Development only: a lineup of characters built from the creative kit, for checking looks and poses. */
export default async function CharactersDevPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  return (await searchParams).mode === "thumbs" ? <ThumbRenderer /> : <CharacterLineup />;
}
