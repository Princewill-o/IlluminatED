"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AGE_BANDS, STAGES, type StudySubject, YEAR_GROUPS } from "./details";
import { safeNext } from "./paths";

import { COURSES } from "@/lib/data/courses";
import { TOPICS } from "@/lib/data/topics";
import { CAREER_ROUTES } from "@/lib/education/state";
import { getSupabase, getViewer } from "@/lib/social/server";

export type FormState = {
  ok?: boolean;
  error?: string;
  message?: string;
  step?: number;
} | null;

const NOT_CONNECTED =
  "Accounts aren't connected to the database yet, so this can't be saved.";

/** The site's own address, for links in emails. */
async function siteOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL)
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

/** Where password reset emails send people once the link has signed them in. */
const PASSWORD_PATH = "/account/password";

export async function sendSignInLink(
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  const sb = await getSupabase();
  if (!sb) return { error: NOT_CONNECTED };
  const email = String(fd.get("email") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200)
    return { error: "Enter a valid email address." };
  const origin = await siteOrigin();
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
      .select("user_id,tutorial_completed_at")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  redirect(
    profile && details
      ? details.tutorial_completed_at
        ? next
        : `/getting-started?next=${encodeURIComponent(next)}`
      : `/onboarding?next=${encodeURIComponent(next)}`,
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
  const origin = await siteOrigin();
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

/** "Forgot your password?": emails a link that signs them in and opens the new password page. */
export async function sendPasswordReset(
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  const sb = await getSupabase();
  if (!sb) return { error: NOT_CONNECTED };
  const email = String(fd.get("email") ?? "").trim();
  if (!validEmail(email)) return { error: "Enter a valid email address." };
  const site = await siteOrigin();
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: `${site}/auth/callback?next=${PASSWORD_PATH}`,
  });
  if (error?.status === 429)
    return { error: "Too many attempts. Wait a few minutes and try again." };
  // Same reply whether or not the account exists, so nobody can use this to check who's signed up.
  return {
    ok: true,
    message: `If there's an account for ${email}, we've sent it a link to reset your password. Open it on this device. It works once and expires in an hour.`,
  };
}

/** Sets a new password for whoever is signed in (including straight after a reset link). */
export async function updatePassword(
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  const sb = await getSupabase();
  if (!sb) return { error: NOT_CONNECTED };
  const viewer = await getViewer();
  if (!viewer)
    return { error: "Your sign-in has expired. Please sign in again." };
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (password.length < 8)
    return { error: "Use a password with at least 8 characters." };
  if (password.length > 72)
    return { error: "Use a password with 72 characters or fewer." };
  if (password !== confirm)
    return { error: "The two passwords don't match. Type them again." };
  const { error } = await sb.auth.updateUser({ password });
  if (error) {
    const m = error.message.toLowerCase();
    return {
      error: m.includes("different from the old")
        ? "That's your current password. Choose a new one."
        : m.includes("reauthenticat")
          ? "For your security, sign out and back in, then try again."
          : m.includes("password")
            ? "Choose a stronger password: at least 8 characters, not a common one."
            : error.status === 429
              ? "Too many attempts. Wait a few minutes and try again."
              : "We couldn't change your password. Please try again.",
    };
  }
  return { ok: true, message: "Your password has been changed." };
}

