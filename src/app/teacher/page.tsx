import Link from "next/link";

import type { Metadata } from "next";

import { completeTeacherProfile } from "./actions";

import { CreateClass } from "@/components/school/school";
import { requireTeacher } from "@/lib/school/access";
import { loadClasses, loadClassForTeacher } from "@/lib/school/server";

export const metadata: Metadata = { title: "Teacher workspace", robots: { index: false, follow: false } };
export default async function TeacherPage({searchParams}:{searchParams:Promise<{error?:string}>}) {
 const {viewer,access}=await requireTeacher();
 const {error}=await searchParams;
 if(!viewer.profile) return <main className="mx-auto max-w-xl px-4 py-12"><h1 className="text-3xl font-bold">Set up your teacher workspace</h1><p className="mt-3">{access?.name}. Choose a display username for your classes. Your account opens the teacher workspace; playing is optional.</p><form action={completeTeacherProfile} className="mt-6 space-y-4"><label className="block">Display username<input name="username" required pattern="[A-Za-z0-9_]{3,20}" maxLength={20} className="mt-2 w-full rounded-xl border bg-background p-3"/></label><label className="flex gap-2"><input name="terms" type="checkbox" required/><span>I agree to the <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy policy</Link>.</span></label>{error&&<p role="alert">Check the details or choose another username.</p>}<button className="rounded-full bg-primary px-5 py-3 font-bold text-primary-foreground">Open workspace</button></form></main>;
 const {teaching}=await loadClasses(viewer.id);
 const classes=await Promise.all(teaching.map(c=>loadClassForTeacher(c.id,viewer.id)));
 const students=new Set(classes.flatMap(c=>c?.students.map(s=>s.id)??[])).size;
 const assigned=classes.reduce((n,c)=>n+(c?.homework.length??0),0);
 const handedIn=classes.reduce((n,c)=>n+(c?.submissions.length??0),0);
 return <main className="mx-auto max-w-6xl px-4 py-8"><p className="text-sm font-bold uppercase tracking-widest text-primary">Teacher workspace · {access?.name??"Platform administration"}</p><h1 className="mt-2 text-4xl font-bold">Teach, assign, see progress.</h1><p className="mt-3 max-w-3xl text-muted-foreground">Set homework, review submissions and spot topic gaps. Students earn in-game Clout on their first marked submission. Games are optional for teachers.</p><div className="my-7 grid grid-cols-2 gap-3 md:grid-cols-4">{[["Classes",teaching.length],["Students",students],["Homework set",assigned],["Submissions",handedIn]].map(([label,n])=><div key={label} className="rounded-2xl border bg-card p-5"><p className="text-3xl font-bold">{n}</p><p className="text-sm text-muted-foreground">{label}</p></div>)}</div><div className="grid gap-7 md:grid-cols-[1.3fr_1fr]"><section><h2 className="text-xl font-bold">Your classes</h2><ul className="mt-3 space-y-3">{classes.map(c=>c&&<li key={c.cls.id}><Link href={`/homework/class/${c.cls.id}`} className="block rounded-2xl border bg-card p-5 hover:border-primary"><h3 className="font-bold">{c.cls.name} · {c.cls.subject}</h3><p className="mt-2 text-sm">{c.students.length} learners · {c.homework.length} assignments · {c.submissions.length} submissions</p><p className="mt-2 text-xs text-muted-foreground">Private class code: {c.cls.code}</p></Link></li>)}</ul>{!teaching.length&&<p className="mt-4 text-muted-foreground">Create your first class, then share its code through your school’s own systems.</p>}</section><aside><CreateClass/><div className="mt-5 rounded-2xl bg-secondary p-5"><h2 className="font-bold">Explore the student experience</h2><p className="mt-2 text-sm">You can enter the game if you choose. Teaching does not require a game character or study profile.</p><Link href="/games/world" className="mt-3 inline-block font-bold underline">Try the game</Link></div></aside></div><p className="mt-8 text-sm text-muted-foreground">School and age-range information stays private. Your class view shows only your students’ usernames and learning results. <Link href="/privacy#schools" className="underline">School privacy</Link></p></main>;
}
