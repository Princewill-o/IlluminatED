import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { JoinForm } from "@/components/employers/join-form";
import { SECTORS, myMembership } from "@/lib/employers/server";
import { getViewer } from "@/lib/social/server";

export const metadata: Metadata = { title: "Verify your company" };

export default async function EmployerJoinPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in?mode=sign-up&next=/employers/join");
  if (await myMembership(viewer.id)) redirect("/employers/office");
  return (
    <div className="container max-w-xl py-10 md:py-16">
      <p className="text-primary text-sm font-bold tracking-widest uppercase">Employers</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Verify your company</h1>
      <p className="text-muted-foreground mt-3 leading-7">
        Confirm your work email and your company gets its own office on IlluminatED, plus a verified badge for your team.
      </p>
      <div className="mt-8">
        <JoinForm needsProfile={!viewer.profile} sectors={[...SECTORS]} />
      </div>
    </div>
  );
}
