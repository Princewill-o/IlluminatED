import Link from "next/link";
import { redirect } from "next/navigation";

import { inviteEmail, setDemoStatus } from "./actions";

import { PageHeader, Section, Note } from "@/components/kit";
import { SchoolLicenceAdmin, type SchoolLicence } from "@/components/school/licence-admin";
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
  const {data:schools}=await sb.from("school_licences").select("id,name,seats,status,expires_at,agreement_reference").order("created_at",{ascending:false});
  const [{ data: demos }, { data: invites }] = await Promise.all([
    sb.from("demo_requests").select("*").order("created_at", { ascending: false }).limit(50),
    sb.from("access_invites").select("email, note, created_at").order("created_at", { ascending: false }).limit(50),
  ]);
  const totals = [
    ["All users", o.totals.users], ["Premium access", o.totals.premium], ["Paying now", o.totals.paying], ["Trials", o.totals.trial], ["Payment issues", o.totals.paymentIssues], ["New in 30 days", o.totals.new30],
  ];
  return <>
    <PageHeader title="Platform admin" intro={`Private overview for ${viewer.email ?? "the owner"}.`}/>
    <Section rule={false}>
      <div className="mb-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 className="text-xl font-bold">Demo requests</h2>
          <ul className="mt-3 space-y-3">
            {(demos ?? []).map((d: Record<string, string | number | null>) => (
              <li key={String(d.id)} className="rounded-2xl border p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{d.name} · <a className="underline" href={`mailto:${d.email}`}>{d.email}</a></p>
                  <form action={setDemoStatus} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={String(d.id)} />
                    <select name="status" defaultValue={String(d.status)} className="rounded-lg border bg-background px-2 py-1">
                      {["new", "booked", "invited", "closed"].map((s) => <option key={s}>{s}</option>)}
                    </select>
                    <button className="rounded-lg border px-2 py-1">Save</button>
                  </form>
                </div>
                <p className="mt-1 text-muted-foreground">{d.role} · {d.organisation_type}{d.organisation ? ` · ${d.organisation}` : ""}{d.learners ? ` · ${d.learners} learners` : ""} · {date(String(d.created_at))}</p>
                {d.times && <p className="mt-1">Times: {d.times}</p>}
                {d.message && <p className="mt-1">{d.message}</p>}
              </li>
            ))}
            {(demos ?? []).length === 0 && <Note>No demo requests yet.</Note>}
          </ul>
        </div>
        <div>
          <h2 className="text-xl font-bold">Give access</h2>
          <p className="mt-1 text-sm text-muted-foreground">New accounts can only finish setting up if their email is here. Existing users keep access.</p>
          <form action={inviteEmail} className="mt-3 space-y-2">
            <input name="email" type="email" required placeholder="student@school.org.uk" className="w-full rounded-xl border bg-background px-3 py-2" />
            <input name="note" placeholder="Note (e.g. Kingston College, 12C)" className="w-full rounded-xl border bg-background px-3 py-2" />
            <label className="block text-sm font-bold">School licence<select name="schoolId" className="mt-1 w-full rounded-xl border bg-background p-3"><option value="">Individual invitation</option>{(schools??[]).map(s=><option key={s.id} value={s.id}>{s.name} · {s.status}</option>)}</select></label>
            <label className="block text-sm font-bold">School role<select name="schoolRole" className="mt-1 w-full rounded-xl border bg-background p-3"><option value="student">Student</option><option value="teacher">Teacher</option></select></label>
            <button className="rounded-full bg-primary px-5 py-2 font-semibold text-primary-foreground">Invite</button>
          </form>
          <ul className="mt-4 space-y-1 text-sm">
            {(invites ?? []).map((i: Record<string, string | null>) => (
              <li key={String(i.email)} className="flex justify-between border-b py-2"><span>{i.email}</span><span className="text-muted-foreground">{i.note}</span></li>
            ))}
          </ul>
        </div>
      </div>
      <SchoolLicenceAdmin schools={(schools??[]) as SchoolLicence[]}/>
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
