import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader, Section, Note } from "@/components/kit";
import { getSupabase , getViewer } from "@/lib/social/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Platform admin" };

type Overview = {
  totals: { users: number; premium: number; trial: number; paying: number; paymentIssues: number; new30: number };
  users: Array<{ id: string; email: string | null; created_at: string; username: string | null; plan: string; billing_status: string; trial_end: string | null; last_paid_at: string | null; answers: number; accuracy: number | null }>;
  features: Array<{ feature: string; views: number; users: number }>;
  courses: Array<{ course_id: string; users: number; answers: number; accuracy: number | null }>;
  support: Array<{ id: number; created_at: string; email: string; topic: string; message: string; status: string }>;
  sandboxSubscriptions: number;
  usageSince: string | null;
  quizRounds30: number;
  tiggyMessages7: number;
};

const date = (value: string | null) => value ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" }) : "—";

export default async function AdminPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in?next=/admin");
  const sb = await getSupabase();
  if (!sb) redirect("/sign-in?next=/admin");
  const { data: allowed, error: allowedError } = await sb.rpc("platform_admin_status");
  if (allowedError || allowed !== true) redirect("/dashboard");
  const { data, error } = await sb.rpc("platform_admin_overview", { p_page: 0, p_search: "" });
  if (error) return <><PageHeader title="Platform admin" intro="The admin overview is temporarily unavailable."/><Section rule={false}><Note>Refresh this page. If the problem continues, use billing support to report it.</Note></Section></>;
  const o = data as Overview;
  const totals = [
    ["All users", o.totals.users], ["Premium access", o.totals.premium], ["Paying now", o.totals.paying], ["Trials", o.totals.trial], ["Payment issues", o.totals.paymentIssues], ["New in 30 days", o.totals.new30],
  ];
  return <>
    <PageHeader title="Platform admin" intro={`Private overview for ${viewer.email ?? "the owner"}.`}/>
    <Section rule={false}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{totals.map(([label,value]) => <div key={label} className="rounded-2xl border p-5"><p className="text-muted-foreground text-sm">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>)}</div>
      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <div><h2 className="text-xl font-bold">Recent accounts</h2><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-3">Account</th><th className="p-3">Plan</th><th className="p-3">Progress</th></tr></thead><tbody>{o.users.map(u => <tr key={u.id} className="border-b"><td className="p-3"><p>{u.email ?? u.username ?? "—"}</p><p className="text-muted-foreground text-xs">Joined {date(u.created_at)}</p></td><td className="p-3">{u.plan}<p className="text-muted-foreground text-xs">{u.billing_status}</p></td><td className="p-3">{u.answers} answers{u.accuracy === null ? "" : ` · ${u.accuracy}%`}</td></tr>)}</tbody></table></div></div>
        <div><h2 className="text-xl font-bold">Feature use, last 30 days</h2><div className="mt-3 space-y-2">{o.features.map(f => <div key={f.feature} className="flex justify-between rounded-xl bg-secondary px-4 py-3 text-sm"><span>{f.feature}</span><span>{f.views} uses · {f.users} users</span></div>)}{o.features.length === 0 && <Note>No tracked feature use yet.</Note>}</div><p className="text-muted-foreground mt-3 text-xs">Tracking started {date(o.usageSince)}.</p></div>
      </div>
      <div className="mt-10 grid gap-8 lg:grid-cols-2"><div><h2 className="text-xl font-bold">Learning activity</h2><p className="mt-3 text-sm">{o.quizRounds30} quiz rounds in the last 30 days · {o.tiggyMessages7} Tiggy messages in the last 7 days.</p><h3 className="mt-6 font-semibold">Course activity</h3><ul className="mt-2 space-y-2 text-sm">{o.courses.map(c => <li key={c.course_id} className="flex justify-between border-b py-2"><span>{c.course_id}</span><span>{c.users} learners · {c.answers} answers</span></li>)}</ul></div><div><h2 className="text-xl font-bold">Billing support</h2><ul className="mt-3 space-y-3">{o.support.map(s => <li key={s.id} className="rounded-xl border p-4 text-sm"><p className="font-semibold">{s.email} · {s.status}</p><p className="mt-1">{s.message}</p></li>)}{o.support.length === 0 && <Note>No billing support messages.</Note>}</ul><Link href="/contact?topic=billing" className="mt-4 inline-block underline">Open support form</Link></div></div>
      <Note className="mt-10">Sandbox subscriptions: {o.sandboxSubscriptions}. These are excluded from paying-user counts. This dashboard contains private account data and is only available to the database allowlist.</Note>
    </Section>
  </>;
}
