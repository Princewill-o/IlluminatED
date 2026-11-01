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
export async function earnWorldXp(kind: "bus" | "hike" | "train" | "eat" | "study" | "sleep" | "network") {
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

// ── Interview room deals ─────────────────────────────────────────────────────
const DEAL_ERRORS: Record<string, string> = {
  not_allowed: "Log in with your IlluminatED account to make a deal.",
  pick_someone_else: "Pick another player.",
  bad_amount: "Offer between 10 and 500 Clout.",
  bad_charge: "That charge can't be passed on.",
  unknown_player: "That player isn't around any more.",
  not_enough_clout: "You don't have that much Clout.",
  too_many_offers: "Too many offers. Wait a few minutes before trying again.",
  no_offer: "That offer has gone.",
};
const dealError = (m?: string) => DEAL_ERRORS[Object.keys(DEAL_ERRORS).find((k) => m?.includes(k)) ?? ""] ?? "Couldn't reach the server. Try again in a moment.";

/** Offer another player Clout to take the blame. They must accept. */
export async function offerBlameDeal(to: string, charge: string, stars: number, clout: number) {
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, error: dealError() };
  const { data, error } = await sb.rpc("blame_offer", { p_to: to, p_charge: charge, p_stars: stars, p_clout: Math.round(clout) });
  if (error) return { ok: false as const, error: dealError(error.message) };
  return { ok: true as const, deal: data as string };
}

/** Pending, accepted, declined, expired or cancelled. */
export async function blameDealStatus(deal: string) {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc("blame_status", { p_deal: deal });
  return error ? null : (data as string);
}

export type BlameOffer = { id: string; from_username: string; charge: string; stars: number; clout: number; created_at: string };
/** Offers other players have sent me in the last minute. */
export async function blameInbox(): Promise<BlameOffer[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.rpc("blame_inbox");
  return error ? [] : ((data ?? []) as BlameOffer[]);
}

/** Accept (get the Clout, face the charge) or decline an offer. */
export async function answerBlameDeal(deal: string, accept: boolean) {
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, error: dealError() };
  const { data, error } = await sb.rpc("blame_answer", { p_deal: deal, p_accept: accept });
  if (error) return { ok: false as const, error: dealError(error.message) };
  const r = data as { status: string; charge?: string; stars?: number; clout?: number; wallet?: number };
  return { ok: true as const, ...r };
}

// ── Quick quizzes from the question bank ────────────────────────────────────
export type GameQuestion = { id: string; prompt: string; options: string[]; answer: number; explain: string; subject: string; topic: string; level: string };

/**
 * Multiple-choice questions from the Supabase question bank, from the player's
 * own subjects when possible. Used by police checks, the interview room,
 * airport security and prison study. Returns [] when offline (callers fall back).
 */
export async function gameQuiz(count = 1): Promise<GameQuestion[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data: auth } = await sb.auth.getUser();
  let subjects: string[] | null = null;
  if (auth.user) {
    const { data: details } = await sb.from("learner_details").select("subjects").eq("user_id", auth.user.id).maybeSingle();
    const { COURSES } = await import("@/lib/data/courses");
    const ids = Array.isArray(details?.subjects) ? (details.subjects as { courseId?: string }[]).map((s) => s.courseId) : [];
    const titles = COURSES.filter((c) => ids.includes(c.id)).map((c) => c.register?.title ?? c.title.replace(/^(GCSE|A-level|BTEC|T Level)\s+/i, ""));
    subjects = titles.length ? titles : null;
  }
  const { data, error } = await sb.rpc("game_quiz", { p_count: count, p_subjects: subjects });
  return error ? [] : ((data ?? []) as GameQuestion[]);
}

// ── Deliveries ───────────────────────────────────────────────────────────────
export type Delivery = { id: string; kind: "car" | "outfit" | "furniture"; item: string; created_at: string };
/** Parcels on their way to your front door (oldest first). */
export async function pendingDeliveries(): Promise<Delivery[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("deliveries").select("id,kind,item,created_at").eq("status", "on_the_way").order("created_at").limit(10);
  return error ? [] : ((data ?? []) as Delivery[]);
}
/** Sign for a parcel at the door. */
export async function signDelivery(id: string) {
  const sb = await getSupabase();
  if (!sb) return false;
  const { error } = await sb.rpc("delivery_sign", { p_id: id });
  return !error;
}

// ── IllumED World: player worlds ─────────────────────────────────────────────
export type WorldRules = { police: "off" | "relaxed" | "normal" | "strict"; flight: "off" | "owner" | "everyone"; time: "auto" | "day" | "dusk" | "night"; weather: "auto" | "clear" | "rain" | "snow"; visitors: "everyone" | "friends" };
export type PlayerWorld = { owner: string; code: string; name: string; icon: string; settings: WorldRules; owner_name?: string };
const WORLD_ERRORS: Record<string, string> = {
  plus_only: "Building your own world is part of IlluminatED Plus.",
  already_built: "You already have a world. Each member gets one.",
  invalid_settings: "Those world rules aren't allowed.",
  no_world: "You haven't built a world yet.",
  not_allowed: "Log in to build a world.",
};
const worldError = (m?: string) => WORLD_ERRORS[Object.keys(WORLD_ERRORS).find((k) => m?.includes(k)) ?? ""] ?? (m?.includes("check") ? "Names are 3 to 30 characters." : "Couldn't reach the server. Try again.");

/** Every player-built world (public), newest first, with the owner's name. */
export async function listPlayerWorlds(): Promise<PlayerWorld[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("player_worlds").select("owner,code,name,icon,settings").order("updated_at", { ascending: false }).limit(60);
  if (error || !data) return [];
  const owners = [...new Set(data.map((w) => w.owner as string))];
  const { data: names } = owners.length ? await sb.from("profiles").select("id,username").in("id", owners) : { data: [] };
  const byId = new Map((names ?? []).map((p) => [p.id as string, p.username as string]));
  return (data as PlayerWorld[]).map((w) => ({ ...w, owner_name: byId.get(w.owner) }));
}

/** Is the signed-in member on Plus (and so allowed to build a world)? */
export async function worldPlusStatus() {
  const sb = await getSupabase();
  if (!sb) return { plus: false, signedIn: false };
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return { plus: false, signedIn: false };
  const { data } = await sb.from("billing_accounts").select("tier,status").eq("user_id", auth.user.id);
  const plus = (data ?? []).some((b) => ["plus", "plus_experience"].includes(b.tier as string) && ["active", "trialing"].includes(b.status as string));
  return { plus, signedIn: true, userId: auth.user.id };
}

export async function buildWorld(name: string, icon: string) {
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, error: worldError() };
  const { data, error } = await sb.rpc("world_build", { p_name: name, p_icon: icon });
  return error ? { ok: false as const, error: worldError(error.message) } : { ok: true as const, code: data as string };
}

export async function configureWorld(name: string | null, icon: string | null, settings: WorldRules | null) {
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, error: worldError() };
  const { error } = await sb.rpc("world_configure", { p_name: name, p_icon: icon, p_settings: settings });
  return error ? { ok: false as const, error: worldError(error.message) } : { ok: true as const };
}

/** One world's current rules (visitors re-check them while playing). */
export async function worldRules(code: string): Promise<{ settings: WorldRules; owner: string; name: string } | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data } = await sb.from("player_worlds").select("settings, owner, name").eq("code", code).maybeSingle();
  return data ? { settings: data.settings as WorldRules, owner: data.owner as string, name: data.name as string } : null;
}
