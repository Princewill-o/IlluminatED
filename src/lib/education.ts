import { courseById } from "@/lib/data/courses";
import oak from "@/lib/data/education/oak-catalogue.json";
import specifications from "@/lib/data/education/specifications.json";
import { topicsForCourse } from "@/lib/data/topics";
import { resourcesForCourse } from "@/lib/education/resources";

export interface CurriculumLesson {
  slug: string;
  title: string;
  url: string;
}
export interface CurriculumUnit {
  slug: string;
  title: string;
  url: string;
  lessons: CurriculumLesson[];
}
export interface CurriculumProgramme {
  slug: string;
  year: number;
  subject: string;
  courseIds: string[];
  board: string;
  tier: string;
  sourceUrl: string;
  checkedAt: string;
  units: CurriculumUnit[];
}
export interface Syllabus {
  courseId: string;
  board: string;
  code: string;
  url: string;
  checkedAt: string;
  pagesChecked: number;
  sectionPagesExpected: number;
  sections: { ref: string; title: string; url: string }[];
}
export const OAK_PROGRAMMES = oak.items as CurriculumProgramme[];
export const SYLLABUSES = specifications.items as Syllabus[];
export function curriculumForCourse(id: string) {
  const course = courseById(id);
  if (!course) return null;
  return {
    course: {
      id: course.id,
      title: course.title,
      route: course.route,
      commonAreas: course.commonAreas,
      officialLinks: course.officialLinks,
      specCodes: course.specCodes ?? [],
    },
    syllabuses: SYLLABUSES.filter((s) => s.courseId === id),
    programmes: OAK_PROGRAMMES.filter((p) => p.courseIds.includes(id)),
    supplementaryResources: resourcesForCourse(id),
    guides: topicsForCourse(course).map((t) => ({
      id: t.id,
      title: t.title,
      specRefs: t.specRefs ?? [],
      questions: t.quiz.length,
    })),
  };
}
export type CourseCurriculum = NonNullable<
  ReturnType<typeof curriculumForCourse>
>;
export function checklistText(data: CourseCurriculum, syllabus?: Syllabus) {
  return [
    data.course.title,
    syllabus
      ? `${syllabus.board} ${syllabus.code} · syllabus headings`
      : "General course areas — not a complete specification",
    "Choose the correct specification version, tier and optional units with your teacher.",
    ...(syllabus?.sections.map(
      (s) => `[ ] ${s.ref} ${s.title}\n    ${s.url}`,
    ) ?? data.course.commonAreas.map((s) => `[ ] ${s}`)),
    "",
    "Official sources",
    ...data.course.officialLinks.map((l) => `${l.label}: ${l.url}`),
    ...(syllabus
      ? [`Checked: ${syllabus.checkedAt}`, `Specification: ${syllabus.url}`]
      : []),
  ].join("\n");
}
