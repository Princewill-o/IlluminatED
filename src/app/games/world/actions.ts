"use server";

import { revalidatePath } from "next/cache";

import { bikeById } from "@/game/core/bikes";
import { carById } from "@/game/core/cars";
import { MAX_NIGHTS, ROOM_TYPES, isHotel } from "@/game/core/hotels";
import { type Scorecard, answerCount, buildInterviewPlan, roleSpec, scoreInterview } from "@/game/core/interview";
import { type Pet, PETS } from "@/game/core/pets";
import { roleById } from "@/game/core/roles";
import { DELIVERY, MAX_QTY, type Speed, shopItem } from "@/game/core/shop";
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
  // Signed-out visitors (and the preview) have no inbox; skip the 401 round trip.
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return [];
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
export type GameQuestion = { id: string; prompt: string; options: string[]; answer: number; explain: string; subject: string; topic: string; level: string; key?: string };

/**
 * Multiple-choice questions for the world (police checks, the interview room,
 * airport security, the bus, prison study). Signed-in learners get questions
 * from their own subjects' topics, weighted towards topics they haven't
 * secured yet, and every answer counts towards their dashboard progress.
 * Otherwise it falls back to the general Supabase bank. Returns [] offline.
 */
export async function gameQuiz(count = 1): Promise<GameQuestion[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const n = Math.max(1, Math.min(10, Math.floor(count) || 1));
  const { data: auth } = await sb.auth.getUser();
  let subjects: string[] | null = null;
  if (auth.user) {
    const { data: details } = await sb.from("learner_details").select("subjects").eq("user_id", auth.user.id).maybeSingle();
    const mine = (Array.isArray(details?.subjects) ? details.subjects : []) as { courseId?: string; board?: string }[];
    const [{ COURSES }, { QUESTION_BANK }, { matchesSubject }] = await Promise.all([
      import("@/lib/data/courses"), import("@/lib/data/topics"), import("@/lib/account/readiness"),
    ]);
    const valid = mine.filter((m): m is { courseId: string; board: string } => typeof m.courseId === "string" && typeof m.board === "string");
    const pool = QUESTION_BANK.filter((q) => valid.some((m) => matchesSubject(q, m as never)));
    if (pool.length) {
      const { data: progress } = await sb.from("question_progress").select("question_key,seen,correct").eq("user_id", auth.user.id).limit(5000);
      const byKey = new Map((progress ?? []).map((p) => [p.question_key as string, p as { seen: number; correct: number }]));
      // Unseen questions first, then ones they get wrong, and only now and then the ones they've mastered.
      const weighted = pool.map((q) => {
        const p = byKey.get(q.key);
        const w = !p || !p.seen ? 3 : p.correct / p.seen < 0.8 ? 2 : 0.4;
        return { q, r: Math.random() ** (1 / w) };
      }).sort((a, b) => b.r - a.r).slice(0, n);
      return weighted.map(({ q }) => ({
        id: q.key, key: q.key, prompt: q.q, options: q.options, answer: q.answer, explain: q.explain,
        subject: q.subject, topic: q.topicTitle, level: q.route,
      }));
    }
    const titles = COURSES.filter((c) => valid.some((m) => m.courseId === c.id)).map((c) => c.register?.title ?? c.title.replace(/^(GCSE|A-level|BTEC|T Level)\s+/i, ""));
    subjects = titles.length ? titles : null;
  }
  const { data, error } = await sb.rpc("game_quiz", { p_count: n, p_subjects: subjects });
  return error ? [] : ((data ?? []) as GameQuestion[]);
}

/**
 * Saves answers given in the world to the learner's progress, the same record
 * the dashboard, the estimated grades and the quests read. Only questions from
 * our own bank are recorded; anything else is ignored.
 */
