"use server";

import { revalidatePath } from "next/cache";

import { bikeById } from "@/game/core/bikes";
import { carById } from "@/game/core/cars";
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

const CAR_ERRORS: Record<string, string> = {
  not_allowed: "Log in with your IlluminatED account to buy a car.",
  not_enough_clout: "Not enough Clout yet. Work shifts and revise to save up.",
  already_owned: "You already own this one. It's in your garage.",
  unknown_item: "That car isn't on the forecourt.",
};

/** Buys a car with Clout. Returns the Clout left. */
export async function buyCar(car: string) {
  if (!carById(car)) return { ok: false as const, error: CAR_ERRORS.unknown_item };
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, error: "Couldn't reach the server. Try again in a moment." };
  const { data, error } = await sb.rpc("car_buy", { p_car: car });
  if (error) {
    const k = Object.keys(CAR_ERRORS).find((x) => error.message.includes(x));
    return { ok: false as const, error: k ? CAR_ERRORS[k] : "The dealership is opening soon. Try again later." };
  }
  revalidatePath("/games/world");
  return { ok: true as const, clout: data as number };
}

/** XP for things you do in the world. Quietly does nothing if it can't save. */
export async function earnWorldXp(kind: "bus" | "hike" | "train" | "eat" | "study" | "sleep") {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc("world_xp", { p_kind: kind });
  if (error) return null;
  return data as { xp: number; total?: number; level?: number; levelled?: boolean };
}
