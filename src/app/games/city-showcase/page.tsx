import { notFound } from "next/navigation";

import { DevShowcase } from "@/components/game/city/dev-showcase";
export const metadata = {
  title: "Local game showcase",
  robots: { index: false, follow: false },
};
export default async function ShowcasePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; map?: string; workplace?: string; as?: string; x?: string; y?: string }>;
}) {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.ILLUMINATED_PREVIEW !== "1"
  )
    notFound();
  const p = await searchParams;
  return <DevShowcase view={p.view ?? "world"} map={p.map ?? "city"} workplace={p.workplace} as={p.as} at={p.x && p.y ? { x: Number(p.x), y: Number(p.y) } : undefined} />;
}