export async function recordWorldAnswers(answers: { key: string; correct: boolean }[]) {
  const sb = await getSupabase();
  if (!sb || !Array.isArray(answers) || !answers.length) return false;
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return false;
  const { QUESTION_BANK } = await import("@/lib/data/topics");
  const rows = answers.slice(0, 20).flatMap((a) => {
    const q = typeof a?.key === "string" ? QUESTION_BANK.find((x) => x.key === a.key) : undefined;
    return q ? [{ key: q.key, topicId: q.topicId, courseId: q.courseId, seen: 1, correct: a.correct === true ? 1 : 0 }] : [];
  });
  if (!rows.length) return false;
  const { error } = await sb.rpc("record_quiz_round", { round_mode: "quick", answers: rows });
  if (!error) revalidatePath("/games");
  return !error;
}

// ── Deliveries ───────────────────────────────────────────────────────────────
export type Delivery = { id: string; kind: "car" | "outfit" | "furniture" | "shopping"; item: string; created_at: string };
/** Parcels on their way to your front door (oldest first), including MegaMart orders that have arrived. */
export async function pendingDeliveries(): Promise<Delivery[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const [{ data, error }, shop] = await Promise.all([
    sb.from("deliveries").select("id,kind,item,created_at").eq("status", "on_the_way").order("created_at").limit(10),
    sb.from("shop_orders").select("id,lines,created_at").eq("status", "on_the_way").lte("arrives_at", new Date().toISOString()).order("created_at").limit(10),
  ]);
  const parcels = error ? [] : ((data ?? []) as Delivery[]);
  const shopping = (shop.data ?? []).map((o): Delivery => ({ id: `shop:${o.id}`, kind: "shopping", item: (o.lines as { id: string; qty: number }[]).map((l) => `${l.qty}× ${shopItem(l.id)?.name ?? l.id}`).join(", "), created_at: o.created_at as string }));
  return [...parcels, ...shopping];
}
/** Sign for a parcel at the door. */
export async function signDelivery(id: string) {
  const sb = await getSupabase();
  if (!sb) return false;
  const { error } = id.startsWith("shop:") ? await sb.rpc("shop_order_sign", { p_id: id.slice(5) }) : await sb.rpc("delivery_sign", { p_id: id });
  return !error;
}

// ── MegaMart, the online superstore (src/game/core/shop.ts) ──────────────────
export type ShopOrder = { id: string; lines: { id: string; qty: number }[]; total: number; speed: Speed; status: "on_the_way" | "delivered"; created_at: string; arrives_at: string };
const MEGAMART_ERRORS: Record<string, string> = {
  not_allowed: "Log in with your IlluminatED account to shop.",
  not_enough_clout: "Not enough Clout for this basket.",
  rate_limited: "That's a lot of orders this hour. Try again a bit later.",
  none_left: "You've run out of that. Order more from MegaMart.",
  invalid: "Something in your basket wasn't right. Try again.",
};
const megamartError = (m?: string) => MEGAMART_ERRORS[Object.keys(MEGAMART_ERRORS).find((k) => m?.includes(k)) ?? ""] ?? "Couldn't reach MegaMart. Try again in a moment.";
export async function checkoutShop(lines: { id: string; qty: number }[], speed: Speed) {
  const clean = lines.filter((l) => shopItem(l.id) && Number.isInteger(l.qty) && l.qty >= 1 && l.qty <= MAX_QTY).slice(0, 16);
  if (!clean.length || !(speed in DELIVERY)) return { ok: false as const, error: MEGAMART_ERRORS.invalid };
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, error: megamartError() };
  const { data, error } = await sb.rpc("shop_checkout", { p_lines: clean, p_speed: speed });
  if (error) return { ok: false as const, error: megamartError(error.message) };
  revalidatePath("/games/world");
  return { ok: true as const, order: data as ShopOrder };
}
/** Your recent orders and what's in your pantry. */
export async function loadShopAccount(): Promise<{ orders: ShopOrder[]; pantry: Record<string, number> }> {
  const sb = await getSupabase();
  if (!sb) return { orders: [], pantry: {} };
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) return { orders: [], pantry: {} };
  const [orders, pantry] = await Promise.all([
    sb.from("shop_orders").select("id,lines,total,speed,status,created_at,arrives_at").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(12),
    sb.from("player_pantry").select("item,qty").eq("user_id", auth.user.id).gt("qty", 0),
  ]);
  return { orders: (orders.data ?? []) as ShopOrder[], pantry: Object.fromEntries((pantry.data ?? []).map((r) => [r.item as string, r.qty as number])) };
}
/** Use one item from your pantry: returns the everyday activity it counts as. */
export async function consumePantryItem(item: string) {
  if (!shopItem(item)) return { ok: false as const, error: MEGAMART_ERRORS.invalid };
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, error: megamartError() };
  const { data, error } = await sb.rpc("pantry_use", { p_item: item });
  if (error) return { ok: false as const, error: megamartError(error.message) };
  return { ok: true as const, activity: data as string };
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

