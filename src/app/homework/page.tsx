import Link from "next/link";
import {redirect} from "next/navigation";


import type { Metadata } from "next";


import { JoinClass, LeaveClass } from "@/components/school/school";
import { requireAccount } from "@/lib/account/server";
import {getSchoolAccess} from "@/lib/school/access";
import { loadClasses, loadMyHomework } from "@/lib/school/server";

export const metadata: Metadata = { title: "Homework" };

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

export default async function HomeworkPage() {
  const school=await getSchoolAccess();
  if(school?.role==="teacher")redirect("/teacher");
  const account = await requireAccount("/homework");
  const [{ teaching, joined }, homework] = await Promise.all([loadClasses(account.id), loadMyHomework(account.id)]);
  const now = Date.now();
  const todo = homework.filter((h) => !h.mine);
  const done = homework.filter((h) => h.mine);

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 pb-16">
      <p className="text-xs font-black tracking-[0.3em] text-primary uppercase">Homework</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">Your quests from class</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Homework your teachers set appears here and as tasks in the game. It's marked as soon as you hand it in, and your first go earns Clout.
      </p>

      <section className="mt-8">
        <h2 className="text-2xl font-black">To do</h2>
        {todo.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed p-6 text-muted-foreground">{joined.length ? "Nothing to do. Nice." : "Join a class below to get homework from your teacher."}</p>
        ) : (
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {todo.map((h) => {
              const late = new Date(h.dueAt).getTime() < now;
              return (
                <li key={h.id}>
                  <Link href={`/homework/${h.id}`} className="block rounded-3xl border bg-card p-5 hover:border-primary">
                    <p className="text-xs font-black tracking-widest text-muted-foreground uppercase">{h.className}</p>
                    <p className="mt-1 text-lg font-bold">{h.title}</p>
                    <p className={late ? "mt-1 text-sm font-bold text-destructive" : "mt-1 text-sm text-muted-foreground"}>
                      {late ? "Overdue: " : "Due "}
                      {when(h.dueAt)} · {h.questions.length} questions · up to {h.questions.length * 10} Clout
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {done.length > 0 && (
          <>
            <h3 className="mt-6 font-bold">Handed in</h3>
            <ul className="mt-2 divide-y rounded-2xl border bg-card">
              {done.map((h) => (
                <li key={h.id}>
                  <Link href={`/homework/${h.id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted">
                    <span>
                      <span className="font-bold">{h.title}</span> <span className="text-muted-foreground">· {h.className}</span>
                    </span>
                    <span className="font-black">
                      {h.mine!.correct}/{h.mine!.total}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <div>
          <JoinClass />
          {joined.length > 0 && (
            <ul className="mt-4 space-y-2">
              {joined.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-2xl border bg-card px-4 py-3">
                  <span>
                    <span className="font-bold">{c.name}</span> <span className="text-sm text-muted-foreground">· {c.subject}</span>
                  </span>
                  <LeaveClass classId={c.id} name={c.name} />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <div className="rounded-3xl bg-secondary p-5">
            <p className="font-bold">Teachers</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Make a class, share the code, and set homework from our GCSE, A level, BTEC and T Level question bank. It's auto-marked and you get a class
              breakdown. Students are identified only by their username.
            </p>
          </div>
          <p className="mt-4 text-sm">Approved school teachers use their <Link href="/teacher" className="underline">teacher workspace</Link> to create classes.</p>
          {teaching.length > 0 && (
            <ul className="mt-4 space-y-2">
              {teaching.map((c) => (
                <li key={c.id}>
                  <Link href={`/homework/class/${c.id}`} className="flex items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3 hover:border-primary">
                    <span>
                      <span className="font-bold">{c.name}</span> <span className="text-sm text-muted-foreground">· {c.subject}</span>
                    </span>
                    <span className="font-mono text-sm font-black tracking-widest">{c.code}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <p className="mt-10 text-xs text-muted-foreground">
        How we handle class data: <Link href="/privacy#schools" className="underline">privacy for schools</Link>. {teaching.length > 0 && <CopyHint />}
      </p>
    </div>
  );
}

function CopyHint() {
  return <span>Share class codes in person or through your school's own systems.</span>;
}

