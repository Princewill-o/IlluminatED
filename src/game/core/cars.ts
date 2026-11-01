/** Cars at the dealership (parody names). Prices in Clout; must match the car_buy migration. */
export interface CarModel {
  id: "sedan" | "hatchback-sports" | "suv" | "van" | "cab";
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
];

export const carById = (id: string) => CARS.find((c) => c.id === id);
