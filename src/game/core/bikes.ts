/** Hire bikes (parody brands). Prices in Clout; must match the bike_hire migration. */
export interface BikeBrand {
  id: "lyme" | "santa" | "humm" | "own";
  name: string;
  blurb: string;
  colour: string;
  speed: number;
  price: number;
  minutes: number;
}

export const BIKES: (BikeBrand & { id: "lyme" | "santa" | "humm" })[] = [
  { id: "santa", name: "Santa Cycles", blurb: "Classic red pedal bike. Steady and cheap.", colour: "#d4241f", speed: 1.9, price: 10, minutes: 5 },
  { id: "humm", name: "Humm", blurb: "Teal e-bike with a gentle boost.", colour: "#1aa59a", speed: 2.3, price: 18, minutes: 5 },
  { id: "lyme", name: "Lyme", blurb: "Green e-bike. The fastest way across town.", colour: "#6cc04a", speed: 2.7, price: 25, minutes: 5 },
];

export const bikeById = (id: string) => BIKES.find((b) => b.id === id);

/** Bikes you own and keep in your garage. Prices in Clout; must match the bike_buy migration. */
export type BikeFrame = "city" | "bmx" | "road" | "ebike";
export interface OwnBike { frame: BikeFrame; colour: string }
export const BIKE_FRAMES: { id: BikeFrame; name: string; blurb: string; price: number; speed: number }[] = [
  { id: "city", name: "City cruiser", blurb: "Upright frame, basket and mudguards. Comfy for everyday trips.", price: 60, speed: 2.1 },
  { id: "bmx", name: "Street BMX", blurb: "Small, tough and nippy round corners.", price: 90, speed: 2.3 },
  { id: "road", name: "Road racer", blurb: "Drop bars and thin tyres. Fast on long straights.", price: 140, speed: 2.7 },
  { id: "ebike", name: "Volt e-bike", blurb: "Battery boost all the way. The quickest bike in London.", price: 220, speed: 3.0 },
];
export const BIKE_PAINTS = ["#7a3cf0", "#13203a", "#d4241f", "#f2b705", "#1aa59a", "#2b5fd9", "#ff6fae", "#f3f6fb", "#2a2733", "#6cc04a"] as const;
export const bikeFrame = (id: string) => BIKE_FRAMES.find((f) => f.id === id);
/** Your own bike, in the same shape the riding code uses for hire bikes (no time limit). */
export function ownBikeBrand(b: OwnBike): BikeBrand {
  const f = bikeFrame(b.frame) ?? BIKE_FRAMES[0];
  return { id: "own", name: `your ${f.name}`, blurb: f.blurb, colour: b.colour, speed: f.speed, price: 0, minutes: 0 };
}
/** What the 3D world draws under you: "frame:#colour" for your own bike, a plain colour for hire bikes. */
export const bikeLook = (brand: BikeBrand, own: OwnBike | null) => (brand.id === "own" && own ? `${own.frame}:${own.colour}` : brand.colour);
