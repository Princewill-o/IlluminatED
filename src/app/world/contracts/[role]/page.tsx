import Link from "next/link";
import { notFound } from "next/navigation";

import { TrainingContext } from "@/components/game/world/training-context";
import {
  contractMinutes,
  ROLE_CONTRACTS,
  roleContract,
  roleContractHref,
} from "@/lib/illum-world/role-contracts";

export function generateStaticParams() {
  return ROLE_CONTRACTS.map((course) => ({ role: course.id }));
}

export default async function ContractOverview({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const course = roleContract((await params).role);
  if (!course) notFound();
  return (
    <main className="mx-auto max-w-3xl px-5 py-14 text-[#1d1a4a] dark:text-white">
      <Link
        href="/world/contracts"
        className="font-bold underline underline-offset-4"
      >
        ← Role contracts
      </Link>
      <p className="mt-7 text-sm font-bold">
        {course.workplace} · In-game workplace simulation
      </p>
      <h1 className="mt-2 text-5xl font-black tracking-tight">
        {course.title}
      </h1>
      <p className="mt-4 text-lg">{course.summary}</p>
      <p className="mt-5 font-bold">
        Contract and course length: three shifts, about{" "}
        {contractMinutes(course)} minutes total. Work at your own pace.
      </p>
      <Link
        href={roleContractHref(course)}
        className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-[#5141b5] px-5 font-bold text-white"
      >
        Open contract in IllumWorld →
      </Link>
      <ol className="my-8 space-y-3">
        {course.shifts.map((shift) => (
          <li
            key={shift.id}
            className="rounded-2xl border-2 border-[#1d1a4a] bg-white p-5 dark:border-violet-300 dark:bg-[#201b49]"
          >
            <h2 className="text-xl font-bold">{shift.title}</h2>
            <p className="mt-1 text-sm">{shift.minutes} minutes suggested</p>
            <p className="mt-3">{shift.brief}</p>
          </li>
        ))}
      </ol>
      <TrainingContext key={course.id} roleId={course.id} />
      <h2 className="text-xl font-bold">Further study and role references</h2>
      <p className="mt-2">
        These public references informed the skills covered. IlluminatED
        authors the scenarios and issues the in-game certificate.
      </p>
      <ul className="mt-3 space-y-2">
        {course.sources.map((item) => (
          <li key={item.url}>
            <a
              href={item.url}
              className="underline underline-offset-4"
              target="_blank"
              rel="noreferrer"
            >
              {item.title} · {item.provider} ↗
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
