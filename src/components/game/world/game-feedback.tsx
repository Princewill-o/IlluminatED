"use client";
import { useEffect, useRef, useState } from "react";

import { Bell, Navigation, Sparkles, Trophy, X } from "lucide-react";

import { AvatarFigure } from "../avatar";
import styles from "./game-feedback.module.css";
import { HudSlot } from "./hud";

import type { Avatar } from "@/game/core/cosmetics";
import { GAME_MOMENT_EVENT, type GameMoment } from "@/game/core/game-moments";

type Notice = GameMoment & { id: number; at: number };
const beats = (kind: GameMoment["kind"]) =>
  kind === "quest"
    ? ["MISSION SELECTED", "KNOWLEDGE IS YOUR POWER", "LET’S BEGIN"]
    : kind === "reward"
      ? ["MISSION COMPLETE", "REWARDS SECURED", "NEXT QUEST AWAITS"]
      : kind === "checkpoint"
        ? [
            "THE FINAL CHECKPOINT",
            "THINK · SOLVE · REVIEW",
            "AIM FOR YOUR PERSONAL BEST",
          ]
        : ["DESTINATION LOCKED", "FOLLOW THE PINK TRAIL", "YOUR NEXT CHAPTER"];
export function GameCutscene({
  moment,
  avatar,
  onClose,
}: {
  moment: GameMoment;
  avatar?: Avatar;
  onClose: () => void;
}) {
  const [beat, setBeat] = useState(0),
    root = useRef<HTMLDivElement>(null),
    skip = useRef<HTMLButtonElement>(null),
    done = useRef(onClose);
  done.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    skip.current?.focus();
    const timer = window.setTimeout(() => done.current(), 5400),
      steps = window.setInterval(
        () => setBeat((value) => Math.min(2, value + 1)),
        1800,
      );
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        done.current();
      }
      if (e.key === "Tab") {
        const buttons = Array.from(
          root.current?.querySelectorAll<HTMLButtonElement>("button") ?? [],
        );
        if (buttons.length === 1) {
          e.preventDefault();
          buttons[0].focus();
        }
      }
    };
    window.addEventListener("keydown", key, true);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(steps);
      window.removeEventListener("keydown", key, true);
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <div
      ref={root}
      data-game-cutscene
      role="dialog"
      aria-modal="true"
      aria-label={`${moment.title} cutscene`}
      className={`${styles.scene} absolute inset-0 z-[100040] overflow-hidden text-white`}
    >
      <div className="absolute inset-x-0 top-0 z-10 h-[8%] bg-black" />
      <div className="absolute inset-x-0 bottom-0 z-10 h-[8%] bg-black" />
      <div className={styles.street} aria-hidden>
        <div className={styles.city}>
          {[80, 130, 100, 180, 130, 165, 90, 145].map((height, i) => (
            <div key={i} className={styles.building} style={{ height }} />
          ))}
        </div>
        <div className={styles.road} />
        <div className={styles.orbit} />
        <div className={styles.hero}>
          <AvatarFigure avatar={avatar} size={180} />
        </div>
        {Array.from({ length: 12 }, (_, i) => (
          <i
            key={i}
            className={styles.spark}
            style={{ left: `${18 + i * 5.5}%`, animationDelay: `${i * 0.17}s` }}
          />
        ))}
      </div>
      <div className="absolute inset-x-0 top-[13%] px-6 text-center">
        <p
          key={beat}
          className={`${styles.notice} text-xs font-black tracking-[.2em] text-[#ffb6dc]`}
        >
          {beats(moment.kind)[beat]}
        </p>
        <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black sm:text-5xl">
          {moment.title}
        </h2>
      </div>
      <div className="absolute inset-x-0 bottom-[10%] z-20 mx-auto max-w-xl px-6 text-center">
        <p className="rounded-2xl bg-[#09121f]/90 p-3 text-sm text-white">
          {moment.message}
        </p>
        <button
          ref={skip}
          type="button"
          onClick={onClose}
          className="mt-3 min-h-11 rounded-full border border-white/60 bg-[#182642] px-6 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Skip scene · Continue →
        </button>
        <div
          aria-hidden
          className="mt-3 h-1 overflow-hidden rounded-full bg-white/20"
        >
          <div className={`${styles.progress} h-full bg-[#ff71be]`} />
        </div>
      </div>
    </div>
  );
}

