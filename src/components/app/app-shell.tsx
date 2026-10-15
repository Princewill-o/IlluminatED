"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Send } from "lucide-react";

import { AvatarFigure } from "@/components/game/avatar";
import { type Avatar, DEFAULT_AVATAR, sanitiseAvatar } from "@/game/core/cosmetics";
import { levelForXp } from "@/game/core/progression";
import { APP_TABS, activeTab, screenTitle } from "@/lib/app-shell";
import { browserSupabase } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";

/** Fire this after anything that changes XP, Clout, streak or outfit, and the shell refreshes. */
export const PLAYER_CHANGED = "illuminated:player-changed";
export const notifyPlayerChanged = () => window.dispatchEvent(new Event(PLAYER_CHANGED));

export interface ShellPlayer {
  username: string | null;
  level: number;
  clout: number;
  streak: number;
  avatar: Avatar;
}

const EMPTY: ShellPlayer = { username: null, level: 1, clout: 0, streak: 0, avatar: DEFAULT_AVATAR };
const PlayerContext = createContext<ShellPlayer>(EMPTY);
export const useShellPlayer = () => useContext(PlayerContext);

const londonDate = (offset = 0) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(Date.now() + offset * 86_400_000),
  );

function usePlayer() {
  const [player, setPlayer] = useState<ShellPlayer>(EMPTY);
  const load = useCallback(async () => {
    const sb = browserSupabase();
    if (!sb) return;
    const { data: auth } = await sb.auth.getUser();
    if (!auth.user) return;
    const [profile, stats] = await Promise.all([
      sb.from("profiles").select("username").eq("id", auth.user.id).maybeSingle(),
      sb.from("player_stats").select("xp,clout,streak_days,last_played_on,avatar").eq("user_id", auth.user.id).maybeSingle(),
    ]);
    const s = stats.data;
    const alive = s?.last_played_on === londonDate() || s?.last_played_on === londonDate(-1);
    const raw = (s?.avatar ?? {}) as Record<string, string>;
    setPlayer({
      username: (profile.data?.username as string | undefined) ?? null,
      level: levelForXp(s?.xp ?? 0),
      clout: s?.clout ?? 0,
      streak: alive ? (s?.streak_days ?? 0) : 0,
      // The server only accepts owned items, so whatever is saved is wearable.
      avatar: sanitiseAvatar(raw, new Set(Object.values(raw))),
    });
  }, []);
  useEffect(() => {
    void load();
    window.addEventListener(PLAYER_CHANGED, load);
    return () => window.removeEventListener(PLAYER_CHANGED, load);
  }, [load]);
  return player;
}

const fmt = (n: number) => (n >= 10_000 ? `${Math.round(n / 1000)}k` : n.toLocaleString("en-GB"));

function AvatarBubble({ avatar, size = 34, active = false }: { avatar: Avatar; size?: number; active?: boolean }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#7c4dff]",
        active ? "ring-2 ring-[#c6f36b] ring-offset-2 ring-offset-[#09080d]" : "ring-1 ring-white/15",
      )}
      style={{ width: size, height: size }}
    >
      <AvatarFigure avatar={avatar} headOnly size={size * 1.08} title="" className="translate-y-[6%]" />
    </span>
  );
}

