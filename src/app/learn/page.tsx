import type { Metadata } from "next";

import { LearningDashboard } from "@/components/learn/learning-dashboard";
import { requireAccount } from "@/lib/account/server";
import { courseById } from "@/lib/data/courses";
import { loadCareer } from "@/lib/game/careers-server";
import { loadPlayer } from "@/lib/game/server";
import { loadStudy } from "@/lib/game/study-server";

export const metadata: Metadata = { title: "Learn · Your learning campus" };

export default async function LearnPage() {
  const account = await requireAccount("/learn");
  const [player, career, study] = await Promise.all([
    loadPlayer(account.id),
    loadCareer(account.id),
    loadStudy(account.id),
  ]);
  const subjects = account.details.subjects
    .map((subject) => courseById(subject.courseId))
    .filter((course): course is NonNullable<typeof course> => Boolean(course));
  return (
    <LearningDashboard
      username={account.profile.username}
      subjects={subjects}
      player={player}
      career={career}
      study={study}
    />
  );
}
