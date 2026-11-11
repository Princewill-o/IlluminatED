import Link from "next/link";

import type { Metadata } from "next";


import { ReferralLink, SubmitVideo } from "@/components/creators/creator-tools";
import { getAccount } from "@/lib/account/server";
import { siteOrigin } from "@/lib/site";
import { getSupabase } from "@/lib/social/server";

export const metadata: Metadata = {
  title: "Creators: get paid to post",
  description: "Post videos about IlluminatED on TikTok, Reels or Shorts, send us the link, and get paid for every video we approve.",
};

const IDEAS = [
  ["Intern to CEO", "Screen-record a Promotion Panic run and react as you climb (or get fired)."],
  ["A day at work", "Do a shift at Goggle or Pizzazz Pizza and show the real task you solved."],
  ["Room tour", "Show off your home, the furniture you bought and how you earned it."],
  ["Beat my score", "Post your Arcade best and challenge your followers to beat it."],
  ["Study with me", "Revise with IlluminatED for 25 minutes, then show what you learned."],
  ["Explain it", "Teach one thing you learned in a job shift: SQL, GDPR, giving change."],
];

export default async function CreatorsPage() {
  const account = await getAccount();
  let stats = { referrals: 0, videos: 0 };
  if (account) {
    const sb = await getSupabase();
    if (sb) {
      const [r, v] = await Promise.all([
        sb.from("referrals").select("referred_id", { count: "exact", head: true }).eq("referrer_id", account.id),
        sb.from("creator_submissions").select("id", { count: "exact", head: true }).eq("user_id", account.id),
      ]);
      stats = { referrals: r.count ?? 0, videos: v.count ?? 0 };
    }
  }
  const link = account?.profile ? `${siteOrigin()}/r/${account.profile.username}` : null;

  return (
    <div className="container max-w-5xl pt-8 pb-16">
      <p className="text-sm font-bold tracking-widest text-primary uppercase">Creator scheme</p>
      <h1 className="mt-3 text-4xl tracking-tight text-balance md:text-6xl">Post about IlluminatED. Get paid.</h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        Make short videos on TikTok, Instagram Reels, YouTube Shorts or Snapchat showing how you revise with IlluminatED. Send us the link: we pay for every video we
        approve, and you earn 150 Clout for every new player who joins with your link.
      </p>

      <ol className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          ["1", "Get your link", "Sign in and copy your personal link. Put it in your bio and captions."],
          ["2", "Post a video", "Film something real: a game run, a job shift, your room or a study session."],
          ["3", "Send it to us", "Submit the post link below. We review every video and email you about payment."],
        ].map(([n, t, d]) => (
          <li key={n} className="rounded-3xl border bg-card p-6">
            <span className="grid size-9 place-items-center rounded-full bg-primary font-black text-primary-foreground">{n}</span>
            <p className="mt-4 text-lg font-bold">{t}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{d}</p>
          </li>
        ))}
      </ol>

      <section className="mt-12 grid gap-6 md:grid-cols-2">
        {account && link ? (
          <>
            <div className="space-y-4">
              <ReferralLink link={link} />
              <dl className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border bg-card p-4">
                  <dd className="text-3xl font-black">{stats.referrals}</dd>
                  <dt className="text-sm text-muted-foreground">friends joined</dt>
                </div>
                <div className="rounded-2xl border bg-card p-4">
                  <dd className="text-3xl font-black">{stats.videos}</dd>
                  <dt className="text-sm text-muted-foreground">videos sent</dt>
                </div>
              </dl>
            </div>
            <SubmitVideo />
          </>
        ) : (
          <div className="rounded-3xl border bg-card p-6 md:col-span-2">
            <p className="text-xl font-bold">Sign in to get your link and submit videos</p>
            <p className="mt-2 text-muted-foreground">It's free. Your link uses your IlluminatED username, never your real name or email.</p>
            <Link href="/sign-in?next=/creators" className="mt-5 inline-block rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground">
              Sign in or join
            </Link>
          </div>
        )}
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-bold">Video ideas that work</h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {IDEAS.map(([t, d]) => (
            <li key={t} className="rounded-2xl border bg-card p-5">
              <p className="font-bold">{t}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{d}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14 rounded-3xl bg-secondary p-6 md:p-8">
        <h2 className="text-2xl font-bold">The rules</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 leading-7">
          <li>Be honest. Show the real app and say what you actually think. No fake reviews or made-up results.</li>
          <li>
            Paid posts are adverts, so add <strong>#ad</strong> or use the platform's paid-partnership label. That's the law in the UK.
          </li>
          <li>Follow each platform's age rules. If you're under 18, a parent or carer must agree before we pay you.</li>
          <li>Never show your real name, school, address or other people's faces without their permission.</li>
          <li>We decide which videos are approved and agree payment with you by email before paying. Referral Clout is in-game only and has no cash value.</li>
        </ul>
      </section>
    </div>
  );
}