/** Starts an email change. Supabase only switches it over once the confirmation link is opened. */
export async function changeEmail(
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  const sb = await getSupabase();
  if (!sb) return { error: NOT_CONNECTED };
  const viewer = await getViewer();
  if (!viewer)
    return { error: "Your sign-in has expired. Please sign in again." };
  const email = String(fd.get("email") ?? "").trim();
  if (!validEmail(email)) return { error: "Enter a valid email address." };
  if (email.toLowerCase() === viewer.email?.toLowerCase())
    return { error: "That's already your email address." };
  const site = await siteOrigin();
  const { error } = await sb.auth.updateUser(
    { email },
    {
      emailRedirectTo: `${site}/auth/callback?next=${encodeURIComponent("/dashboard/settings")}`,
    },
  );
  if (error) {
    const m = error.message.toLowerCase();
    return {
      error:
        error.code === "email_exists" || m.includes("already")
          ? "That email address is already used by another account."
          : error.status === 429
            ? "Too many attempts. Wait a few minutes and try again."
            : "We couldn't change your email. Please try again.",
    };
  }
  return {
    ok: true,
    message: `We've sent a confirmation link to ${email}. Open it to finish the change. You might get one at your current address too; if so, open both. Until then, keep signing in with your current email.`,
  };
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

  // Once an age range is saved it's locked (a database trigger enforces this too), so don't send it again.
  const { data: existing } = await sb
    .from("learner_details")
    .select("age_band")
    .eq("user_id", viewer.id)
    .maybeSingle();
  const lockedAgeBand = (existing?.age_band as string | null) ?? null;

  const ageBand = String(fd.get("ageBand") ?? "");
  const stage = String(fd.get("stage") ?? "");
  const yearGroup = String(fd.get("yearGroup") ?? "");
  if (!lockedAgeBand && !AGE_BANDS.some((a) => a.id === ageBand))
    return { step: 0, error: "Tell us your age range." };
  if (!STAGES.some((s) => s.id === stage))
    return { step: 0, error: "Choose what you're studying." };
  if (!YEAR_GROUPS.some((y) => y.id === yearGroup))
    return { step: 0, error: "Choose your year group." };

  const careerRoute = String(fd.get("careerRoute") ?? "unsure");
  if (!CAREER_ROUTES.some((r) => r === careerRoute))
    return {
      step: 0,
      error: "Choose your next step, or select still deciding.",
    };
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
    if (fd.get("terms") !== "on")
      return {
        step: 2,
        error: "Please agree to the Terms and Privacy policy.",
      };
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

  const { error: careerError } = await sb.rpc("set_education_state_item", {
    p_namespace: "career",
    p_item: "route",
    p_value: careerRoute,
  });
  if (careerError)
    return {
      step: 0,
      error: "We couldn't save your next-step preference. Please try again.",
    };
  const row = {
    stage,
    year_group: yearGroup,
    subjects,
    help_topics: helpTopics,
    help_note: helpNote,
    exam_date: examDate,
    updated_at: new Date().toISOString(),
  };
  // A plain update when the row exists: an upsert without age_band would trip its NOT NULL check.
  const { error } = lockedAgeBand
    ? await sb.from("learner_details").update(row).eq("user_id", viewer.id)
    : await sb
        .from("learner_details")
        .upsert({ ...row, user_id: viewer.id, age_band: ageBand });
  if (error)
    return { error: "We couldn't save your details. Please try again." };

  revalidatePath("/dashboard");
  if (fd.get("mode") === "edit")
    return { ok: true, message: "Your details are saved." };
  const dest = safeNext(fd.get("next"));
  redirect(`/getting-started?next=${encodeURIComponent(dest)}`);
}

/** Mark the guided first-use tour complete for the signed-in learner. */
export async function completeFirstRunTutorial(fd: FormData) {
  const sb = await getSupabase();
  const viewer = await getViewer();
  if (!sb || !viewer) redirect("/sign-in?next=/getting-started");
  if (!viewer.profile) redirect("/onboarding");
  const { data: details, error: readError } = await sb
    .from("learner_details")
    .select("user_id")
    .eq("user_id", viewer.id)
    .maybeSingle();
  if (readError || !details) redirect("/onboarding");
  const { error } = await sb
    .from("learner_details")
    .update({ tutorial_completed_at: new Date().toISOString() })
    .eq("user_id", viewer.id)
    .is("tutorial_completed_at", null);
  if (error) redirect("/getting-started?error=save");
  const next = safeNext(fd.get("next"));
  revalidatePath("/dashboard");
  redirect(`/personalising?next=${encodeURIComponent(next)}`);
}

/** Sets (or clears) the learner's first exam date from the dashboard. */
export async function setExamDate(
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  const sb = await getSupabase();
  if (!sb) return { error: NOT_CONNECTED };
  const viewer = await getViewer();
  if (!viewer) return { error: "Please sign in again." };
  const raw = String(fd.get("examDate") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { error: "Choose a date." };
  const d = new Date(`${raw}T12:00:00`);
  const now = Date.now();
  if (d.getTime() < now - 864e5 || d.getTime() > now + 3 * 365 * 864e5)
    return { error: "Choose a date in the next three years." };
  const { error } = await sb
    .from("learner_details")
    .update({ exam_date: raw, updated_at: new Date().toISOString() })
    .eq("user_id", viewer.id);
  if (error) return { error: "We couldn't save the date. Please try again." };
  revalidatePath("/dashboard");
  return { ok: true, message: "Countdown started." };
}