// ── Learning in the world ────────────────────────────────────────────────────
export type LearningFocus = { topicId: string; topicTitle: string; courseId: string; subject: string; reason: string; answered: number; correct: number };

/** The topic to work on next, from the learner's own subjects: the first untouched topic, else the weakest. */
export async function learningFocus(): Promise<LearningFocus | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return null;
  const [{ data: details }, { data: progress }, { COURSES }, { topicById }] = await Promise.all([
    sb.from("learner_details").select("subjects").eq("user_id", auth.user.id).maybeSingle(),
    sb.from("question_progress").select("topic_id,seen,correct,last_at").eq("user_id", auth.user.id).limit(5000),
    import("@/lib/data/courses"), import("@/lib/data/topics"),
  ]);
  const ids = (Array.isArray(details?.subjects) ? details.subjects : []).map((s: { courseId?: string }) => s.courseId);
  const courses = COURSES.filter((c) => ids.includes(c.id));
  const byTopic = new Map<string, { seen: number; correct: number }>();
  const today = new Date().toISOString().slice(0, 10);
  let answered = 0, correct = 0;
  for (const p of progress ?? []) {
    const t = byTopic.get(p.topic_id) ?? { seen: 0, correct: 0 };
    t.seen += p.seen; t.correct += p.correct;
    byTopic.set(p.topic_id, t);
    if (String(p.last_at).startsWith(today)) { answered++; if (p.correct > 0) correct++; }
  }
  let best: LearningFocus | null = null, bestScore = Infinity;
  for (const c of courses) {
    for (const [i, id] of c.topicIds.entries()) {
      const topic = topicById(id);
      if (!topic?.quiz.length) continue;
      const p = byTopic.get(id);
      const acc = p?.seen ? p.correct / p.seen : null;
      // Untouched topics in course order come first, then the weakest started topic.
      const score = acc === null ? i / 1000 : 1 + acc;
      if (acc !== null && acc >= 0.8) continue;
      if (score < bestScore) {
        bestScore = score;
        best = { topicId: id, topicTitle: topic.title, courseId: c.id, subject: c.subject, reason: acc === null ? "Not started yet" : `${Math.round(acc * 100)}% right so far`, answered, correct };
      }
    }
  }
  return best ?? (courses.length ? { topicId: "", topicTitle: "Everything is secure!", courseId: courses[0].id, subject: courses[0].subject, reason: "Keep topics fresh with a quick round", answered, correct } : null);
}

/** A few questions on one topic, for the in-world learning card. */
export async function topicQuiz(topicId: string, count = 3): Promise<GameQuestion[]> {
  const { QUESTION_BANK } = await import("@/lib/data/topics");
  const pool = QUESTION_BANK.filter((q) => q.topicId === topicId).sort(() => Math.random() - 0.5).slice(0, Math.max(1, Math.min(5, count)));
  return pool.map((q) => ({ id: q.key, key: q.key, prompt: q.q, options: q.options, answer: q.answer, explain: q.explain, subject: q.subject, topic: q.topicTitle, level: q.route }));
}

