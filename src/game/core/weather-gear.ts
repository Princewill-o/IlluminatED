/**
 * Dressing for the weather outdoors: rain, storms, snow or a cold snap put
 * your coat on (a hooded rain shell in the colour of your own top, with
 * wellies), and snow or freezing cold add a woolly beanie. Indoors, or on a
 * nice day, you're back in your own outfit. Your saved look never changes.
 */
const WET = ["Drizzle", "Light rain", "Heavy rain", "Thunderstorm"];
const SNOW = ["Snow", "Heavy snow"];
const PALETTES = ["navy", "teal", "emerald", "coral", "amber", "lavender", "sky", "rose", "sand", "slate"];

export interface Wearable { top?: string; bottom?: string; shoes?: string; hat?: string }

export function weatherReason(kind: string, temp: number) {
  if (SNOW.includes(kind)) return "snow";
  if (WET.includes(kind)) return "rain";
  if (temp <= 3) return "cold";
  return null;
}

export function weatherGear(avatar: Wearable, kind: string, temp: number): Partial<Wearable> | null {
  const why = weatherReason(kind, temp);
  if (!why) return null;
  // Keep your colours: a rain shell in the same palette as the top you're wearing.
  const palette = PALETTES.find((p) => avatar.top?.endsWith(`-${p}`)) ?? "navy";
  const gear: Partial<Wearable> = { top: `top-blocky-raincoat-${palette}`, shoes: `shoes-blocky-raincoat-${palette}` };
  if ((why === "snow" || why === "cold") && (!avatar.hat || avatar.hat === "hat-none" || avatar.hat === "hat-cap")) gear.hat = "hat-beanie";
  return gear;
}

export const GEAR_MESSAGE: Record<string, string> = {
  rain: "It's raining, so you've put your rain jacket and wellies on.",
  snow: "It's snowing! Coat, wellies and a beanie on.",
  cold: "It's freezing out, so you've wrapped up in your coat and beanie.",
};
