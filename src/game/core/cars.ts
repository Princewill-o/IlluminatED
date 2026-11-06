/** Cars at the dealership (parody names). Prices in Clout; must match the car_buy migration. */
export interface CarModel {
  id: "sedan" | "hatchback-sports" | "suv" | "van" | "cab" | "mini" | "ev-hatch" | "pickup" | "box-van" | "camper" | "rally" | "supercar";
  name: string;
  blurb: string;
  price: number;
  speed: number;
}

export const CARS: CarModel[] = [
  { id: "sedan", name: "Vauxwell Saloon", blurb: "A sensible first car. Comfy and reliable.", price: 120, speed: 3.0 },
  { id: "van", name: "City Utility Hatch", blurb: "A practical runabout for shopping and deliveries.", price: 180, speed: 2.8 },
  { id: "suv", name: "Range Rambler", blurb: "Big, bold and great on Highland roads.", price: 220, speed: 3.1 },
  { id: "cab", name: "City Cab", blurb: "A yellow taxi that knows every street.", price: 260, speed: 3.2 },
  { id: "hatchback-sports", name: "Zoom GT", blurb: "A low sports coupe with a quick getaway.", price: 320, speed: 3.6 },
  { id: "mini", name: "Bricky Mini", blurb: "Nippy hatch with a white roof, bonnet stripes and a roof rack.", price: 140, speed: 2.9 },
  { id: "ev-hatch", name: "Volta EV", blurb: "Silent electric hatchback with a glowing light bar.", price: 240, speed: 3.2 },
  { id: "pickup", name: "Rambler Pickup", blurb: "Roof light bar, bull bar and a spare wheel. Built for the Highlands.", price: 260, speed: 3.0 },
  { id: "box-van", name: "Haulmark Van", blurb: "A proper box van for deliveries and moving house.", price: 230, speed: 2.7 },
  { id: "camper", name: "Wanderer Camper", blurb: "Two-tone camper with a pop-top roof for road trips.", price: 300, speed: 2.8 },
  { id: "rally", name: "Rally Hatch", blurb: "Roof light pod, spoiler and stripes. Built for the special stages.", price: 360, speed: 3.7 },
  { id: "supercar", name: "Vortex V12", blurb: "A wedge-shaped supercar with a rear wing. The fastest on the lot.", price: 480, speed: 4.0 },
];

/** Specialised cars that live in their own Blender folder (blender/cars). */
export const BLENDER_CARS = new Set(["mini", "ev-hatch", "pickup", "box-van", "camper", "rally", "supercar"]);

export const carById = (id: string) => CARS.find((c) => c.id === id);

/** A car as broadcast to the room: its id, optionally with the owner's paint ("mini@#c8322d"). */
export function paintedCar(car: string): { id: string; paint: string | null } {
  const [id, paint] = car.split("@");
  return { id, paint: paint && /^#[0-9a-f]{6}$/i.test(paint) ? paint : null };
}
export const validCar = (v: unknown): v is string =>
  typeof v === "string" && v.length < 40 && (Boolean(carById(paintedCar(v).id)) && (!v.includes("@") || paintedCar(v).paint !== null) || /^bus:[A-Z0-9]{1,4}$/.test(v));