// ── In-game learning dashboard (pause menu) ──────────────────────────────────
export type InGameDashboard = {
  subjects: { courseId: string; subject: string; started: number; topics: number; accuracy: number | null; grade: string | null; next: string | null }[];
  learnNext: { courseId: string; topicId: string; title: string; subject: string; reason: string }[];
  thisWeek: number;
  mastery: { notStarted: number; needsWork: number; gettingThere: number; secure: number };
};

/** Your subjects, estimated grades and next topics, for the Learning tab in the pause menu. */
export async function inGameDashboard(): Promise<InGameDashboard | null> {
  const [{ getAccount }, { loadDashboard }, { estimateGrade }] = await Promise.all([
    import("@/lib/account/server"), import("@/lib/account/dashboard"), import("@/lib/account/estimate"),
  ]);
  const account = await getAccount();
  if (!account?.details) return null;
  const dash = await loadDashboard(account.id, account.details);
  return {
    subjects: dash.subjects.map((s) => {
      const answered = s.topics.reduce((n, t) => n + t.seen, 0);
      const est = estimateGrade(s.course.route, { accuracy: s.accuracy, started: s.started, topics: s.topics.length, answered });
      return { courseId: s.course.id, subject: s.course.subject, started: s.started, topics: s.topics.length, accuracy: s.accuracy, grade: est?.grade ?? null, next: est?.next ?? null };
    }),
    learnNext: dash.recommendations.slice(0, 4).map((r) => ({ courseId: r.stat.course.id, topicId: r.stat.topic.id, title: r.stat.topic.title, subject: r.stat.course.subject, reason: r.reason })),
    thisWeek: dash.thisWeekAnswered,
    mastery: { notStarted: dash.mastery["not-started"], needsWork: dash.mastery["needs-work"], gettingThere: dash.mastery["getting-there"], secure: dash.mastery.secure },
  };
}

// ── Practical roles (src/game/core/roles.ts) ────────────────────────────────
const ROLE_ERRORS: Record<string, string> = {
  not_allowed: "Log in with your IlluminatED account to work and earn Clout.",
  unknown_role: "That role isn't hiring right now.",
  plus_required: "This role is part of Plus Experience. Local and automotive roles are free for everyone.",
  rate_limited: "Take a breather: you've started a lot of jobs in the last minute.",
  too_fast: "That was too quick to be real work. Do each step properly to get paid.",
  already_claimed: "This job has already been paid.",
  expired: "This job timed out. Start a new one.",
  invalid: "Something went wrong with that job. Start a new one.",
  not_hired: "You need to be hired first: apply for the role and pass the interview.",
  already_hired: "You already work in this role.",
  cooldown: "They've just interviewed you. Read your feedback and reapply in 10 minutes.",
};
const roleError = (m?: string) => ROLE_ERRORS[Object.keys(ROLE_ERRORS).find((k) => m?.includes(k)) ?? ""] ?? "Couldn't reach the server. Try again in a moment.";

/** Your XP and jobs done in every practical role. */
export async function loadRoleCareers(): Promise<Record<string, { xp: number; jobs: number; earned: number }>> {
  const sb = await getSupabase();
  if (!sb) return {};
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) return {};
  const { data } = await sb.from("role_careers").select("role,xp,jobs,clout_earned").eq("user_id", auth.user.id);
  return Object.fromEntries((data ?? []).map((r) => [r.role as string, { xp: r.xp as number, jobs: r.jobs as number, earned: r.clout_earned as number }]));
}

/** Clock in for one job: the server records the start time. */
export async function startRoleJob(role: string) {
  if (!roleById(role)) return { ok: false as const, error: ROLE_ERRORS.unknown_role };
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, error: roleError() };
  const { data, error } = await sb.rpc("role_job_start", { p_role: role });
  if (error && notSetUp(error)) return { ok: true as const, claim: null };
  if (error) return { ok: false as const, error: roleError(error.message) };
  return { ok: true as const, claim: data as string };
}

