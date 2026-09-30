"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AGE_BANDS, STAGES, type StudySubject, YEAR_GROUPS } from "./details";
import { safeNext } from "./paths";

import { COURSES } from "@/lib/data/courses";
import { TOPICS } from "@/lib/data/topics";
import { getSupabase, getViewer } from "@/lib/social/server";

export type FormState = {
  ok?: boolean;
  error?: string;
  message?: string;
  step?: number;
} | null;

const NOT_CONNECTED =
  "Accounts aren't connected to the database yet, so this can't be saved.";

export async function sendSignInLink(
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  const sb = await getSupabase();
  if (!sb) return { error: NOT_CONNECTED };
  const email = String(fd.get("email") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200)
    return { error: "Enter a valid email address." };
  const h = await headers();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const next = safeNext(fd.get("next"));
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error)
    return {
      error:
        error.status === 429
          ? "Too many attempts. Wait a few minutes and try again."
          : "We couldn't send the email. Check the address and try again.",
    };
  return {
    ok: true,
    message: `We've sent a sign-in link to ${email}. Open it on this device. It works once and expires in an hour.`,
  };
}

/** After signing in, send people to onboarding until their account is set up. */
async function afterSignIn(userId: string, next: string): Promise<never> {
  const sb = (await getSupabase())!;
  const [{ data: profile }, { data: details }] = await Promise.all([
    sb.from("profiles").select("id").eq("id", userId).maybeSingle(),
    sb
      .from("learner_details")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  redirect(
    profile && details ? next : `/onboarding?next=${encodeURIComponent(next)}`,
  );
}

const validEmail = (e: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 200;

export async function signInWithPassword(
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  const sb = await getSupabase();
  if (!sb) return { error: NOT_CONNECTED };
  const email = String(fd.get("email") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  if (!validEmail(email)) return { error: "Enter a valid email address." };
  if (!password) return { error: "Enter your password." };
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    const m = error?.message?.toLowerCase() ?? "";
    return {
      error: m.includes("email not confirmed")
        ? "Please confirm your email first. Check your inbox for the link we sent."
        : error?.status === 429
          ? "Too many attempts. Wait a few minutes and try again."
          : "That email and password don't match. Check them, or create an account.",
    };
  }
  return afterSignIn(data.user.id, safeNext(fd.get("next")));
}

export async function signUpWithPassword(
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  const sb = await getSupabase();
  if (!sb) return { error: NOT_CONNECTED };
  const email = String(fd.get("email") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  if (!validEmail(email)) return { error: "Enter a valid email address." };
  if (password.length < 8)
    return { error: "Use a password with at least 8 characters." };
  if (password.length > 72)
    return { error: "Use a password with 72 characters or fewer." };
  const next = safeNext(fd.get("next"));
  const h = await headers();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    const m = error.message.toLowerCase();
    return {
      error: m.includes("already registered")
        ? "There's already an account with that email. Sign in instead."
        : m.includes("password")
          ? "Choose a stronger password: at least 8 characters, not a common one."
          : error.status === 429
            ? "Too many attempts. Wait a few minutes and try again."
            : "We couldn't create your account. Please try again.",
    };
  }
  // If email confirmation is switched on, there's no session until they click the link.
  if (!data.session || !data.user)
    return {
      ok: true,
      message: `Nearly there. We've sent a confirmation link to ${email}. Open it to finish creating your account.`,
    };
  return afterSignIn(data.user.id, next);
}

export async function signOut() {
  const sb = await getSupabase();
  await sb?.auth.signOut();
  redirect("/");
}

/** Onboarding and "edit your details" both save through here. */
export async function saveDetails(
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  const sb = await getSupabase();
  if (!sb) return { error: NOT_CONNECTED };
  const viewer = await getViewer();
  if (!viewer)
    return { error: "Your sign-in has expired. Please sign in again." };

  const needsProfile = !viewer.profile;
  const username = String(fd.get("username") ?? "").trim();
  if (needsProfile) {
    if (!/^[A-Za-z0-9_]{3,20}$/.test(username))
      return {
        step: 0,
        error:
          "Usernames are 3 to 20 characters: letters, numbers and underscores only.",
      };
  }

  const ageBand = String(fd.get("ageBand") ?? "");
  const stage = String(fd.get("stage") ?? "");
  const yearGroup = String(fd.get("yearGroup") ?? "");
  if (!AGE_BANDS.some((a) => a.id === ageBand))
    return { step: 0, error: "Tell us your age range." };
  if (!STAGES.some((s) => s.id === stage))
    return { step: 0, error: "Choose what you're studying." };
  if (!YEAR_GROUPS.some((y) => y.id === yearGroup))
    return { step: 0, error: "Choose your year group." };

  const subjects: StudySubject[] = [];
  for (const raw of fd.getAll("subject")) {
    const courseId = String(raw);
    const course = COURSES.find((c) => c.id === courseId);
    if (!course || subjects.some((s) => s.courseId === courseId)) continue;
    const board = String(fd.get(`board:${courseId}`) ?? "unsure");
    subjects.push({
      courseId,
      board: (course.boards as string[]).includes(board)
        ? (board as StudySubject["board"])
        : "unsure",
    });
  }
  if (!subjects.length)
    return { step: 1, error: "Choose at least one subject." };
  if (subjects.length > 15)
    return { step: 1, error: "Choose up to 15 subjects." };

  const topicIds = new Set(TOPICS.map((t) => t.id));
  const helpTopics = [...new Set(fd.getAll("helpTopic").map(String))].filter(
    (t) => topicIds.has(t),
  );
  const helpNote =
    String(fd.get("helpNote") ?? "")
      .trim()
      .slice(0, 500) || null;
  const examDateRaw = String(fd.get("examDate") ?? "");
  const examDate = /^\d{4}-\d{2}-\d{2}$/.test(examDateRaw) ? examDateRaw : null;

  if (needsProfile) {
    if (fd.get("age") !== "on")
      return { step: 2, error: "You need to be 13 or over to join." };
    if (fd.get("rules") !== "on")
      return { step: 2, error: "Please agree to the community guidelines." };
    const { error } = await sb
      .from("profiles")
      .insert({ id: viewer.id, username });
    if (error)
      return {
        step: 0,
        error:
          error.code === "23505"
            ? "That username is taken. Try another."
            : "We couldn't create your account. Please try again.",
      };
  }

  const { error } = await sb.from("learner_details").upsert({
    user_id: viewer.id,
    stage,
    year_group: yearGroup,
    age_band: ageBand,
    subjects,
    help_topics: helpTopics,
    help_note: helpNote,
    exam_date: examDate,
    updated_at: new Date().toISOString(),
  });
  if (error)
    return { error: "We couldn't save your details. Please try again." };

  revalidatePath("/dashboard");
  if (fd.get("mode") === "edit")
    return { ok: true, message: "Your details are saved." };
  redirect(safeNext(fd.get("next")));
}
