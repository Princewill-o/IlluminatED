export type SceneSnapshot = HTMLCanvasElement | string;
let capture: (() => SceneSnapshot | null) | null = null;
let serial = 0,
  activeId = 0;
let readyScene: { mapId: string; rendererId: number } | null = null;
const requests = new Set<{
  id: number;
  finish: (canvas: HTMLCanvasElement | null) => void;
}>();
export const sceneCaptureId = () => activeId;
export const readSceneReady = () => readyScene;
/** Snapshot only a presented frame: no extra render, JPEG encoding or data URL. */
export function requestSceneCapture(): Promise<HTMLCanvasElement | null> {
  if (!capture) return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = {
      id: activeId,
      finish: (source: HTMLCanvasElement | null) => {
        clearTimeout(timeout);
        requests.delete(request);
        if (!source) {
          resolve(null);
          return;
        }
        try {
          const image = document.createElement("canvas"),
            scale = Math.min(1, 960 / source.width);
          image.width = Math.max(1, Math.round(source.width * scale));
          image.height = Math.max(1, Math.round(source.height * scale));
          const ctx = image.getContext("2d");
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(source, 0, 0, image.width, image.height);
          resolve(image);
        } catch {
          resolve(null);
        }
      },
    };
    const timeout = setTimeout(() => request.finish(null), 180);
    requests.add(request);
  });
}
export function registerSceneCapture(next: () => SceneSnapshot | null) {
  const id = ++serial;
  capture = next;
  activeId = id;
  const release = () => {
    if (capture === next) {
      capture = null;
      activeId = 0;
    }
    for (const request of requests) if (request.id === id) request.finish(null);
  };
  release.id = id;
  release.frame = (canvas: HTMLCanvasElement) => {
    if (capture !== next) return;
    for (const request of requests)
      if (request.id === id) request.finish(canvas);
    publishSceneFrame(canvas);
  };
  release.ready = (mapId: string) => {
    if (capture !== next) return;
    readyScene = { mapId, rendererId: id };
    window.dispatchEvent(
      new CustomEvent("illuminated:scene-ready", { detail: readyScene }),
    );
  };
  return release;
}
export function captureScene() {
  try {
    return capture?.() ?? null;
  } catch {
    return null;
  }
}

const frameReaders = new Set<(canvas: HTMLCanvasElement) => void>();
/** Copy the presented frame while WebGL's drawing buffer is still available. */
export function publishSceneFrame(canvas: HTMLCanvasElement) {
  for (const reader of frameReaders) {
    try {
      reader(canvas);
    } catch {
      /* Keep the previous video frame if a WebGL context is being replaced. */
    }
  }
}
/** One stable video canvas survives doorway/scene replacements for a short recording. */
export function recordSceneCapture(fps = 24) {
  if (!capture)
    throw new Error(
      "Open Explore and wait for the city to load before recording.",
    );
  const canvas = document.createElement("canvas");
  const portrait = window.innerHeight > window.innerWidth;
  canvas.width = portrait ? 720 : 1280;
  canvas.height = portrait ? 1280 : 720;
  const context = canvas.getContext("2d");
  if (!context || typeof canvas.captureStream !== "function")
    throw new Error("City recording is unavailable in this browser.");
  let last = -Infinity,
    disposed = false;
  const read = (source: HTMLCanvasElement) => {
    const now = performance.now();
    if (disposed || now - last < 1000 / fps || !source.width || !source.height)
      return;
    last = now;
    const scale = Math.min(
      canvas.width / source.width,
      canvas.height / source.height,
    );
    context.fillStyle = "#17243c";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(
      source,
      (canvas.width - source.width * scale) / 2,
      (canvas.height - source.height * scale) / 2,
      source.width * scale,
      source.height * scale,
    );
  };
  const stream = canvas.captureStream(fps);
  frameReaders.add(read);
  return {
    stream,
    dispose() {
      if (disposed) return;
      disposed = true;
      frameReaders.delete(read);
      stream.getTracks().forEach((track) => track.stop());
    },
  };
}
