/** Hire bikes (parody brands). Prices in Clout; must match the bike_hire migration. */
export interface BikeBrand {
  id: "lyme" | "santa" | "humm";
  name: string;
  blurb: string;
  colour: string;
  speed: number;
  price: number;
  minutes: number;
}

export const BIKES: BikeBrand[] = [
  { id: "santa", name: "Santa Cycles", blurb: "Classic red pedal bike. Steady and cheap.", colour: "#d4241f", speed: 1.9, price: 10, minutes: 5 },
  { id: "humm", name: "Humm", blurb: "Teal e-bike with a gentle boost.", colour: "#1aa59a", speed: 2.3, price: 18, minutes: 5 },
  { id: "lyme", name: "Lyme", blurb: "Green e-bike. The fastest way across town.", colour: "#6cc04a", speed: 2.7, price: 25, minutes: 5 },
];

export const bikeById = (id: string) => BIKES.find((b) => b.id === id);
