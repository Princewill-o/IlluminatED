import { redirect } from "next/navigation";

export const metadata = { title: "Plans and pricing" };
export const dynamic = "force-dynamic";

/** Premium now lives on /pricing, with every plan in one place. Keeps checkout messages. */
export default async function PremiumPage({ searchParams }: { searchParams: Promise<{ error?: string; cancelled?: string }> }) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  if (sp.error) q.set("error", sp.error);
  if (sp.cancelled) q.set("cancelled", "1");
  redirect(`/pricing${q.size ? `?${q}` : ""}#plans`);
}
