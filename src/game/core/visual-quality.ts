export type VisualQuality =
  "auto" | "low" | "medium" | "high" | "ultra" | "cinematic";
export function readVisualQuality(value: string | null): VisualQuality {
  if (value === "cinematic") return "ultra";
  return value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "ultra"
    ? value
    : "auto";
}

/** Desktop gets the finished presentation; phones retain a direct, lighter renderer. */
export function visualProfile(
  quality: VisualQuality,
  mobile: boolean,
  dpr = 1,
) {
  const performance = quality === "low";
  const cinematic = quality === "cinematic" || quality === "ultra";
  const high =
    cinematic || quality === "high" || (quality === "auto" && !mobile);
  const composed = high || (!performance && !mobile);
  return {
    pixelRatio: performance
      ? 0.75
      : Math.min(
          high ? (mobile ? 1.25 : 1.5) : mobile ? 1 : 1.25,
          Math.max(1, Number.isFinite(dpr) ? dpr : 1),
        ),
    // Soft shadow maps on desktop by default; phones keep them for Cinematic.
    shadows: high || (!performance && !mobile),
    shadowSize: !mobile && !performance ? 2048 : 1024,
    postProcessing: composed,
    environment: !performance && !mobile,
    samples: composed && !mobile ? (high ? 4 : 2) : 0,
    ambientOcclusion: composed && !mobile,
    occlusionSamples: cinematic ? 16 : high ? 12 : 8,
    depthOfField: cinematic && !mobile,
    /** Hardware MSAA on the canvas itself (post-processing has its own samples). */
    msaa: !performance && !cinematic,
    bloom: high,
    bloomStrength: cinematic ? 0.17 : 0.12,
    exposure: 1.0,
    adaptiveResolution: quality === "auto",
  };
}

export function physicalSurface(colour: string) {
  const glass = new Set([
    "#243b49",
    "#182d3a",
    "#1c2430",
    "#aacbd0",
    "#152d3b",
    "#29444a",
    "#a9cfce",
  ]);
  return glass.has(colour.toLowerCase())
    ? { roughness: 0.24, metalness: 0.32, envMapIntensity: 0.75 }
    : { roughness: 0.84, metalness: 0.025, envMapIntensity: 0.25 };
}

/** Hysteresis avoids resolution pumping. Ignore asset/shader warm-up and
 * suspended tabs; require sustained slow frames before reducing GPU load. */
export function adaptivePixelRatio(maximum: number) {
  let ratio = maximum,
    started = -1,
    windowStart = -1,
    frames = 0,
    slow = 0,
    fast = 0;
  return (now: number, active = true) => {
    if (!Number.isFinite(now)) return ratio;
    if (!active || started < 0) {
      started = now;
      windowStart = -1;
      frames = slow = fast = 0;
      return ratio;
    }
    if (now - started < 6000) return ratio;
    if (windowStart < 0) {
      windowStart = now;
      frames = 0;
      return ratio;
    }
    frames++;
    if (now - windowStart < 2500) return ratio;
    const fps = (frames * 1000) / (now - windowStart);
    slow = fps < 42 ? slow + 1 : 0;
    fast = fps > 57 ? fast + 1 : 0;
    if (slow >= 2) {
      ratio = Math.max(Math.min(0.75, maximum), ratio * 0.85);
      slow = 0;
    }
    if (fast >= 3) {
      ratio = Math.min(maximum, ratio + 0.1);
      fast = 0;
    }
    frames = 0;
    windowStart = now;
    return ratio;
  };
}

/** Small optional camera accents; no physical 4DX hardware integration. */
export function immersiveMotion(
  seconds: number,
  walking: boolean,
  speed: number,
  enabled: boolean,
  reduced: boolean,
) {
  if (
    !enabled ||
    reduced ||
    !Number.isFinite(seconds) ||
    !Number.isFinite(speed)
  )
    return { rise: 0, bank: 0 };
  const drive = Math.min(1, Math.abs(speed) / 200);
  return {
    rise:
      Math.sin(seconds * (drive > 0 ? 17 : 8)) *
      (drive > 0 ? 0.012 * drive : walking ? 0.016 : 0),
    bank: Math.sin(seconds * 2) * 0.002 * drive,
  };
}

/** Match colour and depth passes in the curved world, including instancing/skinning. */
export function curvedVertexShader(source: string) {
  return source
    .replace(
      "#include <common>",
      "#include <common>\nuniform vec3 uFocus;\nuniform vec2 uBend;",
    )
    .replace(
      "#include <project_vertex>",
      `vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
  mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
#endif
vec4 bw = modelMatrix * mvPosition;
float bz = bw.z - uFocus.z;
float bx = bw.x - uFocus.x;
bw.y -= bz * bz * uBend.x + bx * bx * uBend.y;
mvPosition = viewMatrix * bw;
gl_Position = projectionMatrix * mvPosition;`,
    )
    .replace(
      "#include <worldpos_vertex>",
      `#include <worldpos_vertex>
#if defined(USE_ENVMAP) || defined(DISTANCE) || defined(USE_SHADOWMAP) || defined(USE_TRANSMISSION) || NUM_SPOT_LIGHT_COORDS > 0
float curveZ = worldPosition.z - uFocus.z;
float curveX = worldPosition.x - uFocus.x;
worldPosition.y -= curveZ * curveZ * uBend.x + curveX * curveX * uBend.y;
#endif`,
    );
}
