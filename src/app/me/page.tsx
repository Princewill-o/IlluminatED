import Link from "next/link";

import {
  Briefcase,
  Home,
  Building2,
  ChevronRight,
  MessageCircle,
  CreditCard,
  Crown,
  FileLock2,
  KeyRound,
  LifeBuoy,
  type LucideIcon,
  Mail,
  Shield,
  Shirt,
  SlidersHorizontal,
  Video,
} from "lucide-react";
import type { Metadata } from "next";

import { AppearanceSwitch } from "@/components/app/appearance-switch";
import { SignOutButton } from "@/components/app/sign-out-button";
import { AvatarFigure } from "@/components/game/avatar";
import { levelProgress, levelTitle } from "@/game/core/progression";
import { stageLabel, yearLabel } from "@/lib/account/details";
import { requireAccount } from "@/lib/account/server";
import { isPlatformAdmin } from "@/lib/billing";
import { myMembership } from "@/lib/employers/server";
import { loadPlayer } from "@/lib/game/server";

export const metadata: Metadata = { title: "Me" };

type Row = { href: string; label: string; icon: LucideIcon; note?: string };

function Group({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section className="mt-6">
      <h2 className="text-muted-foreground px-1 text-xs font-bold tracking-widest uppercase">{title}</h2>
      <ul className="bg-card mt-2 divide-y divide-border overflow-hidden rounded-3xl border-2 border-white shadow-[0_4px_0_rgba(19,32,58,0.08)]">
        {rows.map((r) => {
          const Icon = r.icon;
          return (
            <li key={r.href}>
              <Link href={r.href} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-hover active:bg-foreground/[0.08]">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#dde8fd] text-[#2b5fd9]">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="font-semibold">{r.label}</span>
                {r.note && <span className="text-muted-foreground ml-auto text-sm">{r.note}</span>}
                <ChevronRight className={`text-muted-foreground size-4 shrink-0 ${r.note ? "" : "ml-auto"}`} aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default async function MePage() {
  const account = await requireAccount("/me");
  const [player, admin, membership] = await Promise.all([loadPlayer(account.id), isPlatformAdmin(), myMembership(account.id)]);
  const lp = levelProgress(player.xp);
  const d = account.details;

  return (
    <div className="mx-auto max-w-xl px-4 pt-5 pb-8 md:pt-10">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#2b5fd9] text-white shadow-[0_6px_0_rgba(19,32,58,0.18)] [background-image:radial-gradient(circle_at_85%_10%,rgba(242,217,166,0.35),transparent_45%)]">
        <div className="flex items-end gap-4 px-5 pt-5">
          <AvatarFigure avatar={player.avatar} size={150} showPet={false} className="-mb-1 shrink-0" />
          <div className="min-w-0 pb-5">
            <p className="truncate text-2xl font-extrabold">@{account.profile.username}</p>
            <p className="text-sm text-white/85">
              {stageLabel(d.stage)} · {yearLabel(d.yearGroup)}
            </p>
            <p className="mt-2 text-sm font-bold">
              Level {lp.level} · {levelTitle(lp.level)}
            </p>
            <div
              className="mt-1.5 h-2 w-40 overflow-hidden rounded-full bg-black/30"
              role="progressbar"
              aria-label="Progress to next level"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(lp.fraction * 100)}
            >
              <div className="h-full bg-[#f2d9a6]" style={{ width: `${lp.fraction * 100}%` }} />
            </div>
          </div>
        </div>
        <dl className="grid grid-cols-3 bg-card text-center text-foreground">
          {[
            ["Clout", player.clout.toLocaleString("en-GB"), "var(--ink-sun)"],
            ["Day streak", String(player.streak), "var(--ink-coral)"],
            ["Shifts", String(player.shiftsPlayed), "var(--ink-lime)"],
          ].map(([k, v, c]) => (
            <div key={k} className="py-3">
              <dd className="text-xl font-black" style={{ color: c }}>
                {v}
              </dd>
              <dt className="text-xs text-muted-foreground">{k}</dt>
            </div>
          ))}
        </dl>
      </section>

      <Link
        href="/games/locker"
        className="mt-4 flex items-center justify-center gap-2 rounded-full bg-[#f2d9a6] py-3.5 font-black text-[#0d1726] transition active:scale-[0.98]"
      >
        <Shirt className="size-5" aria-hidden /> Edit my character
      </Link>

      <Group
        title="Studying"
        rows={[
          { href: "/dashboard/settings", label: "Subjects and exam date", icon: SlidersHorizontal },
          { href: "/messages", label: "Messages", icon: MessageCircle },
          { href: "/games/world?phone=1", label: "My job, skills and CV", icon: Briefcase },
          { href: "/games/world?phone=1", label: "My home", icon: Home },
          { href: "/creators", label: "Creator scheme: get paid to post", icon: Video },
        ]}
      />
      <Group
        title="Employers"
        rows={
          membership
            ? [{ href: "/employers/office", label: `Your office · ${membership.org.name}`, icon: Building2 }]
            : [{ href: "/employers", label: "Work somewhere? Get your company verified", icon: Building2 }]
        }
      />
      <Group
        title="Account"
        rows={[
          { href: "/premium", label: "Premium", icon: Crown },
          { href: "/billing", label: "Billing", icon: CreditCard },
          { href: "/account/password", label: "Password", icon: KeyRound },
          { href: "/your-data", label: "Your data", icon: FileLock2 },
          ...(admin ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
        ]}
      />
      <section className="mt-6">
        <h2 className="text-muted-foreground px-1 text-xs font-bold tracking-widest uppercase">Appearance</h2>
        <AppearanceSwitch className="mt-2" />
      </section>
      <Group
        title="Help"
        rows={[
          { href: "/safeguarding", label: "Safeguarding and support", icon: LifeBuoy },
          { href: "/contact", label: "Contact us", icon: Mail },
          { href: "/privacy", label: "Privacy", icon: Shield },
        ]}
      />
      <div className="bg-card mt-6 rounded-3xl border">
        <SignOutButton />
      </div>
    </div>
  );
}
