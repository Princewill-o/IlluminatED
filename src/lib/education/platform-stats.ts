export interface PlatformStats {
  questions: number; practice_sets: number; subjects: number; game_questions: number;
  oak_lessons: number; oak_units: number; oak_subjects: number; oak_key_stages: number;
  lesson_recall_questions: number;
}
// Known existing question-bank totals. Oak counts only appear after a successful API read.
export const STATS_FALLBACK: PlatformStats = { questions: 4419, practice_sets: 256, subjects: 33, game_questions: 758,
  oak_lessons: 0, oak_units: 0, oak_subjects: 0, oak_key_stages: 0, lesson_recall_questions: 0 };
export function normalisePlatformStats(data: Partial<PlatformStats>): PlatformStats {
  return Object.fromEntries(Object.entries(STATS_FALLBACK).map(([key,fallback]) => {
    const value=data[key as keyof PlatformStats];
    return [key, typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback];
  })) as unknown as PlatformStats;
}
