"use client";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  readSceneReady,
  requestSceneCapture,
  sceneCaptureId,
} from "./scene-continuity";

import {
  sceneTransitionGate,
  type SceneTransition,
} from "@/game/core/scene-transition";

export type Passage = SceneTransition & {
  image: HTMLCanvasElement | null;
  label: string;
  door: boolean;
  ready: boolean;
};
export function useSceneTransition() {
  const gate = useRef(sceneTransitionGate()),
    alive = useRef(true);
  const [passage, setPassage] = useState<Passage | null>(null);
  useEffect(() => {
    alive.current = true;
    const owner = gate.current;
    return () => {
      alive.current = false;
      const active = owner.current();
      if (active) owner.finish(active.id);
    };
  }, []);
  const begin = useCallback(
    async (destination: string, label: string, door = false) => {
      const trip = gate.current.begin(
        destination,
        sceneCaptureId(),
        performance.now(),
      );
      if (!trip) return false;
      const image = await requestSceneCapture();
      if (!alive.current || gate.current.current()?.id !== trip.id)
        return false;
      setPassage({ ...trip, image, label, door, ready: false });
      return true;
    },
    [],
  );
  useEffect(() => {
    const trip = gate.current.current();
    if (!trip) return;
    let revealTimer: ReturnType<typeof setTimeout> | undefined,
      finishTimer: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      if (gate.current.finish(trip.id)) setPassage(null);
    };
    const reveal = (detail: { mapId: string; rendererId: number } | null) => {
      if (!detail || !gate.current.ready(detail)) return;
      revealTimer = setTimeout(
        () => {
          setPassage((current) =>
            current?.id === trip.id ? { ...current, ready: true } : current,
          );
          finishTimer = setTimeout(finish, 260);
        },
        Math.max(0, 220 - (performance.now() - trip.startedAt)),
      );
    };
    const ready = (event: Event) => reveal((event as CustomEvent).detail);
    const failed = (event: Event) => {
      if ((event as CustomEvent).detail?.mapId === trip.destination) finish();
    };
    window.addEventListener("illuminated:scene-ready", ready);
    window.addEventListener("illuminated:scene-failed", failed);
    reveal(readSceneReady());
    const deadline = setTimeout(finish, 12000);
    return () => {
      window.removeEventListener("illuminated:scene-ready", ready);
      window.removeEventListener("illuminated:scene-failed", failed);
      clearTimeout(deadline);
      if (revealTimer) clearTimeout(revealTimer);
      if (finishTimer) clearTimeout(finishTimer);
    };
  }, [passage?.id]);
  return {
    passage,
    begin,
    pending: useCallback(() => gate.current.current() !== null, []),
  };
}
