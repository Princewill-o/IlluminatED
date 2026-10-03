import Link from "next/link";
import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { saveFriendRequests, savePrivateSchool } from "./school-action";

import { DeleteAccountForm } from "@/components/social/forms";
import { getSupabase, getViewer } from "@/lib/social/server";

export const metadata: Metadata = { title: "Your account" };

export default async function AccountPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in?next=/social/account");
  if (!viewer.profile) redirect("/onboarding?next=/social/account");
  const sb = await getSupabase();
  const { data: school, error: schoolError } = sb ? await sb.from("private_school").select("school_name").eq("user_id", viewer.id).maybeSingle() : { data: null, error: null };
  const { data: friendSetting, error: friendError } = sb ? await sb.from("social_friend_settings").select("allow_requests").eq("user_id", viewer.id).maybeSingle() : { data: null, error: null };
  return (
    <div className="container max-w-2xl py-10 lg:py-14">
      <h1 className="text-4xl tracking-tight">Your account</h1>
      <dl className="mt-8 border-t">
        <div className="grid gap-1 border-b py-4 sm:grid-cols-[160px_1fr]">
          <dt className="text-muted-foreground">Username</dt>
          <dd className="font-medium">
            <Link
              href={`/social/u/${viewer.profile.username}`}
              className="hover:text-primary"
            >
              {viewer.profile.username}
            </Link>
          </dd>
        </div>
        <div className="grid gap-1 border-b py-4 sm:grid-cols-[160px_1fr]">
          <dt className="text-muted-foreground">Email</dt>
          <dd>
            {viewer.email}{" "}
            <span className="text-muted-foreground text-sm">
              (never shown to anyone)
            </span>
          </dd>
        </div>
        {viewer.profile.banned && (
          <div className="border-b py-4 text-sm">
            Your account has been stopped from posting by a moderator. You can
            still read and delete your account.
          </div>
        )}
      </dl>
      <p className="mt-5 text-sm"><a href="/api/social/export" className="text-primary underline underline-offset-4">Download your Social data</a></p>
      {!schoolError && <section aria-labelledby="school" className="mt-10 rounded-2xl border bg-card p-5">
        <h2 id="school" className="text-xl font-semibold">Your school or sixth form</h2>
        <p className="text-muted-foreground mt-2 text-sm">Optional and private from other members. It is never shown on your public Social profile. Leave blank and save to remove it.</p>
        <form action={savePrivateSchool} className="mt-4 flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="private-school">School or sixth form</label>
          <input id="private-school" name="school" maxLength={100} defaultValue={school?.school_name ?? ""} autoComplete="organization" className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm" />
          <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Save</button>
        </form>
      </section>}
      {!friendError && <section aria-labelledby="friends-setting" className="mt-5 rounded-2xl border bg-card p-5">
        <h2 id="friends-setting" className="text-xl font-semibold">Friend requests</h2>
        <p className="text-muted-foreground mt-2 text-sm">Off by default. Turn this on only if you want other members to send you friend requests. You can turn it off later; existing friends stay until removed.</p>
        <form action={saveFriendRequests} className="mt-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm"><input name="allow" type="checkbox" defaultChecked={friendSetting?.allow_requests ?? false} /> Allow friend requests</label>
          <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Save preference</button>
        </form>
      </section>}
      <section aria-labelledby="del" className="mt-12">
        <h2 id="del" className="text-xl font-semibold">
          Delete your account
        </h2>
        <p className="text-muted-foreground mt-2 leading-relaxed">
          This permanently deletes your account and every thread and reply
          you've posted. Replies other people wrote in your threads are deleted
          too. It can't be undone.
        </p>
        <div className="mt-5">
          <DeleteAccountForm />
        </div>
      </section>
    </div>
  );
}