function Stats({ player, compact = false }: { player: ShellPlayer; compact?: boolean }) {
  return (
    <span className={cn("flex items-center font-black tabular-nums", compact ? "gap-2.5 text-[13px]" : "gap-3 text-sm")}>
      <span title={`${player.streak}-day streak`} aria-label={`${player.streak}-day streak`} className="text-[#ff7a6b]">
        🔥 {player.streak}
      </span>
      <span title={`${player.clout} Clout`} aria-label={`${player.clout} Clout`} className="text-[#ffd166]">
        💰 {fmt(player.clout)}
      </span>
    </span>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const player = usePlayer();
  const current = activeTab(path);
  const title = screenTitle(path);

  return (
    <PlayerContext.Provider value={player}>
      <div className="app-theme dark min-h-dvh bg-background text-foreground">
        {/* Side rail: tablets and laptops (like Instagram on the web) */}
        <nav
          aria-label="App"
          className="fixed inset-y-0 left-0 z-40 hidden w-[76px] flex-col border-r border-white/10 bg-[#09080d] px-3 py-5 md:flex xl:w-[248px]"
        >
          <Link href="/dashboard" className="mb-8 flex items-center gap-3 px-2" aria-label="IlluminatED home">
            <Image src="/brand/lion-head.webp" alt="" width={36} height={36} className="size-9 rounded-full bg-[#7c4dff]" priority />
            <span className="hidden text-lg font-extrabold tracking-tight xl:block">IlluminatED</span>
          </Link>
          <ul className="flex flex-1 flex-col gap-1.5">
            {APP_TABS.map((tab) => {
              const on = current === tab.id;
              const Icon = tab.icon;
              return (
                <li key={tab.id}>
                  <Link
                    href={tab.href}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-4 rounded-2xl px-3 py-3 transition-colors hover:bg-white/5 active:scale-[0.97]",
                      on && "bg-white/[0.07]",
                      tab.id === "play" && "text-[#c6f36b]",
                    )}
                  >
                    {tab.id === "me" ? (
                      <AvatarBubble avatar={player.avatar} size={28} active={on} />
                    ) : (
                      <Icon className={cn("size-7 shrink-0", on ? "stroke-[2.6]" : "stroke-[1.8]")} aria-hidden />
                    )}
                    <span className={cn("hidden text-[15px] xl:block", on ? "font-extrabold" : "font-medium")}>{tab.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link
            href="/messages"
            aria-current={path.startsWith("/messages") ? "page" : undefined}
            className={cn("mb-3 flex items-center gap-4 rounded-2xl px-3 py-3 transition-colors hover:bg-white/5", path.startsWith("/messages") && "bg-white/[0.07]")}
          >
            <Send className="size-7 shrink-0 stroke-[1.8]" aria-hidden />
            <span className="hidden text-[15px] font-medium xl:block">Messages</span>
          </Link>
          <Link href="/me" className="hidden rounded-2xl bg-white/5 p-3 xl:block">
            <span className="block text-xs font-bold text-[#b3abc4]">
              {player.username ? `@${player.username}` : "You"} · Level {player.level}
            </span>
            <span className="mt-1 block">
              <Stats player={player} />
            </span>
          </Link>
        </nav>

        {/* Top bar: phones */}
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#09080d]/95 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
          <div className="flex h-14 items-center gap-3 px-4">
            <Link href="/dashboard" aria-label="IlluminatED home" className="flex min-w-0 items-center gap-2">
              <Image src="/brand/lion-head.webp" alt="" width={30} height={30} className="size-[30px] rounded-full bg-[#7c4dff]" priority />
              <span className="truncate text-[19px] font-extrabold tracking-tight">{title ?? "IlluminatED"}</span>
            </Link>
            <span className="ml-auto flex items-center gap-3">
              <Stats player={player} compact />
              <Link href="/messages" aria-label="Messages" className="grid size-9 place-items-center rounded-full bg-white/5 active:scale-90">
                <Send className="size-[18px]" aria-hidden />
              </Link>
            </span>
          </div>
        </header>

        <main id="main" tabIndex={-1} className="min-h-[70dvh] pb-[calc(76px+env(safe-area-inset-bottom))] outline-none md:pb-10 md:pl-[76px] xl:pl-[248px]">
          {children}
        </main>

        {/* Bottom tab bar: phones (like the iOS app) */}
        <nav
          aria-label="App"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#09080d]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        >
          <ul className="grid h-[64px] grid-cols-5">
            {APP_TABS.map((tab) => {
              const on = current === tab.id;
              const Icon = tab.icon;
              if (tab.id === "play")
                return (
                  <li key={tab.id} className="grid place-items-center">
                    <Link
                      href={tab.href}
                      aria-current={on ? "page" : undefined}
                      aria-label="Play"
                      className={cn(
                        "-mt-6 grid size-[58px] place-items-center rounded-full border-4 border-[#09080d] bg-[#c6f36b] text-[#0b0910] shadow-[0_4px_0_0_rgba(0,0,0,0.6)] transition-transform active:translate-y-0.5 active:scale-95",
                        on && "bg-[#d8ff7d]",
                      )}
                    >
                      <Icon className="size-7 stroke-[2.4]" aria-hidden />
                    </Link>
                  </li>
                );
              return (
                <li key={tab.id}>
                  <Link
                    href={tab.href}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "relative flex h-full flex-col items-center justify-center gap-1 text-[11px] transition-transform active:scale-90",
                      on ? "font-extrabold text-white" : "font-medium text-[#8d85a0]",
                    )}
                  >
                    {on && <span aria-hidden className="absolute top-0 h-[3px] w-8 rounded-b-full bg-[#a67fff]" />}
                    {tab.id === "me" ? (
                      <AvatarBubble avatar={player.avatar} size={26} active={on} />
                    ) : (
                      <Icon className={cn("size-[26px]", on ? "stroke-[2.6]" : "stroke-[1.8]")} aria-hidden />
                    )}
                    {tab.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </PlayerContext.Provider>
  );
}
