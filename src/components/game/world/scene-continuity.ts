let capture: (() => string | null) | null = null;
export function registerSceneCapture(next: () => string | null) {
  capture = next;
  const release = () => {
    if (capture === next) capture = null;
  };
  release.frame = (canvas: HTMLCanvasElement) => {
    if (capture === next) publishSceneFrame(canvas);
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
