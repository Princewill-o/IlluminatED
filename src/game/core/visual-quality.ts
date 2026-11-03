/** Stored legacy graphics choices all resolve to the platform's high profile. */
export type VisualQuality = "high";
export function readVisualQuality(value: string | null): VisualQuality {
  // Accept existing stored preferences while retaining the single high profile.
  void value;
  return "high";
}

/** Keep the art direction with bounded pixel, shadow and effect budgets. */
export function visualProfile(dpr = 1, touch = false) {
  return {
    pixelRatio: Math.min(
      touch ? 1 : 1.5,
      Math.max(0.75, Number.isFinite(dpr) ? dpr : 1),
    ),
    shadows: true,
    shadowSize: touch ? 512 : 1024,
    postProcessing: true,
    environment: true,
    samples: touch ? 0 : 2,
    ambientOcclusion: true,
    occlusionSamples: touch ? 4 : 8,
    depthOfField: false,
    msaa: false,
    bloom: true,
    bloomStrength: 0.18,
    exposure: 1.12,
    adaptiveResolution: true,
  };
}

/** Hysteresis avoids oscillation; suspension/long tasks never count as slow rendering. */
export function adaptivePixelRatio(maximum: number) {
  const ceiling = Math.min(
    1.5,
    Math.max(0.65, Number.isFinite(maximum) ? maximum : 1),
  );
  let ratio = ceiling,
    last: number | null = null,
    windowAt = 0,
    elapsed = 0,
    frames = 0,
    healthySince: number | null = null;
  return (now: number, active = true) => {
    if (!Number.isFinite(now)) return ratio;
    if (!active) {
      last = null;
      frames = 0;
      elapsed = 0;
      windowAt = now;
      healthySince = null;
      return ratio;
    }
    if (last === null) {
      last = now;
      windowAt = now;
      return ratio;
    }
    const interval = now - last;
    last = now;
    if (interval <= 0 || interval > 250) {
      frames = 0;
      elapsed = 0;
      windowAt = now;
      healthySince = null;
      return ratio;
    }
    elapsed += interval;
    frames++;
    if (now - windowAt < 1200 || frames < 10) return ratio;
    const average = elapsed / frames;
    if (average > 30) {
      ratio = Math.max(0.65, Math.round((ratio - 0.1) * 100) / 100);
      healthySince = null;
    } else if (average < 19) {
      healthySince ??= windowAt;
      if (now - healthySince >= 5000) {
        ratio = Math.min(ceiling, Math.round((ratio + 0.05) * 100) / 100);
        healthySince = now;
      }
    } else healthySince = null;
    frames = 0;
    elapsed = 0;
    windowAt = now;
    return ratio;
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
