export type EnvironmentPhase = "day" | "dusk" | "night";

/** One art direction for the sky, diffuse fill, reflections and distant haze.
 * Inspired by folio-2025's coordinated DayCycles/Fog; values fit our city. */
const PALETTES = {
  day: {
    sky: "#a9b9eb", ground: "#ad8760", sun: "#ffcf9e",
    sunPower: 3.0, ambient: .17, hemisphere: 1.05,
    zenith: "#8eace2", horizon: "#edceaa", earth: "#89745d",
    fog: "#d6d9d5", fogEdge: "#b3b7da", environment: .36,
    glow: 0, sunGlow: 3.8,
  },
  dusk: {
    sky: "#a3a4db", ground: "#bb7f62", sun: "#ffaf81",
    sunPower: 2.0, ambient: .17, hemisphere: 1.0,
    zenith: "#666faf", horizon: "#f0a079", earth: "#755361",
    fog: "#c6a4b3", fogEdge: "#8b7ab6", environment: .27,
    glow: .55, sunGlow: 2.6,
  },
  night: {
    sky: "#788bcb", ground: "#514768", sun: "#9aaef4",
    sunPower: .85, ambient: .16, hemisphere: .8,
    zenith: "#142343", horizon: "#41466e", earth: "#222538",
    fog: "#222f4a", fogEdge: "#403656", environment: .15,
    glow: 1, sunGlow: .5,
  },
} as const;

export const environmentPalette = (phase: EnvironmentPhase) => PALETTES[phase];

export function weatherLighting(kind: string) {
  const rain = ["Light rain", "Drizzle", "Rain", "Heavy rain"].includes(kind);
  const snow = kind === "Snow";
  const fog = kind === "Fog";
  const overcast = rain || snow || fog || !["Sunny", "Bright", "Clear"].includes(kind);
  return { rain: rain ? 1 : 0, wetness: rain ? 1 : snow ? .25 : 0,
    overcast, sun: overcast ? .62 : 1, haze: fog ? 1 : rain ? .3 : snow ? .2 : 0 };
}
