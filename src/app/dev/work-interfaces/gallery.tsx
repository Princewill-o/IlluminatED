"use client";

import { TaskCard } from "@/components/careers/task-card";
import { WorkInterface } from "@/components/careers/work-interface";
import { careerTask } from "@/game/core/careers";
import { createRng } from "@/game/core/rng";
import { roleStepTask } from "@/game/core/role-tasks";

const SAMPLES: [string, string, () => ReturnType<typeof careerTask>][] = [
  ["itTicket", "macrosoft", () => careerTask("itTicket", createRng(3))],
  ["bugfix", "goggle", () => careerTask("bugfix", createRng(4))],
  ["basket", "tescow", () => careerTask("basket", createRng(5))],
  ["pizzaOrder", "pizzazz", () => careerTask("pizzaOrder", createRng(6))],
  ["vitals", "st-plasters", () => careerTask("vitals", createRng(7))],
  ["mechFault", "mechanic", () => roleStepTask("mechanic", 0, createRng(8))],
  ["parcelAddress", "delivery-driver", () => roleStepTask("delivery-driver", 0, createRng(9))],
  ["extinguisher", "firefighter", () => roleStepTask("firefighter", 3, createRng(10))],
];

export function Gallery() {
  return (
    <main className="grid gap-8 bg-[#d9e3ea] p-6 md:grid-cols-2">
      {SAMPLES.map(([kind, place, make]) => {
        const task = make();
        if (!task) return null;
        return (
          <section key={kind} data-kind={kind}>
            <p className="mb-2 font-mono text-xs">{kind} · {place}</p>
            <WorkInterface taskKind={kind} place={place}><TaskCard bare task={task} index={0} total={5} onDone={() => {}} /></WorkInterface>
          </section>
        );
      })}
    </main>
  );
}
