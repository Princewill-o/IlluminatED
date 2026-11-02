"use server";

import { revalidatePath } from "next/cache";

import type {
  SubjectQuestBoard,
  SubjectQuestContent,
  SubjectQuestResult,
  SubjectQuestSession,
} from "@/game/core/subject-quests";
import { requireAccount } from "@/lib/account/server";
import { lessonAdaptation } from "@/lib/education/lesson-adaptation";
import { oakLesson } from "@/lib/server/oak-library";
import { getSupabase } from "@/lib/social/server";

const valid = (value: string) => /^[a-z0-9-]{2,120}$/.test(value);
const errors: Record<string, string> = {
  subject_not_selected:
    "Choose this subject in your account settings before starting its quests.",
  unknown_quest: "That quest is not available.",
  review_first: "Read the lesson and mark it reviewed before practising.",
  quests_incomplete:
    "Complete every topic quest with two passes of 80% or more before this checkpoint.",
  take_your_time:
    "Take a moment to work through each question, then submit again.",
  no_questions:
    "This topic does not have scored questions yet. You can still read its lesson.",
  rate_limited: "Take a short break before starting more quests.",
  session_unavailable:
    "This attempt expired or is no longer available. Start a new one.",
};
const friendly = (message?: string) =>
  Object.entries(errors).find(([key]) => message?.includes(key))?.[1] ??
  "Your quest could not be saved. Check your connection and try again.";
export async function loadSubjectQuests() {
  const sb = await getSupabase();
  if (!sb)
    return { ok: false as const, error: "Sign in to save study quests." };
  const { data, error } = await sb.rpc("subject_quest_board");
  return error
    ? { ok: false as const, error: friendly(error.message) }
    : { ok: true as const, board: data as SubjectQuestBoard };
}
export async function chooseSubjectQuest(
  course: string,
  topic: string,
  review = false,
) {
  if (!valid(course) || !valid(topic))
    return { ok: false as const, error: errors.unknown_quest };
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, error: "Sign in to choose a quest." };
  const { data, error } = await sb.rpc("subject_quest_choose", {
    p_course: course,
    p_topic: topic,
    p_review: review === true,
  });
  return error
    ? { ok: false as const, error: friendly(error.message) }
    : { ok: true as const, content: data as SubjectQuestContent };
}
export async function startSubjectQuest(course: string, topic: string | null) {
  if (!valid(course) || (topic !== null && !valid(topic)))
    return { ok: false as const, error: errors.unknown_quest };
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, error: "Sign in to start a quest." };
  const { data, error } = await sb.rpc("subject_quest_start", {
    p_course: course,
    p_topic: topic,
  });
  return error
    ? { ok: false as const, error: friendly(error.message) }
    : { ok: true as const, session: data as SubjectQuestSession };
}
export async function submitSubjectQuest(session: string, answers: number[]) {
  if (
    !/^[0-9a-f-]{36}$/i.test(session) ||
    !Array.isArray(answers) ||
    answers.length < 1 ||
    answers.length > 20 ||
    answers.some(
      (answer) => !Number.isInteger(answer) || answer < 0 || answer > 7,
    )
  )
    return {
      ok: false as const,
      error: "Answer every question before submitting.",
    };
  const sb = await getSupabase();
  if (!sb)
    return { ok: false as const, error: "Sign in to save this attempt." };
  const { data, error } = await sb.rpc("subject_quest_submit", {
    p_session: session,
    p_answers: answers,
  });
  if (error) return { ok: false as const, error: friendly(error.message) };
  for (const path of ["/games/world", "/learn", "/me"]) revalidatePath(path);
  return { ok: true as const, result: data as SubjectQuestResult };
}
/** Optional imported lesson, shown inside the game rather than sending the learner away. */
export async function questLibraryLesson(
  course: string,
  topic: string,
  requestedSlug?: string,
) {
  if (
    !valid(course) ||
    !valid(topic) ||
    (requestedSlug !== undefined && !/^[a-z0-9-]{1,250}$/.test(requestedSlug))
  )
    return null;
  const account = await requireAccount("/games/world");
  if (
    !account.details.subjects.some((subject) => subject.courseId === course) ||
    !course.startsWith("gcse-")
  )
    return null;
  const sb = await getSupabase();
  if (!sb) return null;
  const { data: quest } = await sb
    .from("subject_quest_catalogue")
    .select("title")
    .eq("course_id", course)
    .eq("topic_id", topic)
    .maybeSingle();
  if (!quest) return null;
  const subjects: Record<string, string> = {
    "gcse-maths": "maths",
    "gcse-english-language": "english",
    "gcse-english-literature": "english",
    "gcse-biology": "biology",
    "gcse-chemistry": "chemistry",
    "gcse-physics": "physics",
    "gcse-combined-science": "combined-science",
    "gcse-computer-science": "computing",
    "gcse-history": "history",
    "gcse-geography": "geography",
  };
  if (!subjects[course]) return null;
  const keyword = String(quest.title)
    .split(/\W+/)
    .find(
      (word) =>
        word.length > 4 &&
        !/^(working|understanding|introduction|practising)$/i.test(word),
    );
  if (!keyword) return null;
  const { data } = await sb
    .from("oak_lessons")
    .select("slug,title,unit_slug")
    .eq("key_stage", "ks4")
    .eq("subject", subjects[course])
    .eq("restricted", false)
    .textSearch("title", keyword, { type: "plain", config: "english" })
    .order("title")
    .order("slug")
    .limit(6);
  if (!data?.length) return null;
  const { data: unit } = await sb
    .from("oak_lessons")
    .select("slug,title,unit_slug")
    .eq("key_stage", "ks4")
    .eq("subject", subjects[course])
    .eq("restricted", false)
    .eq("unit_slug", data[0].unit_slug)
    .order("slug")
    .limit(20);
  const lessons = Array.from(
    new Map(
      [...data, ...(unit ?? [])].map((item) => [
        item.slug,
        { slug: item.slug, title: item.title },
      ]),
    ).values(),
  );
  const choice = requestedSlug
    ? lessons.find((item) => item.slug === requestedSlug)
    : lessons[0];
  if (!choice) return null;
  const lesson = await oakLesson(choice.slug);
  if (!lesson || lesson.restricted) return null;
  return {
    slug: lesson.slug,
    title: lesson.title,
    source: lesson.source_url,
    lessons,
    ...lessonAdaptation(lesson),
  };
}
