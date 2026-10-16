"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";

import { TaskCard } from "@/components/careers/task-card";
import { ARCADE, buildRound } from "@/game/core/arcade";
import { buildShift, roleOf } from "@/game/core/careers";
import { newSeed } from "@/game/core/rng";
import { cn } from "@/lib/utils";

const ROLES = [
  { workplace: "pizzazz", role: "crew", label: "Pizza shop crew" },
  { workplace: "goggle", role: "junior-dev", label: "Junior developer" },
  { workplace: "st-plasters", role: "receptionist", label: "Hospital receptionist" },
  { workplace: "barklays", role: "teller", label: "Bank cashier" },
];

/** Try a real job shift with no account: three tasks, nothing saved. */
export function DemoShift() {
  const roles = ROLES.filter((r) => roleOf(r.workplace, r.role));
  const [pick, setPick] = useState(roles[0]);
  const [seed, setSeed] = useState(1);
  useEffect(() => setSeed(newSeed()), [pick]);
  const role = roleOf(pick.workplace, pick.role)!;
  const tasks = useMemo(() => buildShift(role, seed).slice(0, 3), [role, seed]);
  const [i, setI] = useState(0);
  const [right, setRight] = useState(0);
  useEffect(() => {
    setI(0);
    setRight(0);
  }, [pick, seed]);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {roles.map((r) => (
          <button
            key={r.role}
            type="button"
            onClick={() => setPick(r)}
            className={cn("rounded-full border px-4 py-2 text-sm font-bold", r === pick ? "border-primary bg-primary text-primary-foreground" : "bg-card")}
          >
            {r.label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{role.summary}</p>
      <div className="mt-4">
        {i < tasks.length ? (
          <TaskCard
            key={`${seed}-${i}`}
            task={tasks[i]}
            index={i}
            total={tasks.length}
            onDone={(ok) => {
              if (ok) setRight((r) => r + 1);
              setI(i + 1);
            }}
          />
        ) : (
          <div className="rounded-3xl border bg-card p-6 text-center">
            <p className="text-sm font-bold tracking-widest text-muted-foreground uppercase">Shift over</p>
            <p className="mt-1 text-4xl font-black">{right}/3</p>
            <p className="mx-auto mt-2 max-w-sm text-muted-foreground">
              Signed in, that shift would pay Clout, count towards promotion and add to the experience on your CV.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Link href="/sign-in?mode=sign-up" className="rounded-full bg-primary px-5 py-3 font-bold text-primary-foreground">
                Create a free account
              </Link>
              <button type="button" onClick={() => setSeed(newSeed())} className="rounded-full border px-5 py-3 font-bold">
                Another shift
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Times Table Dash, 30 seconds, nothing saved. */
export function DemoArcade() {
  const game = ARCADE[0];
  const [seed, setSeed] = useState(1);
  const qs = useMemo(() => buildRound(game, seed), [game, seed]);
  const [start, setStart] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [i, setI] = useState(0);
  const [right, setRight] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const LEN = 30_000;
  const left = start ? Math.max(0, LEN - (now - start)) : LEN;
  const over = start !== null && left === 0;
  useEffect(() => {
    if (!start || over) return;
    timer.current = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(timer.current!);
  }, [start, over]);
  const q = qs[i % qs.length];

  return (
    <div className="rounded-3xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="font-black">{game.name}</p>
        {start && !over && <p className="text-sm font-black">{Math.ceil(left / 1000)}s · {right}</p>}
      </div>
      {start === null ? (
        <button
          type="button"
          onClick={() => {
            setSeed(newSeed());
            const t = Date.now();
            setStart(t);
            setNow(t);
            setI(0);
            setRight(0);
          }}
          className="mt-4 w-full rounded-full bg-primary py-3 font-black text-primary-foreground"
        >
          Play 30 seconds
        </button>
      ) : !over ? (
        <>
          <p className="mt-4 rounded-2xl bg-secondary py-6 text-center text-3xl font-black">{q.prompt}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {q.options.map((o, k) => (
              <button
                key={`${i}-${k}`}
                type="button"
                onClick={() => {
                  if (k === q.answer) setRight((r) => r + 1);
                  setI(i + 1);
                }}
                className="rounded-2xl border py-3 font-bold hover:bg-muted"
              >
                {o}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-4 text-center">
          <p className="text-4xl font-black">{right}</p>
          <p className="text-muted-foreground">right in 30 seconds</p>
          <button type="button" onClick={() => setStart(null)} className="mt-4 rounded-full border px-5 py-2.5 font-bold">
            Play again
          </button>
        </div>
      )}
    </div>
  );
}
