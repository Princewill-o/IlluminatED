import Link from "next/link";
import { redirect } from "next/navigation";

import { launchReadiness, MANUAL_RELEASE_GATES } from "@/lib/launch-readiness";
import { getSupabase, getViewer } from "@/lib/social/server";

export const dynamic = "force-dynamic";
export const metadata = {title:"Launch readiness",robots:{index:false,follow:false}};
export default async function LaunchPage(){
  const viewer = await getViewer();
  if(!viewer) redirect("/sign-in?next=/admin/launch");
  const sb = await getSupabase();
  const result = sb ? await sb.rpc("platform_admin_status") : null;
  if(result?.error || result?.data !== true) redirect("/dashboard");
  const checks = launchReadiness(process.env);
  return <main className="container max-w-5xl py-12"><Link href="/admin" className="underline">Back to admin</Link><h1 className="mt-5 text-4xl font-bold">Launch readiness</h1><p className="mt-4 leading-8 text-muted-foreground">Private configuration review. No secret values are displayed. Configured does not mean tested, compliant or approved to launch. The manual evidence below still needs an owner and sign-off.</p><section className="mt-8 space-y-4" aria-label="Configuration checks">{checks.map(check=><article key={check.id} className="rounded-2xl border p-5"><h2 className="font-bold">{check.label} · {check.ready ? "Configured; verify live" : "Needs setup"}</h2><p className="mt-2 text-sm leading-7 text-muted-foreground">{check.action}</p></article>)}</section><section className="mt-10"><h2 className="text-2xl font-bold">Production evidence still required</h2><ol className="mt-5 list-decimal space-y-4 pl-5 leading-7">{MANUAL_RELEASE_GATES.map(gate=><li key={gate}>{gate}<span className="ml-2 text-sm font-bold text-muted-foreground">Unverified here</span></li>)}</ol></section><p className="mt-8 leading-7">A free invited beta can proceed only when its relevant access, reliability and safety gates are met. Leave payments unavailable until billing checks are complete. Keep unresolved items in the release record.</p></main>;
}
