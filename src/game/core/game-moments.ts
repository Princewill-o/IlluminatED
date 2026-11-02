export type GameMomentKind =
  "quest" | "reward" | "checkpoint" | "route" | "arrival" | "revision";
export interface GameMoment {
  kind: GameMomentKind;
  title: string;
  message: string;
  scene?: boolean;
}
export const GAME_MOMENT_EVENT = "illumed:game-moment";
export function announceGameMoment(moment: GameMoment) {
  if (typeof window !== "undefined")
    window.dispatchEvent(
      new CustomEvent<GameMoment>(GAME_MOMENT_EVENT, { detail: moment }),
    );
}
