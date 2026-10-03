import "server-only";

import type { LearnerDetails } from "./details";
import { practiceReadiness } from "./readiness";

import { courseById } from "@/lib/data/courses";
import { BOARDS } from "@/lib/data/routes";
import { TOPICS } from "@/lib/data/topics";
import { getSupabase } from "@/lib/social/server";
import type { Course, Topic } from "@/lib/types";

export type TopicStatus =
  | "not-started"
  | "needs-work"
  | "getting-there"
  | "secure";

export interface TopicStat {
  topic: Topic;
  course: Course;
  flagged: boolean;
  questions: number;
  answered: number;
  seen: number;
  correct: number;
  accuracy: number | null;
  lastAt: string | null;
  status: TopicStatus;
}

export interface Recommendation {
  stat: TopicStat;
  reason: string;
}

export interface SubjectSummary {
  course: Course;
  board: string | null;
  topics: TopicStat[];
  started: number;
  accuracy: number | null;
}

export interface RoundRow {
  mode: string;
  correct: number;
  total: number;
  createdAt: string;
}

export interface DashboardData {
  subjects: SubjectSummary[];
  recommendations: Recommendation[];
  otherTopics: TopicStat[];
  rounds: RoundRow[];
  totals: { answered: number; correct: number; roundsThisWeek: number };
  /** Last 8 weeks (Monday to Sunday), oldest first. Quiz rounds only, not imports. */
  weekly: { label: string; start: string; answered: number; correct: number }[];
  thisWeekAnswered: number;
  mastery: Record<TopicStatus, number>;
  readiness: {
    courseId: string;
    result: ReturnType<typeof practiceReadiness>;
  }[];
  loadError: boolean;
}

