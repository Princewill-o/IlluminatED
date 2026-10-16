"use server";

import { revalidatePath } from "next/cache";

import { bikeById } from "@/game/core/bikes";
import { getSupabase } from "@/lib/social/server";

const FRIENDLY: Record<string, string> = {
  not_allowed: "Log in with your IlluminatED account to hire a bike.",
  not_enough_clout: "Not enough Clout. Work a shift or revise on the bus to earn more.",
  unknown_item: "That bike isn't at this dock.",
};
const friendly = (m?: string) =>
  FRIENDLY[Object.keys(FRIENDLY).find((k) => m?.includes(k)) ?? ""] ??
  (m?.includes("bike_hire") ? "Bike hire is being switched on. Try again soon." : "Couldn't reach the server. Try again in a moment.");

/** Pays for a bike with Clout. Returns the Clout left. */
export async function hireBike(brand: string) {
  if (!bikeById(brand)) return { ok: false as const, error: FRIENDLY.unknown_item };
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, error: friendly() };
  const { data, error } = await sb.rpc("bike_hire", { p_brand: brand });
  if (error) return { ok: false as const, error: friendly(error.message) };
  revalidatePath("/games/world");
  return { ok: true as const, clout: data as number };
}