export function GameFeedback({
  playerId,
  avatar,
  onSceneChange,
  floating = false,
}: {
  playerId: string;
  avatar: Avatar;
  onSceneChange: (active: boolean) => void;
  floating?: boolean;
}) {
  const [history, setHistory] = useState<Notice[]>([]),
    [notice, setNotice] = useState<Notice | null>(null),
    [open, setOpen] = useState(false),
    [unread, setUnread] = useState(0),
    [scenes, setScenes] = useState(true),
    [scene, setScene] = useState<Notice | null>(null);
  const counter = useRef(0),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    preference = useRef(true),
    callback = useRef(onSceneChange);
  callback.current = onSceneChange;
  useEffect(() => {
    try {
      preference.current = localStorage.getItem("illumed-cutscenes") !== "off";
      setScenes(preference.current);
    } catch {
      /* Optional preference. */
    }
    const receive = (event: Event) => {
      const value = (event as CustomEvent<GameMoment>).detail;
      if (
        !value ||
        typeof value.title !== "string" ||
        typeof value.message !== "string"
      )
        return;
      const item = { ...value, id: ++counter.current, at: Date.now() };
      setHistory((previous) => [item, ...previous].slice(0, 20));
      setUnread((n) => n + 1);
      setNotice(item);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setNotice(null), 6500);
      if (value.scene && preference.current) {
        setScene(item);
        callback.current(true);
      }
    };
    window.addEventListener(GAME_MOMENT_EVENT, receive);
    return () => {
      window.removeEventListener(GAME_MOMENT_EVENT, receive);
      if (timer.current) clearTimeout(timer.current);
      callback.current(false);
    };
  }, [playerId]);
  const dismiss = () => {
    setScene(null);
    callback.current(false);
  };
  const bell = (
    <button
      type="button"
      aria-label={`Game notifications${unread ? ` · ${unread} unread` : ""}`}
      aria-expanded={open}
      onClick={() => {
        setOpen((value) => !value);
        setUnread(0);
      }}
      className="relative grid min-h-11 min-w-11 place-items-center rounded-full border border-white/30 bg-[#13203a] text-white shadow-lg"
    >
      <Bell className="size-5" />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 min-w-5 rounded-full bg-[#ffb6dc] px-1 text-[10px] font-black text-[#23132c]">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
  return (
    <>
      {floating ? (
        <div className="absolute top-3 right-3 z-[100029]">{bell}</div>
      ) : (
        <HudSlot area="tr-tools" order={4}>
          {bell}
        </HudSlot>
      )}
      {notice && !scene && !open && (
        <div
          key={notice.id}
          role="status"
          className={`${styles.notice} pointer-events-auto absolute top-[18%] left-1/2 z-[100030] w-[min(90%,420px)] -translate-x-1/2 rounded-2xl border border-[#ffb6dc]/60 bg-[#13203a] p-4 text-white shadow-2xl`}
        >
          <div className="flex items-start gap-3">
            {notice.kind === "route" || notice.kind === "arrival" ? (
              <Navigation className="mt-1 size-5 shrink-0 text-[#ff9bce]" />
            ) : notice.kind === "reward" ? (
              <Trophy className="mt-1 size-5 shrink-0 text-[#ffe095]" />
            ) : (
              <Sparkles className="mt-1 size-5 shrink-0 text-[#ff9bce]" />
            )}
            <div className="flex-1">
              <p className="font-black">{notice.title}</p>
              <p className="mt-1 text-sm text-[#e2e9ff]">{notice.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="Dismiss notification"
              className="grid min-h-11 min-w-11 place-items-center rounded-full hover:bg-white/10"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}
      {open && (
        <section
          aria-label="Game notifications"
          className="bg-background text-foreground absolute top-16 right-3 z-[100035] max-h-[75%] w-[min(92%,380px)] overflow-y-auto rounded-2xl border p-5 shadow-2xl"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black">Your game updates</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close notifications"
              className="min-h-11 min-w-11"
            >
              ✕
            </button>
          </div>
          <label className="my-4 flex min-h-11 items-center gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              checked={scenes}
              onChange={(e) => {
                const enabled = e.target.checked;
                preference.current = enabled;
                setScenes(enabled);
                try {
                  localStorage.setItem(
                    "illumed-cutscenes",
                    enabled ? "on" : "off",
                  );
                } catch {
                  /* Optional. */
                }
              }}
            />
            Play mission cutscenes
          </label>
          <p className="text-muted-foreground text-xs">
            In-game updates for this visit. Motion follows your device’s
            reduced-motion setting.
          </p>
          {history.length === 0 && (
            <p className="py-5 text-sm">
              Choose a quest or mark a destination to get started.
            </p>
          )}
          {history.map((item) => (
            <article key={item.id} className="mt-3 rounded-xl border p-3">
              <p className="font-bold">{item.title}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {item.message}
              </p>
              <time
                className="text-muted-foreground mt-2 block text-xs"
                dateTime={new Date(item.at).toISOString()}
              >
                {new Date(item.at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </article>
          ))}
        </section>
      )}
      {scene && (
        <GameCutscene
          key={scene.id}
          moment={scene}
          avatar={avatar}
          onClose={dismiss}
        />
      )}
    </>
  );
}
