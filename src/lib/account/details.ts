import type { BoardId, RouteId } from "@/lib/types";

export type Stage = RouteId | "other";

export const STAGES: { id: Stage; label: string }[] = [
  { id: "gcse", label: "GCSE" },
  { id: "alevel", label: "A level" },
  { id: "btec", label: "BTEC" },
  { id: "tlevel", label: "T Level" },
  { id: "level23", label: "Other Level 2 or 3 course" },
  { id: "other", label: "Something else" },
];

export const YEAR_GROUPS = [
  { id: "year-9", label: "Year 9" },
  { id: "year-10", label: "Year 10" },
  { id: "year-11", label: "Year 11" },
  { id: "year-12", label: "Year 12" },
  { id: "year-13", label: "Year 13" },
  { id: "college", label: "At college" },
  { id: "adult", label: "Adult learner" },
  { id: "other", label: "Other" },
] as const;

export const AGE_BANDS = [
  { id: "13-15", label: "13 to 15" },
  { id: "16-17", label: "16 or 17" },
  { id: "18+", label: "18 or over" },
] as const;

export type YearGroup = (typeof YEAR_GROUPS)[number]["id"];
export type AgeBand = (typeof AGE_BANDS)[number]["id"];

export interface StudySubject {
  courseId: string;
  board: BoardId | "unsure";
}

export interface LearnerDetails {
  careerRoute?: string;
  stage: Stage;
  yearGroup: YearGroup;
  ageBand: AgeBand;
  subjects: StudySubject[];
  helpTopics: string[];
  helpNote: string | null;
  examDate: string | null;
}

export const stageLabel = (s: string) =>
  STAGES.find((x) => x.id === s)?.label ?? s;
export const yearLabel = (s: string) =>
  YEAR_GROUPS.find((x) => x.id === s)?.label ?? s;

export function rowToDetails(r: Record<string, unknown>): LearnerDetails {
  const subjects = Array.isArray(r.subjects)
    ? (r.subjects as StudySubject[]).filter(
        (s) => s && typeof s.courseId === "string",
      )
    : [];
  return {
    stage: r.stage as Stage,
    yearGroup: r.year_group as YearGroup,
    ageBand: r.age_band as AgeBand,
    subjects,
    helpTopics: Array.isArray(r.help_topics) ? (r.help_topics as string[]) : [],
    helpNote: (r.help_note as string) ?? null,
    examDate: (r.exam_date as string) ?? null,
  };
}