/** Hand in a finished job: the server checks it and sets the pay. */
export async function finishRoleJob(claim: string, steps: number, accuracy: number) {
  if (typeof claim !== "string" || !/^[0-9a-f-]{36}$/i.test(claim) || !Number.isInteger(steps) || !Number.isFinite(accuracy))
    return { ok: false as const, error: ROLE_ERRORS.invalid };
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, error: roleError() };
  const { data, error } = await sb.rpc("role_job_finish", { p_claim: claim, p_steps: steps, p_accuracy: Math.max(0, Math.min(1, accuracy)) });
  if (error) return { ok: false as const, error: roleError(error.message) };
  revalidatePath("/games/world");
  const r = data as { pay: number; xp: number; total_xp: number; jobs: number; capped: boolean };
  return { ok: true as const, ...r };
}

// ── Co-op crews: a team bonus for doing a role's jobs together ─────────────
export type CrewStatus = { crew: string; role: string; paid: boolean; members: number; jobs: number; target: number; mine: number; bonus: number; open: boolean };
const CREW_ERRORS: Record<string, string> = {
  crew_closed: "That crew has finished or packed up.",
  crew_full: "That crew is full: four is the limit.",
  plus_required: ROLE_ERRORS.plus_required,
  not_allowed: ROLE_ERRORS.not_allowed,
  rate_limited: "You've started a lot of crews. Try again in a few minutes.",
};
const crewError = (m?: string) => CREW_ERRORS[Object.keys(CREW_ERRORS).find((k) => m?.includes(k)) ?? ""] ?? "Couldn't reach the server. Try again in a moment.";
const isId = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);
async function crewCall(fn: string, args: Record<string, unknown>) {
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, error: crewError() };
  const { data, error } = await sb.rpc(fn, args);
  if (error) return { ok: false as const, error: crewError(error.message) };
  return { ok: true as const, status: data as CrewStatus };
}
export async function createCrew(role: string) {
  if (!roleById(role)) return { ok: false as const, error: ROLE_ERRORS.unknown_role };
  return crewCall("coop_create", { p_role: role });
}
export async function joinCrew(crew: string) {
  if (!isId(crew)) return { ok: false as const, error: crewError("crew_closed") };
  return crewCall("coop_join", { p_crew: crew });
}
export async function creditCrew(crew: string, claim: string) {
  if (!isId(crew) || !isId(claim)) return { ok: false as const, error: crewError() };
  const r = await crewCall("coop_credit", { p_crew: crew, p_claim: claim });
  if (r.ok && r.status.paid) revalidatePath("/games/world");
  return r;
}
export async function crewStatus(crew: string) {
  if (!isId(crew)) return { ok: false as const, error: crewError() };
  return crewCall("coop_get", { p_crew: crew });
}

// ── Hotels (src/game/core/hotels.ts) ────────────────────────────────────────
export type HotelBooking = { id: string; hotel: string; room: string; room_type: string; rate: number; nights: number; paid: number; check_in: string; check_out: string };
const HOTEL_ERRORS: Record<string, string> = {
  not_allowed: "Log in with your IlluminatED account to book a room.",
  not_enough_clout: "Not enough Clout for that stay. Work a shift or play a game to earn some.",
  already_booked: "You already have a room booked. Check out first, or extend your stay.",
  no_rooms: "Sorry, that room type is fully booked right now. Try another.",
  no_booking: "You don't have a room booked.",
  too_long: "Stays can be up to 14 nights.",
  invalid: "Something went wrong with that booking. Try again.",
};
const hotelError = (m?: string) => HOTEL_ERRORS[Object.keys(HOTEL_ERRORS).find((k) => m?.includes(k)) ?? ""] ?? "Couldn't reach the server. Try again in a moment.";
const HOTEL_COLUMNS = "id,hotel,room,room_type,rate,nights,paid,check_in,check_out";