/** Monday 00:00 (local server time) of the week containing d. */
function weekStart(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

const statusFor = (seen: number, accuracy: number | null): TopicStatus =>
  !seen || accuracy === null
    ? "not-started"
    : accuracy < 0.6
      ? "needs-work"
      : accuracy < 0.8
        ? "getting-there"
        : "secure";

export const STATUS_TEXT: Record<TopicStatus, string> = {
  "not-started": "Not started",
  "needs-work": "Needs work",
  "getting-there": "Getting there",
  secure: "Secure",
};

export async function loadDashboard(
  userId: string,
  details: LearnerDetails,
): Promise<DashboardData> {
  const sb = (await getSupabase())!;
  const [progress, rounds] = await Promise.all([
    sb
      .from("question_progress")
      .select("question_key, topic_id, seen, correct, last_at")
      .eq("user_id", userId)
      .limit(5000),
    sb
      .from("quiz_rounds")
      .select("mode, correct, total, created_at")
      .eq("user_id", userId)
      .gte("created_at", new Date(Date.now() - 70 * 864e5).toISOString())
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  const byTopic = new Map<
    string,
    { answered: number; seen: number; correct: number; lastAt: string | null }
  >();
  for (const r of progress.data ?? []) {
    const cur = byTopic.get(r.topic_id) ?? {
      answered: 0,
      seen: 0,
      correct: 0,
      lastAt: null,
    };
    cur.answered += r.seen > 0 ? 1 : 0;
    cur.seen += r.seen;
    cur.correct += r.correct;
    if (!cur.lastAt || r.last_at > cur.lastAt) cur.lastAt = r.last_at;
    byTopic.set(r.topic_id, cur);
  }

  const flagged = new Set(details.helpTopics);
  const statFor = (topic: Topic): TopicStat | null => {
    const course = courseById(topic.courseId);
    if (!course) return null;
    const p = byTopic.get(topic.id);
    const seen = p?.seen ?? 0;
    const accuracy = seen ? p!.correct / seen : null;
    return {
      topic,
      course,
      flagged: flagged.has(topic.id),
      questions: topic.quiz.length,
      answered: p?.answered ?? 0,
      seen,
      correct: p?.correct ?? 0,
      accuracy,
      lastAt: p?.lastAt ?? null,
      status: statusFor(seen, accuracy),
    };
  };

  const subjectIds = new Set(details.subjects.map((s) => s.courseId));
  const subjects: SubjectSummary[] = details.subjects
    .map((s) => {
      const course = courseById(s.courseId);
      if (!course) return null;
      const topics = TOPICS.filter((t) => course.topicIds.includes(t.id))
        .map(statFor)
        .filter(Boolean) as TopicStat[];
      const seen = topics.reduce((a, t) => a + t.seen, 0);
      const correct = topics.reduce((a, t) => a + t.correct, 0);
      return {
        course,
        board:
          s.board && s.board !== "unsure"
            ? (BOARDS[s.board]?.short ?? null)
            : null,
        topics,
        started: topics.filter((t) => t.seen > 0).length,
        accuracy: seen ? correct / seen : null,
      };
    })
    .filter(Boolean) as SubjectSummary[];

  const mine = subjects.flatMap((s) => s.topics);
  const now = Date.now();
  const scored = mine.map((stat) => {
    let score = 0;
    const reasons: string[] = [];
    if (stat.flagged) {
      score += 3;
      reasons.push("You asked for help with this");
    }
    if (stat.status === "needs-work") {
      score += 3;
      reasons.push(`${Math.round(stat.accuracy! * 100)}% correct so far`);
    } else if (stat.status === "not-started") {
      score += 2;
      if (!stat.flagged) reasons.push("Not tried yet");
    } else if (stat.status === "getting-there") {
      score += 1;
      reasons.push(
        `${Math.round(stat.accuracy! * 100)}% correct, nearly there`,
      );
    }
    if (
      stat.lastAt &&
      now - new Date(stat.lastAt).getTime() > 14 * 864e5 &&
      stat.status !== "not-started"
    ) {
      score += 1;
      reasons.push("Not practised for over two weeks");
    }
    return { stat, score, reason: reasons.join(". ") };
  });
  const recommendations = scored
    .filter((s) => s.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.stat.topic.title.localeCompare(b.stat.topic.title),
    )
    .slice(0, 5)
    .map(({ stat, reason }) => ({ stat, reason }));

  const otherTopics = TOPICS.filter(
    (t) => !subjectIds.has(t.courseId) && byTopic.has(t.id),
  )
    .map(statFor)
    .filter(Boolean) as TopicStat[];

  const roundRows: RoundRow[] = (rounds.data ?? []).map((r) => ({
    mode: r.mode,
    correct: r.correct,
    total: r.total,
    createdAt: r.created_at,
  }));
  const weekAgo = now - 7 * 864e5;

  const all = [...byTopic.values()];

  const thisMonday = weekStart(new Date());
  const weekly = Array.from({ length: 8 }, (_, i) => {
    const start = new Date(thisMonday);
    start.setDate(start.getDate() - (7 - i) * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const inWeek = roundRows.filter((r) => {
      const t = new Date(r.createdAt).getTime();
      return r.mode !== "import" && t >= start.getTime() && t < end.getTime();
    });
    return {
      label: start.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      }),
      start: start.toISOString(),
      answered: inWeek.reduce((a, r) => a + r.total, 0),
      correct: inWeek.reduce((a, r) => a + r.correct, 0),
    };
  });
  const mastery: Record<TopicStatus, number> = {
    "not-started": 0,
    "needs-work": 0,
    "getting-there": 0,
    secure: 0,
  };
  mine.forEach((t) => (mastery[t.status] += 1));
  return {
    subjects,
    recommendations,
    otherTopics,
    rounds: roundRows.slice(0, 8),
    totals: {
      answered: all.reduce((a, t) => a + t.seen, 0),
      correct: all.reduce((a, t) => a + t.correct, 0),
      roundsThisWeek: roundRows.filter(
        (r) => new Date(r.createdAt).getTime() > weekAgo && r.mode !== "import",
      ).length,
    },
    weekly,
    thisWeekAnswered: weekly[weekly.length - 1].answered,
    mastery,
    readiness: details.subjects.map((s) => ({
      courseId: s.courseId,
      result: practiceReadiness(s, progress.data ?? []),
    })),
    loadError: Boolean(progress.error || rounds.error),
  };
}
