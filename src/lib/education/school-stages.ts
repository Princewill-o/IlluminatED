export const SCHOOL_STAGES = [
  { id: "primary", title: "Primary", years: "Years 1–6", keyStages: ["ks1", "ks2"] },
  { id: "secondary", title: "Secondary", years: "Years 7–11", keyStages: ["ks3", "ks4"] },
  { id: "sixth-form", title: "Sixth form", years: "Years 12–13", keyStages: [] },
] as const;

export function oakFilters(params: URLSearchParams) {
  const stage = SCHOOL_STAGES.find(stage => stage.id === params.get("stage"))?.id ?? "all";
  const keyStage = /^ks[1-4]$/.test(params.get("keyStage") ?? "") ? params.get("keyStage")! : "";
  const rawYear = Number(params.get("year"));
  const year = Number.isInteger(rawYear) && rawYear >= 1 && rawYear <= 11 ? rawYear : null;
  const subject = /^[a-z][a-z-]{0,60}$/.test(params.get("subject") ?? "") ? params.get("subject")! : "";
  const page = Math.max(1, Math.min(500, Number.parseInt(params.get("page") ?? "1", 10) || 1));
  return { stage, keyStage, year, subject, page, q: (params.get("q") ?? "").trim().slice(0,100) };
}

export type OakFilters = ReturnType<typeof oakFilters>;
export interface OakLessonSummary {
  slug: string; title: string; unit_slug: string; unit_title: string; subject: string; subject_title: string;
  key_stage: string; phase: string; years: number[]; restricted: boolean; source_url: string;
}
export interface OakLesson extends OakLessonSummary {
  content: {
    pupilLessonOutcome?: string;
    lessonKeywords?: { keyword: string; description: string }[];
    keyLearningPoints?: { keyLearningPoint: string }[];
    misconceptionsAndCommonMistakes?: { misconception: string; response: string }[];
    teacherTips?: { teacherTip: string }[];
    contentGuidance?: { contentGuidanceLabel?: string; contentGuidanceDescription?: string }[] | null;
    supervisionLevel?: string | null; transcript_sentences?: string | null;
  };
}
export const OAK_ATTRIBUTION = "Oak National Academy · Open Government Licence v3.0";
export const OAK_LICENCE = "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/";
