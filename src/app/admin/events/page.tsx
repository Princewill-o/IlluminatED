import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MARATHON_PRIZES, marathonDates } from "@/game/core/event-marathon";
import { getSupabase } from "@/lib/social/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Marathon prize review" };
type Candidate = { user_id: string; username: string; email: string; rank: number; points: number; wrong: number; reached: string | null; status: string; note: string };

async function record(form: FormData) {
  "use server";
  const sb = await getSupabase();
  if (!sb || (await sb.rpc("platform_admin_status")).data !== true) throw new Error("Not authorised");
  const { error } = await sb.rpc("marathon_prize_review", { p_end: String(form.get("end")), p_user: String(form.get("user")), p_status: String(form.get("status")), p_note: String(form.get("note")).slice(0, 1000) });
  if (error) throw new Error("Unable to save review. Only closed events can be updated.");
  revalidatePath("/admin/events");
}

export default async function EventAdmin({ searchParams }: { searchParams: Promise<{ end?: string }> }) {
  const sb = await getSupabase();
  if (!sb || (await sb.rpc("platform_admin_status")).data !== true) redirect("/dashboard");
  const params = await searchParams;
  const defaultEnd = new Date(marathonDates().end).toISOString();
  const end = params.end && Number.isFinite(Date.parse(params.end)) ? new Date(params.end).toISOString() : defaultEnd;
  const closed = Date.parse(end) <= Date.now();
  const { data, error } = await sb.rpc("marathon_prize_review", { p_end: end });
  const rows = (data ?? []) as Candidate[];
  return <main className="mx-auto max-w-5xl space-y-5 px-4 py-10"><Link href="/admin" className="underline">Back to admin</Link><h1 className="text-3xl font-black">Marathon prize review</h1><p>Review the final scoring evidence, eligibility, guardian permission and any exact ties before contacting winners. Delivery is manual: purchase and send the Amazon.co.uk voucher privately, then mark it sent here. Never paste voucher codes or identity documents into notes.</p><form className="flex flex-wrap gap-2"><label>Event closing instant (ISO)<input name="end" defaultValue={end} className="ml-2 rounded-xl border bg-background p-2" /></label><button className="rounded-full bg-primary px-4 py-2 font-bold text-primary-foreground">Load event</button></form><p>{closed ? "Closed · reviews can be recorded" : "Still open · standings are provisional"}</p>{error && <p role="alert">Could not load event results.</p>}{!rows.length && <p>No entries for this event.</p>}<ol className="space-y-3">{rows.map(row => <li key={row.user_id} className="rounded-2xl border bg-card p-4 text-card-foreground"><h2 className="font-black">#{row.rank} @{row.username} · {row.points} points · {row.status}</h2><p className="text-sm">{row.email} · {row.wrong} incorrect · last correct {row.reached ?? "none"}{row.rank <= 3 && row.status !== "disqualified" ? ` · provisional £${MARATHON_PRIZES[row.rank - 1]} voucher` : ""}</p><form action={record} className="mt-3 flex flex-wrap gap-2"><input type="hidden" name="end" value={end} /><input type="hidden" name="user" value={row.user_id} /><select name="status" aria-label={`Review for ${row.username}`} defaultValue={row.status} disabled={!closed} className="rounded-xl border bg-background p-2">{["review", "verified", "sent", "disqualified"].map(s => <option key={s}>{s}</option>)}</select><input name="note" aria-label="Review note" maxLength={1000} defaultValue={row.note} placeholder="Review note (no sensitive documents)" className="min-w-48 flex-1 rounded-xl border bg-background p-2" /><button disabled={!closed} className="rounded-full bg-primary px-4 py-2 font-bold text-primary-foreground disabled:opacity-50">Save review</button></form></li>)}</ol></main>;
}
