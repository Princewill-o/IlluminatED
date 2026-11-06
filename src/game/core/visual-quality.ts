/** Stored legacy graphics choices all resolve to the platform's high profile. */
export type VisualQuality = "high";
export function readVisualQuality(value: string | null): VisualQuality {
  // Accept existing stored preferences while retaining the single high profile.
  void value;
  return "high";
}

/**
 * Graphics tiers. "high" is the full art direction; "balanced" drops the
 * screen-space occlusion pass and halves shadow resolution; "performance"
 * renders straight to the screen with no post-processing or shadow maps.
 */
export type GraphicsTier = "high" | "balanced" | "performance";
export type GraphicsSetting = "auto" | GraphicsTier;
export const GRAPHICS_KEY = "world-graphics";
export function readGraphicsSetting(value: string | null): GraphicsSetting {
  return value === "high" || value === "balanced" || value === "performance" ? value : "auto";
}
const LOW_GPU = /swiftshader|llvmpipe|softpipe|mali|adreno \(tm\) [1-5]\d\d|powervr|intel\(r\) (hd|uhd) graphics( [1-6]\d\d)?\b|intel hd|gma|vivante|videocore/i;
/** Pick a starting tier from what the device tells us. Unknown hardware starts balanced. */
export function detectGraphicsTier({ touch = false, cores = 4, memory = 4, gpu = "" }: { touch?: boolean; cores?: number; memory?: number; gpu?: string }): GraphicsTier {
  if (LOW_GPU.test(gpu) || cores <= 2 || memory <= 2) return "performance";
  if (touch || cores <= 4 || memory <= 4 || /intel/i.test(gpu)) return "balanced";
  return /nvidia|geforce|radeon|rtx|gtx|apple m\d|arc/i.test(gpu) ? "high" : "balanced";
}
/** One step down when frames stay slow even at the lowest render resolution. */
export const lowerTier = (tier: GraphicsTier): GraphicsTier | null => (tier === "high" ? "balanced" : tier === "balanced" ? "performance" : null);
/** How many ambient residents, cyclists and lit lamps each tier can afford. */
export function populationBudget(tier: GraphicsTier, indoors: boolean) {
  if (indoors) return { residents: tier === "performance" ? 6 : tier === "balanced" ? 9 : 12, workers: tier === "performance" ? 4 : 8, cyclists: 0, lights: 2, outfits: tier === "high" };
  return { residents: tier === "performance" ? 20 : tier === "balanced" ? 40 : 64, workers: 8, cyclists: tier === "performance" ? 2 : tier === "balanced" ? 4 : 8, lights: tier === "high" ? 2 : 1, outfits: tier !== "performance" };
}

/** Keep the art direction with bounded pixel, shadow and effect budgets. */
export function visualProfile(dpr = 1, touch = false, tier: GraphicsTier = "high") {
  const base = visualProfileHigh(dpr, touch);
  if (tier === "balanced") return { ...base, pixelRatio: Math.min(base.pixelRatio, 1), shadowSize: touch ? 512 : 768, ambientOcclusion: false, occlusionSamples: 0 };
  if (tier === "performance") return { ...base, pixelRatio: 1, shadows: false, shadowSize: 256, postProcessing: false, ambientOcclusion: false, occlusionSamples: 0, bloom: false, environment: false };
  return base;
}
function visualProfileHigh(dpr: number, touch: boolean) {
  return {
    pixelRatio: Math.min(
      touch ? 1 : 1.25,
      Math.max(1, Number.isFinite(dpr) ? dpr : 1),
    ),
    shadows: true,
    shadowSize: touch ? 512 : 1024,
    postProcessing: true,
    environment: true,
    // FXAA handles edges without multisampling and resolving the HDR framebuffer.
    samples: 0,
    ambientOcclusion: true,
    occlusionSamples: touch ? 4 : 8,
    depthOfField: false,
    msaa: false,
    bloom: true,
    bloomStrength: 0.18,
    exposure: 1.12,
    adaptiveResolution: true,
    /** Black cartoon outlines (one depth pass) for the low-poly look. */
    outlines: true,
  };
}

/** Start sharp, but permit a bounded fallback on slower devices. Asset compilation
 * and suspension do not count as slow rendering; stable frames recover detail. */
export function adaptivePixelRatio(maximum: number) {
  const ceiling = Math.min(
    1.5,
    Math.max(1, Number.isFinite(maximum) ? maximum : 1),
  );
  let ratio = ceiling,
    last: number | null = null,
    windowAt = 0,
    elapsed = 0,
    frames = 0,
    readySince: number | null = null,
    healthySince: number | null = null;
  return (now: number, active = true, ready = true) => {
    if (!Number.isFinite(now)) return ratio;
    if (!active || !ready) {
      last = null;
      readySince = null;
      frames = 0;
      elapsed = 0;
      windowAt = now;
      healthySince = null;
      return ratio;
    }
    readySince ??= now;
    if (last === null) {
      last = now;
      windowAt = now;
      return ratio;
    }
    const interval = now - last;
    last = now;
    if (interval <= 0 || interval > 250 || now - readySince < 1000) {
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
    if (average > 17.5) {
      ratio = Math.max(0.75, Math.round((ratio - 0.1) * 100) / 100);
      healthySince = null;
    } else if (average < 17.1) {
      healthySince ??= windowAt;
      if (now - healthySince >= 12000) {
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
