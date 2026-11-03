export interface SceneTransition {
  id: number;
  destination: string;
  sourceId: number;
  startedAt: number;
  phase: "loading" | "revealing";
}
/** A handover owns navigation until its new renderer is ready and its fade finishes. */
export function sceneTransitionGate() {
  let serial = 0,
    current: SceneTransition | null = null;
  return {
    begin(destination: string, sourceId: number, startedAt: number) {
      if (current) return null;
      current = {
        id: ++serial,
        destination,
        sourceId,
        startedAt,
        phase: "loading",
      };
      return { ...current };
    },
    ready(event: { mapId: string; rendererId: number }) {
      if (
        !current ||
        current.phase !== "loading" ||
        event.mapId !== current.destination ||
        event.rendererId <= current.sourceId
      )
        return null;
      current = { ...current, phase: "revealing" };
      return { ...current };
    },
    finish(id: number) {
      if (current?.id !== id) return false;
      current = null;
      return true;
    },
    current() {
      return current;
    },
  };
}
