import type { Metadata } from "next";

import { CvBox, JobCentre, MyJob } from "@/components/careers/job-centre";
import { SKILLS, type SkillId, cvLines, roleOf, workplaceById } from "@/game/core/careers";
import { requireAccount } from "@/lib/account/server";
import { loadCareer } from "@/lib/game/careers-server";
import { loadPlayer } from "@/lib/game/server";

export const metadata: Metadata = { title: "Careers" };

export default async function CareersPage() {
  const account = await requireAccount("/games/careers");
  const [player, career] = await Promise.all([loadPlayer(account.id), loadCareer(account.id)]);
  const job = career.active;
  const cv = cvLines(career.history, career.skills);
  const cvText = [
    cv.experience.length ? "EXPERIENCE\n" + cv.experience.map((l) => `- ${l}`).join("\n") : "",
    cv.skills.length ? "SKILLS PRACTISED\n" + cv.skills.map((l) => `- ${l}`).join("\n") : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-12">
      <p className="text-xs font-black tracking-[0.3em] text-ink-lilac uppercase">Careers</p>
      <h1 className="arcade-display mt-2 text-4xl md:text-5xl">Get a job. Learn the job.</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Every shift is five real tasks from that line of work: giving change, fixing code, triaging patients, checking contracts. Do them well to earn Clout,
        get promoted and build experience you can honestly describe on a CV.
      </p>

      {job && (
        <section className="mt-8">
          <h2 className="text-2xl font-black">
            Your job: {roleOf(job.workplace, job.role)?.title} at {workplaceById(job.workplace)?.name}
          </h2>
          <div className="mt-3">
            <MyJob
              job={{ workplace: job.workplace, role: job.role, rank: job.rank, shifts: job.shifts, rankShifts: job.rankShifts, rankCorrect: job.rankCorrect, rankTotal: job.rankTotal }}
              avatar={player.avatar}
            />
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-2xl font-black">Job centre</h2>
        <p className="mt-1 text-muted-foreground">Pick an employer, sit a short interview, and you start at the bottom of their ladder. You can also find them all in London.</p>
        <div className="mt-4">
          <JobCentre job={job ? { ...job } : null} avatar={player.avatar} />
        </div>
      </section>

      <section id="cv" className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 className="text-2xl font-black">For your CV</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Written honestly: it says this is simulated experience and shows your real accuracy. Pair it with a real example when you talk about it in an interview.
          </p>
          <div className="mt-3">
            {cvText ? <CvBox text={cvText} /> : <p className="rounded-2xl border border-dashed border-border p-6 text-muted-foreground">Finish a shift and your experience appears here.</p>}
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-black">Skills</h2>
          <ul className="mt-3 space-y-2">
            {Object.entries(career.skills).length === 0 && <li className="text-muted-foreground">No skills practised yet.</li>}
            {Object.entries(career.skills)
              .sort((a, b) => b[1].total - a[1].total)
              .map(([k, s]) => {
                const pct = s.total ? Math.round((s.correct / s.total) * 100) : 0;
                return (
                  <li key={k}>
                    <div className="flex justify-between text-sm font-bold">
                      <span>{SKILLS[k as SkillId] ?? k}</span>
                      <span className="text-muted-foreground">
                        {s.correct}/{s.total}
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
          </ul>
          {career.recent.length > 0 && (
            <>
              <h3 className="mt-6 font-black">Recent shifts</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {career.recent.map((s, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span>
                      {roleOf(s.workplace, s.role)?.title} · {s.correct}/{s.total}
                    </span>
                    <span className="text-muted-foreground">
                      +{s.pay} · {s.at}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
