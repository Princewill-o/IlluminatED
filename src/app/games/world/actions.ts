"use server";

import { revalidatePath } from "next/cache";

import { bikeById } from "@/game/core/bikes";
import { carById } from "@/game/core/cars";
import { getSupabase } from "@/lib/social/server";

/** The payment functions aren't on the database yet: let people play for free until they are. */
const notSetUp = (e: { code?: string; message: string }) => e.code === "PGRST202" || /could not find the function|does not exist/i.test(e.message);

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
  if (error && notSetUp(error)) return { ok: true as const, clout: null, free: true };
  if (error) return { ok: false as const, error: friendly(error.message) };
  revalidatePath("/games/world");
  return { ok: true as const, clout: data as number, free: false };
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
  if (error && notSetUp(error)) return { ok: true as const, clout: null, free: true };
  if (error) {
    const k = Object.keys(CAR_ERRORS).find((x) => error.message.includes(x));
    return { ok: false as const, error: k ? CAR_ERRORS[k] : "The dealership is opening soon. Try again later." };
  }
  revalidatePath("/games/world");
  return { ok: true as const, clout: data as number, free: false };
}

/** XP for things you do in the world. Quietly does nothing if it can't save. */
export async function earnWorldXp(kind: "bus" | "hike" | "train" | "eat" | "study" | "sleep") {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc("world_xp", { p_kind: kind });
  if (error) return null;
  return data as { xp: number; total?: number; level?: number; levelled?: boolean };
}

export async function worldBankBorrow(amount: number) {
  if (![100, 250, 500].includes(amount)) return { ok: false as const, error: "Choose one of the available loan amounts." };
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, error: "Sign in to use Thames & Co Bank." };
  const { data, error } = await sb.rpc("world_bank_borrow", { p_amount: amount });
  if (error) return { ok: false as const, error: error.message.includes("existing_loan") ? "Repay your current loan before borrowing again." : error.message.includes("not_allowed") ? "Sign in to borrow Clout." : "The bank couldn't approve that loan just now." };
  revalidatePath("/games/world");
  return { ok: true as const, loan: data as { balance: number; principal: number; due_at: string; status: string; clout: number } };
}

export async function worldBankRepay() {
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, error: "Sign in to repay your loan." };
  const { data, error } = await sb.rpc("world_bank_repay");
  if (error) return { ok: false as const, error: error.message.includes("not_enough_clout") ? "You need more Clout to repay the full balance." : "The repayment couldn't be processed." };
  revalidatePath("/games/world");
  return { ok: true as const, loan: data as { balance: number; status: string; clout: number } };
}

export async function worldBankStatus() {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc("world_bank_status");
  if (error) return null;
  return data as { balance: number; principal?: number; due_at?: string; status: string };
}

const SHOP_ERRORS: Record<string, string> = {
  not_allowed: "Log in with your IlluminatED account to buy things.",
  not_enough_clout: "Not enough Clout. Work a shift or revise on the bus to earn more.",
  unknown_item: "That isn't for sale here.",
};

/** Pays for an energy drink, meal, coffee or medicine. */
export async function buyWorldItem(item: "medicine" | "drink" | "meal" | "coffee") {
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, error: "Couldn't reach the server. Try again in a moment." };
  const { data, error } = await sb.rpc("world_buy", { p_item: item });
  if (error && notSetUp(error)) return { ok: true as const, clout: null, free: true };
  if (error) {
    const k = Object.keys(SHOP_ERRORS).find((x) => error.message.includes(x));
    return { ok: false as const, error: k ? SHOP_ERRORS[k] : "Couldn't pay. Try again." };
  }
  return { ok: true as const, clout: data as number, free: false };
}
