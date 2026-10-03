import type { CourseCurriculum } from "@/lib/education";
export interface SupplementaryResource {
  title: string;
  provider: string;
  url: string;
  courseIds: string[];
  kind: "course" | "video-collection" | "resource-collection";
}
/** Verified publisher landing pages. Supplementary learning, not certified board coverage. */
export const SUPPLEMENTARY_RESOURCES: SupplementaryResource[] = [
  {
    title: "Free science, maths and technology courses",
    provider: "OpenLearn · The Open University",
    url: "https://www.open.edu/openlearn/science-maths-technology/free-courses",
    courseIds: [
      "alevel-maths",
      "alevel-further-maths",
      "alevel-biology",
      "alevel-chemistry",
      "alevel-physics",
      "btec-applied-science",
      "btec-engineering",
      "tlevel-science",
      "tlevel-healthcare-science",
      "core-maths",
      "functional-skills-maths",
    ],
    kind: "course",
  },
  {
    title: "Free courses across nine subject areas",
    provider: "OpenLearn · The Open University",
    url: "https://www.open.edu/openlearn/free-courses",
    courseIds: [
      "alevel-psychology",
      "alevel-english-literature",
      "alevel-history",
      "alevel-economics",
      "btec-business",
      "btec-health-social-care",
      "btec-sport",
      "btec-creative-media",
      "tlevel-health",
      "tlevel-education-early-years",
      "tlevel-construction-design",
      "tlevel-onsite-construction",
      "tlevel-accounting",
      "tlevel-legal-services",
      "functional-skills-english",
      "epq",
      "cambridge-technicals",
      "applied-general",
    ],
    kind: "course",
  },
  {
    title: "Secondary and A level computing resource collection",
    provider: "STEM Learning",
    url: "https://www.stem.org.uk/secondary/resources/collections/computing/secondary-alevel-computing",
    courseIds: [
      "gcse-computer-science",
      "alevel-computer-science",
      "btec-it",
      "tlevel-digital-production",
      "tlevel-digital-support",
    ],
    kind: "resource-collection",
  },
  {
    title: "Secondary mathematics resource collection",
    provider: "STEM Learning",
    url: "https://www.stem.org.uk/secondary/resources/collections/maths/secondary-maths",
    courseIds: ["gcse-maths", "functional-skills-maths"],
    kind: "resource-collection",
  },
  {
    title: "Biology 2e: explanations and practice",
    provider: "OpenStax · Rice University",
    url: "https://openstax.org/books/biology-2e/pages/1-introduction",
    courseIds: [
      "alevel-biology",
      "btec-applied-science",
      "btec-health-social-care",
      "tlevel-health",
      "tlevel-healthcare-science",
      "tlevel-science",
      "btec-sport",
    ],
    kind: "course",
  },
  {
    title: "Precalculus 2e: functions and trigonometry",
    provider: "OpenStax · Rice University",
    url: "https://openstax.org/books/precalculus-2e/pages/preface",
    courseIds: [
      "alevel-maths",
      "alevel-further-maths",
      "core-maths",
      "btec-engineering",
    ],
    kind: "course",
  },
];
export function resourcesForCourse(id: string) {
  return SUPPLEMENTARY_RESOURCES.filter((r) => r.courseIds.includes(id));
}
const tokens = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(
      (t) =>
        t.length > 3 &&
        ![
          "with",
          "from",
          "their",
          "topic",
          "study",
          "content",
          "skills",
          "science",
          "knowledge",
          "level",
        ].includes(t),
    );
export function suggestedLessons(data: CourseCurriculum, title: string) {
  const words = new Set(tokens(title));
  const seen = new Set<string>();
  return data.programmes
    .flatMap((p) =>
      p.units.flatMap((u) =>
        u.lessons.map((l) => ({
          ...l,
          programme: p.slug,
          board: p.board,
          tier: p.tier,
          score: tokens(`${u.title} ${l.title}`).filter((t) => words.has(t))
            .length,
        })),
      ),
    )
    .sort((a, b) => b.score - a.score)
    .filter((l) => {
      if (!l.score || seen.has(l.slug)) return false;
      seen.add(l.slug);
      return true;
    })
    .slice(0, 8);
}
export function studyTopic(
  data: CourseCurriculum,
  title: string,
  code?: string,
) {
  if (!title || title.length > 500) return null;
  const syllabus = data.syllabuses.find((s) => s.code === code);
  const section = syllabus?.sections.find((s) => s.title === title);
  if (code && !section) return null;
  if (!section && !data.course.commonAreas.includes(title)) return null;
  return {
    title,
    syllabus,
    section,
    lessons: suggestedLessons(data, title),
    resources: resourcesForCourse(data.course.id),
  };
}
