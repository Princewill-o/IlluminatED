export type EnvironmentPhase = "day" | "dusk" | "night";

/** One art direction for the sky, diffuse fill, reflections and distant haze.
 * Inspired by folio-2025's coordinated DayCycles/Fog; values fit our city. */
const PALETTES = {
  // Clear, warm daylight: a blue sky, honey sunlight and soft lilac shade.
  day: {
    sky: "#a3c4f2", ground: "#b8996e", sun: "#ffe7c4",
    sunPower: 3.25, ambient: .19, hemisphere: 1.1,
    zenith: "#78a9ea", horizon: "#f5dcb6", earth: "#8c7a5e",
    fog: "#dbe5ec", fogEdge: "#aac6ea", environment: .38,
    glow: 0, sunGlow: 3.8,
  },
  // Golden hour: low amber sun, pink haze and violet shadows; lamps just coming on.
  dusk: {
    sky: "#a09ad8", ground: "#c07d5e", sun: "#ff9f62",
    sunPower: 2.2, ambient: .16, hemisphere: .95,
    zenith: "#4f5aa8", horizon: "#ff9f72", earth: "#7a5060",
    fog: "#e3a593", fogEdge: "#7b6cb2", environment: .25,
    glow: .6, sunGlow: 2.6,
  },
  // Moonlit night: deep blue, cool moonlight, and warm pools under the lamps.
  night: {
    sky: "#4a5fa6", ground: "#2b2d4a", sun: "#a7bcff",
    sunPower: .62, ambient: .12, hemisphere: .66,
    zenith: "#0a1430", horizon: "#2b386a", earth: "#1b1d30",
    fog: "#18233f", fogEdge: "#2c2a52", environment: .11,
    glow: 1, sunGlow: .4,
  },
} as const;

export const environmentPalette = (phase: EnvironmentPhase) => PALETTES[phase];

export function weatherLighting(kind: string) {
  const rain = ["Light rain", "Drizzle", "Rain", "Heavy rain", "Thunderstorm"].includes(kind);
  const heavy = kind === "Heavy rain" || kind === "Thunderstorm";
  const snow = kind === "Snow" || kind === "Heavy snow";
  const fog = kind === "Fog";
  const overcast = rain || snow || fog || !["Sunny", "Bright", "Clear"].includes(kind);
  return { rain: rain ? 1 : 0, wetness: rain ? 1 : snow ? .25 : 0,
    overcast,
    // Storms are gloomy; snow is bright (it bounces light back up); a light grey day sits between.
    sun: kind === "Thunderstorm" ? .32 : heavy ? .42 : snow ? .72 : overcast ? .62 : 1,
    fill: snow ? 1.25 : heavy ? .8 : 1,
    haze: fog ? 1 : heavy ? .55 : rain ? .3 : kind === "Heavy snow" ? .6 : snow ? .35 : 0 };
}