/** Your current stay, if you have one. */
export async function loadHotelBooking(): Promise<HotelBooking | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) return null;
  const { data } = await sb.from("hotel_bookings").select(HOTEL_COLUMNS).eq("user_id", auth.user.id).is("ended_at", null)
    .gt("check_out", new Date().toISOString()).order("check_out", { ascending: false }).limit(1).maybeSingle();
  return (data as HotelBooking | null) ?? null;
}
/** Nightly rates and free rooms of each type. */
export async function hotelAvailability(hotel: string): Promise<Record<string, { rate: number; free: number }>> {
  if (!isHotel(hotel)) return {};
  const sb = await getSupabase();
  if (!sb) return {};
  const { data } = await sb.rpc("hotel_availability", { p_hotel: hotel });
  return (data as Record<string, { rate: number; free: number }>) ?? {};
}
export async function bookHotel(hotel: string, type: string, nights: number) {
  if (!isHotel(hotel) || !(type in ROOM_TYPES) || !Number.isInteger(nights) || nights < 1 || nights > MAX_NIGHTS) return { ok: false as const, error: HOTEL_ERRORS.invalid };
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, error: hotelError() };
  const { data, error } = await sb.rpc("hotel_book", { p_hotel: hotel, p_type: type, p_nights: nights });
  if (error) return { ok: false as const, error: hotelError(error.message) };
  revalidatePath("/games/world");
  return { ok: true as const, booking: data as HotelBooking };
}
export async function extendHotel(nights: number) {
  if (!Number.isInteger(nights) || nights < 1 || nights > MAX_NIGHTS) return { ok: false as const, error: HOTEL_ERRORS.invalid };
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, error: hotelError() };
  const { data, error } = await sb.rpc("hotel_extend", { p_nights: nights });
  if (error) return { ok: false as const, error: hotelError(error.message) };
  revalidatePath("/games/world");
  return { ok: true as const, booking: data as HotelBooking };
}
export async function checkOutHotel() {
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, error: hotelError() };
  const { data, error } = await sb.rpc("hotel_checkout");
  if (error) return { ok: false as const, error: hotelError(error.message) };
  revalidatePath("/games/world");
  return { ok: true as const, refund: (data as number) ?? 0 };
}

// ── Pets (src/game/core/pets.ts) ────────────────────────────────────────────
const PET_ERRORS: Record<string, string> = {
  not_allowed: "Log in with your IlluminatED account to adopt a pet.",
  not_enough_clout: "Not enough Clout yet. Work a shift or play a game to earn some.",
  too_many_pets: "You've got a full house: six pets is the limit.",
  invalid_name: "Names can use letters, numbers, spaces and hyphens (up to 20).",
  unknown_item: "That pet isn't at the rescue centre.",
};
const petError = (m?: string) => PET_ERRORS[Object.keys(PET_ERRORS).find((k) => m?.includes(k)) ?? ""] ?? "Couldn't reach the server. Try again in a moment.";

export async function loadPets(): Promise<Pet[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) return [];
  const { data } = await sb.from("player_pets").select("id,kind,name,colour,accessory,equipped,fed_at,watered_at,washed_at,slept_at,played_at,care_done,care_day").eq("user_id", auth.user.id).order("adopted_at");
  return (data ?? []) as Pet[];
}
export async function adoptPet(kind: string, name: string, colour: string) {
  if (!PETS.some((p) => p.kind === kind) || !/^#[0-9a-f]{6}$/i.test(colour)) return { ok: false as const, error: PET_ERRORS.unknown_item };
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, error: petError() };
  const { data, error } = await sb.rpc("pet_adopt", { p_kind: kind, p_name: name.trim().slice(0, 20), p_colour: colour });
  if (error) return { ok: false as const, error: petError(error.message) };
  revalidatePath("/games/world");
  return { ok: true as const, id: data as string };
}
export async function updatePet(id: string, change: { name?: string; accessory?: string; equipped?: boolean }) {
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, error: petError() };
  const { error } = await sb.rpc("pet_update", { p_pet: id, p_name: change.name ?? null, p_accessory: change.accessory ?? null, p_equipped: change.equipped ?? null });
  return error ? { ok: false as const, error: petError(error.message) } : { ok: true as const };
}
export async function carePet(id: string, action: string) {
  if (!["feed", "water", "wash", "sleep", "play"].includes(action)) return { ok: false as const, error: petError() };
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, error: petError() };
  const { data, error } = await sb.rpc("pet_care", { p_pet: id, p_action: action });
  return error ? { ok: false as const, error: petError(error.message) } : { ok: true as const, paid: (data as number) ?? 0 };
}


