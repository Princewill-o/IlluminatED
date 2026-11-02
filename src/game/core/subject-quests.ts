export interface SubjectQuest {
  courseId: string;
  topicId: string;
  courseTitle: string;
  title: string;
  questionCount: number;
  reviewed: boolean;
  passes: number;
  bestScore: number;
  recent: boolean | null;
  active: boolean | null;
}
export interface SubjectExam {
  courseId: string;
  bestScore: number;
  passed: boolean | null;
}
export interface PracticeEvidence {
  courseId: string;
  availableQuestions: number;
  qualifyingDays: number;
  distinctQuestions: number;
  draft: boolean;
  weakTopics: string[];
  targetAchieved: boolean;
}
export interface SubjectQuestBoard {
  quests: SubjectQuest[];
  exams: SubjectExam[];
  evidence?: PracticeEvidence[];
}
export interface SubjectQuestContent {
  summary: string;
  objectives: string[];
  explanation: string[];
  workedExample: { question: string; steps: string[]; answer: string } | null;
  keyTerms: { term: string; definition: string }[];
  misconceptions: { wrong: string; right: string }[];
  retrieval: { q: string; a: string }[];
  route: string;
  subject: string;
  draftPractice?: boolean;
  foundationFrom?: string;
  sources?: { source: string; licence: string }[];
}
export interface SubjectQuestSession {
  id: string;
  courseId: string;
  topicId: string | null;
  questions: { key: string; prompt: string; options: string[] }[];
}
export interface SubjectQuestResult {
  correct: number;
  total: number;
  score: number;
  passed: boolean;
  passes: number;
  xp: number;
  clout: number;
  answers: { answer: number; explain: string }[];
}
export function questComplete(quest: SubjectQuest) {
  return (
    quest.reviewed &&
    quest.passes >= 2 &&
    quest.recent === true &&
    quest.questionCount > 0
  );
}
export function subjectQuestSummary(quests: SubjectQuest[]) {
  const completed = quests.filter(questComplete).length;
  return {
    completed,
    total: quests.length,
    percent: quests.length ? Math.round((completed / quests.length) * 100) : 0,
    examUnlocked: quests.length > 0 && completed === quests.length,
  };
}
