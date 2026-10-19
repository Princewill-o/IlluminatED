"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { WORKPLACES, buildInterview, buildShift, checkAnswer, roleOf } from "@/game/core/careers";
import { FURNITURE, HOMES, validLayout } from "@/game/core/homes";
import { newSeed } from "@/game/core/rng";
import { issueCareerReceipt, readCareerReceipt } from "@/lib/game/career-receipt";
import { getSupabase } from "@/lib/social/server";
import { stripeLive } from "@/lib/stripe";

const FRIENDLY: Record<string, string> = {
  overlap: "That furniture overlaps another item.",
  door_blocked: "Keep the front door clear.",
  unreachable: "Leave a clear walking path to the front of every item.",
  not_allowed: "Sign in with your IlluminatED account to work and save.",
  cooldown: "They've just interviewed you. Brush up and try again in 10 minutes.",
  already_hired: "You already work here.",
  no_job: "You need a job first. Pop into the job centre.",
  too_fast: "That shift was a bit quick to be real. Take your time on each task.",
  rate_limited: "Take a short break between shifts (45 seconds).",
  not_enough_clout: "Not enough Clout yet. Work a few shifts to earn more!",
  career_subscription_required: "Plus+ Experience is required to complete simulated workplace activities. Explore workplaces for free and compare plans at /pricing.",
  unknown_item: "That item isn't for sale.",
  too_many: "You've got plenty of those already.",
  not_owned: "You need to buy that first.",
  out_of_room: "That doesn't fit in the room.",
  invalid: "That didn't save. Try again.",
};
const friendly = (m?: string) => FRIENDLY[Object.keys(FRIENDLY).find((k) => m?.includes(k)) ?? ""] ?? "Couldn't reach the server. Try again in a moment.";
type Result<T = Record<string, unknown>> = { ok: true; data: T } | { ok: false; error: string };

async function rpc<T>(fn: string, args: Record<string, unknown>, paths: string[]): Promise<Result<T>> {
  const sb = await getSupabase();
  if (!sb) return { ok: false, error: friendly() };
  const { data, error } = await sb.rpc(fn, args);
  if (error) return { ok: false, error: friendly(error.message) };
  paths.forEach((p) => revalidatePath(p));
  return { ok: true, data: data as T };
}

/** Sessions are signed by the server; scores and elapsed time never come from the browser. */
export async function startCareerSession(workplace: string, mode: "shift" | "interview") {
  const secret = process.env.BILLING_CALLBACK_SECRET?.trim() ?? "";
  if (secret.length < 32 || !WORKPLACES.some(w => w.id === workplace) || !["shift","interview"].includes(mode))
    return {ok:false as const,error:"Verified career sessions are unavailable. Please use subject practice while setup is completed."};
  const sb = await getSupabase();
  const {data:auth} = sb ? await sb.auth.getUser() : {data:null};
  if (!sb || !auth?.user) return {ok:false as const,error:FRIENDLY.not_allowed};
  const { data: subscription } = await sb.from("billing_accounts").select("tier,status,period_end").eq("user_id", auth.user.id).eq("livemode", stripeLive).maybeSingle();
  if (subscription?.tier !== "plus_experience" || !["active", "trialing", "past_due"].includes(subscription.status) || subscription.period_end && Date.parse(subscription.period_end) <= Date.now())
    return {ok:false as const,error:FRIENDLY.career_subscription_required};
  const readiness = await sb.rpc("career_verified_ready", {p_secret:secret});
  if (readiness.error || readiness.data !== true) return {ok:false as const,error:"Verified career rewards are being prepared. Subject practice is still available."};
  let role = WORKPLACES.find(w => w.id === workplace)!.roles[0].id;
  if (mode === "shift") {
    const {data:job,error} = await sb.from("career_jobs").select("role,workplace").eq("user_id",auth.user.id).eq("status","active").maybeSingle();
    if (error || !job || job.workplace !== workplace) return {ok:false as const,error:FRIENDLY.no_job};
    role = job.role;
  }
  const seed = newSeed();
  return {ok:true as const,seed,token:issueCareerReceipt({user:auth.user.id,workplace,role,mode,seed},secret)};
}

export async function completeCareerSession(token: string, answers: (number|string)[]) {
  const parsed = z.object({token:z.string().max(2048),answers:z.array(z.union([z.number().finite(),z.string().max(80)])).min(3).max(5)}).safeParse({token,answers});
  if (!parsed.success) return {ok:false as const,error:FRIENDLY.invalid};
  const secret = process.env.BILLING_CALLBACK_SECRET?.trim() ?? "";
  const sb = await getSupabase();
  const {data:auth} = sb ? await sb.auth.getUser() : {data:null};
  if (!sb || !auth?.user) return {ok:false as const,error:FRIENDLY.not_allowed};
  const receipt = readCareerReceipt(token,auth.user.id,secret);
  const role = receipt ? roleOf(receipt.workplace,receipt.role) : null;
  if (!receipt || !role) return {ok:false as const,error:"This work session expired or is invalid. Start a new session."};
  if (receipt.mode === "shift") {
    const {data:job} = await sb.from("career_jobs").select("role,workplace").eq("user_id",auth.user.id).eq("status","active").maybeSingle();
    if (!job || job.role !== role.id || job.workplace !== receipt.workplace) return {ok:false as const,error:"Your role changed. Start a new shift."};
  }
  const tasks = receipt.mode === "shift" ? buildShift(role,receipt.seed) : buildInterview(role,receipt.seed);
  if (answers.length !== tasks.length) return {ok:false as const,error:FRIENDLY.invalid};
  const skills: Record<string,[number,number]> = {};
  let correct = 0;
  tasks.forEach((task,i) => { const ok = checkAnswer(task,answers[i]); correct += Number(ok); const skill = skills[task.skill] ??= [0,0]; skill[0] += Number(ok); skill[1]++; });
  const duration = Date.now()-receipt.started;
  if (duration < (receipt.mode === "shift" ? 15000 : 6000)) return {ok:false as const,error:FRIENDLY.too_fast};
  return rpc<{passed:boolean;role:string;pay:number;promoted:boolean}>("career_complete_verified",{p_secret:secret,p_claim:receipt.id,p_mode:receipt.mode,p_workplace:receipt.workplace,p_role:receipt.role,p_seed:receipt.seed,p_correct:correct,p_duration_ms:duration,p_skills:skills},["/games/careers","/games/world","/me"]);
}

export async function quitJob() {
  return rpc("career_quit", {}, ["/games/careers"]);
}

export async function buyHome(home: string) {
  if (!HOMES.some((h) => h.id === home)) return { ok: false as const, error: FRIENDLY.invalid };
  return rpc("home_buy", { p_home: home }, ["/games/home", "/games/world"]);
}

export async function buyFurniture(item: string) {
  if (!FURNITURE.some((f) => f.id === item && !f.starter)) return { ok: false as const, error: FRIENDLY.unknown_item };
  return rpc("furniture_buy", { p_item: item }, ["/games/home"]);
}

export async function saveLayout(layout: { key: string; item: string; x: number; y: number }[]) {
  const parsed = z.array(z.object({ key: z.string().min(1).max(40), item: z.string().max(60), x: z.number().int(), y: z.number().int() })).max(40).safeParse(layout);
  if (!parsed.success) return { ok: false as const, error: FRIENDLY.invalid };
  const problem = validLayout(layout);
  if (problem) return { ok: false as const, error: problem };
  return rpc("home_save_layout", { p_layout: layout.map(({ key, item, x, y }) => ({ key: key.slice(0, 40), item, x, y })) }, ["/games/home", "/games/world"]);
}