// ── Hiring for practical roles ───────────────────────────────────────────────
/** Roles you've been hired for. */
export async function loadRoleHires(): Promise<string[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) return [];
  const { data } = await sb.from("role_hires").select("role").eq("user_id", auth.user.id);
  return (data ?? []).map((r) => r.role as string);
}

/** Sign in at reception: the server issues the interview (and starts the clock). */
export async function startRoleInterview(role: string) {
  if (!roleById(role)) return { ok: false as const, error: ROLE_ERRORS.unknown_role };
  const sb = await getSupabase();
  const { data: auth } = sb ? await sb.auth.getUser() : { data: null };
  // Guests and previews interview locally; nothing is saved.
  if (!sb || !auth?.user) return { ok: true as const, claim: null, seed: 1 + Math.floor(Math.random() * 2_000_000_000) };
  const { data, error } = await sb.rpc("role_interview_start", { p_role: role });
  if (error && notSetUp(error)) return { ok: true as const, claim: null, seed: 1 + Math.floor(Math.random() * 2_000_000_000) };
  if (error) return { ok: false as const, error: roleError(error.message) };
  const d = data as { claim: string; seed: number };
  return { ok: true as const, claim: d.claim, seed: d.seed };
}

/** Hand in the interview: the server rebuilds it from the seed and scores every answer itself. */
export async function finishRoleInterview(role: string, claim: string | null, seed: number, answers: (number | string)[]): Promise<{ ok: true; card: Scorecard } | { ok: false; error: string }> {
  const r = roleById(role);
  if (!r || !Number.isInteger(seed) || seed < 1 || !Array.isArray(answers) || answers.length > 60 || answers.some((a) => typeof a === "string" ? a.length > 80 : !Number.isFinite(a)))
    return { ok: false, error: ROLE_ERRORS.invalid };
  const plan = buildInterviewPlan(roleSpec(r), seed);
  if (answers.length !== answerCount(plan)) return { ok: false, error: ROLE_ERRORS.invalid };
  const card = scoreInterview(plan, answers);
  if (!claim) return { ok: true, card };
  if (!/^[0-9a-f-]{36}$/i.test(claim)) return { ok: false, error: ROLE_ERRORS.invalid };
  const sb = await getSupabase();
  if (!sb) return { ok: false, error: roleError() };
  const { error } = await sb.rpc("role_interview_finish", { p_claim: claim, p_seed: seed, p_passed: card.passed, p_average: card.average });
  if (error) return { ok: false, error: error.message.includes("too_fast") ? "That interview was too quick to be real. Take your time with each answer." : roleError(error.message) };
  return { ok: true, card };
}

/** Accept the offer: you're hired. */
export async function acceptRoleOffer(claim: string | null) {
  if (!claim) return { ok: true as const };
  if (!/^[0-9a-f-]{36}$/i.test(claim)) return { ok: false as const, error: ROLE_ERRORS.invalid };
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, error: roleError() };
  const { error } = await sb.rpc("role_offer_accept", { p_claim: claim });
  if (error) return { ok: false as const, error: roleError(error.message) };
  revalidatePath("/games/world");
  return { ok: true as const };
}
