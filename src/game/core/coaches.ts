/** Liveries requested from the supplied airport-coach reference. */
export const COACH_LENGTH = 6.6;
export const COACH_WIDTH = 1.8;
export const COACHES = [
  {
    id: "airline",
    name: "the airline",
    body: "#164b8a",
    accent: "#e6bb43",
    ink: "#ffffff",
    destination: "Heathrow · Gatwick",
    route: 0,
    at: 0.32,
  },
  {
    id: "national-express",
    name: "national express",
    body: "#f3f4f0",
    accent: "#d53c3a",
    ink: "#233b65",
    destination: "Airport express",
    route: 1,
    at: 0.64,
  },
  {
    id: "flixbus",
    name: "FLIXBUS",
    body: "#83cc24",
    accent: "#ffffff",
    ink: "#ffffff",
    destination: "Heathrow · Gatwick",
    route: 2,
    at: 0.36,
  },
] as const;
export type CoachId = (typeof COACHES)[number]["id"];
export const coachById = (id: string) => COACHES.find((c) => c.id === id);
