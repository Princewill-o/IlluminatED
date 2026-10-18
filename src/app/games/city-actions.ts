"use server";

import { revalidatePath } from "next/cache";

import { getSupabase } from "@/lib/social/server";

const ERRORS: Record<string, string> = {
  not_allowed: "Sign in with an active account to continue.",
  not_enough_clout: "You need more Clout for this purchase or unlock.",
  vip_required: "This companion is available with Illumship (Premium).",
  already_owned: "You already own this item.",
  not_owned: "You do not own enough units to sell.",
  friend_limit: "One of you has reached the 30-friend limit.",
  request_limit: "You have too many pending requests. Try again later.",
  unavailable: "That player or request is unavailable.",
  not_ready: "Complete the study target before claiming this reward.",
  already_claimed: "You have already collected this reward.",
};
export async function cityAction(
  fn: "city_trade" | "city_claim_week" | "city_friend_action",
  args: Record<string, unknown>,
) {
  const sb = await getSupabase();
  if (
    !sb ||
    !["city_trade", "city_claim_week", "city_friend_action"].includes(fn)
  )
    return { error: "The service is unavailable. Please try again." };
  const { error } = await sb.rpc(fn, args);
  if (error)
    return {
      error:
        Object.entries(ERRORS).find(([key]) =>
          error.message.includes(key),
        )?.[1] ?? "Couldn't save that change. Try again.",
    };
  for (const path of [
    "/games/wealth",
    "/games/weekly",
    "/games/friends",
    "/games/illumship",
    "/games/expansions",
  ])
    revalidatePath(path);
  return { error: null };
}
