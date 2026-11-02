/** Stored legacy graphics choices all resolve to the platform's high profile. */
export type VisualQuality = "high";
export function readVisualQuality(value: string | null): VisualQuality {
  // Accept existing stored preferences while retaining the single high profile.
  void value;
  return "high";
}

/** One high-detail profile on every display, including the latest composition effects. */
export function visualProfile(dpr = 1) {
  return {
    pixelRatio: Math.min(2, Math.max(1, Number.isFinite(dpr) ? dpr : 1)),
    shadows: true,
    shadowSize: 2048,
    postProcessing: true,
    environment: true,
    samples: 4,
    ambientOcclusion: true,
    occlusionSamples: 12,
    depthOfField: true,
    msaa: true,
    bloom: true,
    bloomStrength: 0.18,
    exposure: 1.12,
    adaptiveResolution: false,
  };
}

/** Renderer compatibility: keep the chosen high display ratio through slow or suspended frames. */
export function adaptivePixelRatio(maximum: number) {
  const ratio = Math.min(2, Math.max(1, Number.isFinite(maximum) ? maximum : 1));
  return (_now: number, active = true) => {
    // Keep the renderer callback signature without changing its fixed ratio.
    void active;
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
