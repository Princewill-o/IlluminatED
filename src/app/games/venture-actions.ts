"use server";
import { revalidatePath } from "next/cache";

import type { Venture } from "@/game/core/ventures";
import { getSupabase } from "@/lib/social/server";
const errors: Record<string, string> = {
  not_allowed: "Sign in with an active account to use Venture.",
  already_started: "You already have a business. Reopen Venture to load it.",
  not_started: "Choose a business first.",
  stale_order:
    "Your business changed in another tab. Reopen Venture for the current order.",
  not_enough_credits:
    "Save more venture credits before making this purchase or accepting this order.",
  already_hired: "This teammate is already on your team.",
  max_level: "Your workspace is fully upgraded.",
  daily_limit: "You've completed today's 20 orders. Come back tomorrow.",
  take_your_time: "Take a moment to review your next order, then try again.",
  check_profit:
    "Check your calculation: revenue minus supplies and wages equals profit.",
  invalid_business:
    "Choose a business type and a name between 2 and 40 characters.",
};
export async function ventureAction(
  action: "start" | "hire" | "upgrade" | "order",
  input: {
    sector?: string;
    name?: string;
    staff?: string;
    answer?: number;
    revision?: number;
  },
) {
  if (
    !["start", "hire", "upgrade", "order"].includes(action) ||
    (input.answer !== undefined && !Number.isSafeInteger(input.answer))
  )
    return { error: "Choose a valid business action.", data: null };
  const sb = await getSupabase();
  if (!sb) return { error: "Sign in to run a business.", data: null };
  const { data, error } = await sb.rpc("city_venture_action", {
    p_action: action,
    p_sector: input.sector ?? null,
    p_name: input.name ?? null,
    p_staff: input.staff ?? null,
    p_answer: input.answer ?? null,
    p_revision: input.revision ?? null,
  });
  if (error)
    return {
      error:
        Object.entries(errors).find(([key]) =>
          error.message.includes(key),
        )?.[1] ?? "Venture couldn't save this action. Please try again.",
      data: null,
    };
  revalidatePath("/games/venture");
  return { error: null, data: data as Venture };
}
