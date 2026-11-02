"use client";
import { useEffect, useRef, useState } from "react";

import { PLAYER } from "./art";

import { announceGameMoment } from "@/game/core/game-moments";
import type { Place } from "@/game/core/map-guide";
import {
  navigationRoute,
  remainingRoute,
  routeMetres,
  type WorldNavigation,
} from "@/game/core/navigation";
import { TILE, type WorldMap } from "@/game/core/world";

export function useNavigation(
  map: WorldMap,
  target: Place | null,
  driving: boolean,
  onArrive: () => void,
) {
  const [navigation, setNavigation] = useState<WorldNavigation | null>(null);
  const arrive = useRef(onArrive);
  arrive.current = onArrive;
  useEffect(() => {
    if (!target) {
      setNavigation(null);
      return;
    }
    let current = navigationRoute(map, PLAYER, target, driving),
      lastTile = "",
      arrived = false;
    let parkingNotice = false;
    if (!current.points.length)
      announceGameMoment({
        kind: "route",
        title: "No connected route",
        message:
          "Try a nearby entrance, or use public transport to reach this area.",
      });
    setNavigation(current);
    const update = () => {
      if (arrived) return;
      const end = current.points.at(-1);
      // Roads end at parking access. The final walk to the door has its own trail.
      if (end && Math.hypot(PLAYER.x - end.x, PLAYER.y - end.y) < TILE * 1.2) {
        if (
          !driving ||
          Math.hypot(PLAYER.x - target.x, PLAYER.y - target.y) < TILE * 1.6
        ) {
          arrived = true;
          setNavigation(null);
          arrive.current();
          return;
        }
        if (!parkingNotice) {
          parkingNotice = true;
          announceGameMoment({
            kind: "route",
            title: "Road access reached",
            message:
              "Park safely and get out. The pink walking trail will guide you to the entrance.",
          });
        }
      }
      const tile = `${Math.floor(PLAYER.x / TILE)}:${Math.floor(PLAYER.y / TILE)}`;
      if (tile === lastTile) return;
      lastTile = tile;
      const remaining = remainingRoute(current.points, PLAYER);
      current = remaining
        ? { ...current, points: remaining, metres: routeMetres(remaining) }
        : navigationRoute(map, PLAYER, target, driving);
      setNavigation(current);
    };
    const timer = window.setInterval(update, 900);
    update();
    return () => window.clearInterval(timer);
  }, [map, target, driving]);
  return navigation;
}
