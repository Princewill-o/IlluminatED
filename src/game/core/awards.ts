/** Game milestones derived from saved study and simulated work progress. */
export interface AwardProgress {
  studySessions: number;
  studyCorrect: number;
  studiedCourses: number;
  careerShifts: number;
  careerCorrect: number;
  careerTotal: number;
  careerWorkplaces: number;
}

export type AwardIcon =
  | "book"
  | "flame"
  | "star"
  | "compass"
  | "briefcase"
  | "shield"
  | "target"
  | "building";

export interface LearningAward {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  progress: number;
  target: number;
  category: "study" | "career";
  icon: AwardIcon;
}

const count = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

/** Derive awards rather than storing a second, potentially stale award record. */
export function awardsFor(state: AwardProgress): LearningAward[] {
  const studySessions = count(state.studySessions);
  const studyCorrect = count(state.studyCorrect);
  const studiedCourses = count(state.studiedCourses);
  const careerShifts = count(state.careerShifts);
  const careerCorrect = Math.min(
    count(state.careerCorrect),
    count(state.careerTotal),
  );
  const careerWorkplaces = count(state.careerWorkplaces);
  const award = (
    id: string,
    title: string,
    description: string,
    category: LearningAward["category"],
    icon: AwardIcon,
    progress: number,
    target: number,
  ): LearningAward => ({
    id,
    title,
    description,
    category,
    icon,
    earned: progress >= target,
    progress: Math.min(progress, target),
    target,
  });
  return [
    award(
      "first-study",
      "First chapter",
      "Complete your first in-game study session.",
      "study",
      "book",
      studySessions,
      1,
    ),
    award(
      "study-rhythm",
      "Finding your rhythm",
      "Complete 5 in-game study sessions.",
      "study",
      "flame",
      studySessions,
      5,
    ),
    award(
      "knowledge-builder",
      "Knowledge builder",
      "Answer 25 questions correctly in the study room.",
      "study",
      "star",
      studyCorrect,
      25,
    ),
    award(
      "subject-explorer",
      "Curious mind",
      "Complete study sessions across 3 different subjects.",
      "study",
      "compass",
      studiedCourses,
      3,
    ),
    award(
      "first-shift",
      "First day on the job",
      "Complete your first simulated work shift.",
      "career",
      "briefcase",
      careerShifts,
      1,
    ),
    award(
      "shift-regular",
      "Trusted teammate",
      "Complete 5 simulated work shifts.",
      "career",
      "shield",
      careerShifts,
      5,
    ),
    award(
      "work-problem-solver",
      "Problem solver",
      "Answer 25 simulated work tasks correctly.",
      "career",
      "target",
      careerCorrect,
      25,
    ),
    award(
      "career-explorer",
      "City of possibilities",
      "Complete a shift at 3 different workplaces.",
      "career",
      "building",
      careerWorkplaces,
      3,
    ),
  ];
}
