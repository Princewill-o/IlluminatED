import Link from "next/link";

import { BadgeCheck, CalendarClock, Lock, MessageSquareHeart, ShieldCheck, Building2 } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "For employers",
  description:
    "Give your company a virtual office on IlluminatED. Verify with your work email, share advice and run office hours with the next generation of talent.",
};

const POINTS = [
  { icon: Building2, title: "Your own virtual office", text: "A walkable office named after your company, with reception, an Advice Desk and meeting rooms. Learners visit from Careers Campus." },
  { icon: BadgeCheck, title: "Verified with your work email", text: "We send a code to your company address (no personal email). Your team gets a ✓ Verified badge everywhere they appear." },
  { icon: MessageSquareHeart, title: "Share advice", text: "Post tips about your industry, applications and apprenticeships that learners can read on your company page." },
  { icon: CalendarClock, title: "Office hours and meetings", text: "Publish slots. Learners book them and meet you in your office's meeting room." },
  { icon: Lock, title: "Private messaging with adults", text: "Conversations with learners aged 18+ are end-to-end encrypted. We can't read them." },
  { icon: ShieldCheck, title: "Safeguarding built in", text: "Learners under 18 can only message you after a parent or carer approves. Those chats are checked, can be seen by moderators, and contact details can't be shared." },
];

export default function EmployersPage() {
  return (
    <div className="container max-w-5xl py-12 md:py-20">
      <p className="text-primary text-sm font-bold tracking-widest uppercase">For employers</p>
      <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">Meet the next generation of talent where they already are.</h1>
      <p className="text-muted-foreground mt-5 max-w-2xl text-lg leading-8">
        IlluminatED is where UK learners revise, play and plan what comes next. Give your company a virtual office, share advice
        and run office hours, from tech start-ups to banks, law firms, the NHS and engineering.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/employers/join" className="bg-primary text-primary-foreground inline-flex h-12 items-center rounded-full px-6 font-semibold">
          Get your company verified
        </Link>
        <Link href="/safeguarding" className="inline-flex h-12 items-center rounded-full border px-6 font-semibold">
          Read our safeguarding rules
        </Link>
      </div>
      <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {POINTS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="bg-card rounded-3xl border p-6">
            <Icon className="text-primary size-7" aria-hidden />
            <h2 className="mt-4 text-lg font-bold">{title}</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-6">{text}</p>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground mt-10 text-sm">
        Employer accounts are for people aged 18+ who work at the company. We may suspend any office that breaks our rules.
      </p>
    </div>
  );
}
