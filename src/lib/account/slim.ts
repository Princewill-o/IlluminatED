import type { SlimCourse, SlimTopic } from "@/components/account/details-form";
import { COURSES } from "@/lib/data/courses";
import { BOARDS } from "@/lib/data/routes";
import { TOPICS } from "@/lib/data/topics";

/** Just enough course and topic data for the account forms. */
export const slimCourses = (): SlimCourse[] =>
  COURSES.map((c) => ({
    id: c.id,
    title: c.title,
    route: c.route,
    boards: c.boards.map((b) => ({ id: b, short: BOARDS[b]?.short ?? b })),
  }));

export const slimTopics = (): SlimTopic[] =>
  TOPICS.map((t) => ({ id: t.id, title: t.title, courseId: t.courseId }));
