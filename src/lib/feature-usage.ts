export const TRACKED_FEATURES = ["courses","quizzes","flashcards","revision","resources","tiggy","jobs","next-steps","premium","billing","social"] as const;
export function featureForPath(path: string) {
  const section = path.split("/")[1];
  return TRACKED_FEATURES.find(feature => feature === section) ?? null;
}
