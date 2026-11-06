/**
 * Hotels: book a room at reception, pay a nightly rate in Clout, get a key card and use your
 * own room for the stay. The server (supabase hotel_book) holds the real bookings, rooms and
 * rates; these tables mirror it for the UI. One in-game night is one real day.
 */
import type { Placed } from "./homes";

export type RoomType = "standard" | "deluxe" | "suite";
export type HotelId = "hotel-0" | "hotel-1";

export const HOTELS: Record<HotelId, { name: string; tagline: string; rates: Record<RoomType, number>; design: [number, number, number] }> = {
  "hotel-0": { name: "The Lantern Hotel", tagline: "Boutique rooms above the city lights.", rates: { standard: 40, deluxe: 75, suite: 140 }, design: [5, 9, 3] },
  "hotel-1": { name: "The Garden House Hotel", tagline: "Quiet garden rooms, friendly prices.", rates: { standard: 30, deluxe: 60, suite: 110 }, design: [2, 0, 1] },
};

export const ROOM_TYPES: Record<RoomType, { name: string; perks: string[]; sleeps: string }> = {
  standard: { name: "Standard room", perks: ["Double bed", "Desk and lamp", "Rain shower"], sleeps: "Comfy and simple" },
  deluxe: { name: "Deluxe room", perks: ["Linen king bed", "Sofa and TV", "Rain shower", "Minibar"], sleeps: "Room to relax" },
  suite: { name: "Suite", perks: ["King bed", "Lounge with cinema TV", "Bath and rain shower", "Minibar", "Dining table"], sleeps: "The best in the house" },
};

/** Room numbers on floors 1 and 2: the same mix on each. */
/** Guest rooms along the gallery's back wall (door x in tiles). Floor is the room number's first digit. */
export const HOTEL_ROOMS: { room: string; type: RoomType; floor: 1 | 2; door: { x: number } }[] = [
  { room: "101", type: "standard", floor: 1, door: { x: 2 } }, { room: "102", type: "standard", floor: 1, door: { x: 6 } },
  { room: "103", type: "deluxe", floor: 1, door: { x: 9 } }, { room: "104", type: "suite", floor: 1, door: { x: 11 } },
  { room: "201", type: "standard", floor: 2, door: { x: 13 } }, { room: "202", type: "standard", floor: 2, door: { x: 16 } },
  { room: "203", type: "deluxe", floor: 2, door: { x: 18 } }, { room: "204", type: "suite", floor: 2, door: { x: 20 } },
];

export const MAX_NIGHTS = 7;
/** The seventh night is on the house. */
export function stayPrice(rate: number, nights: number) {
  const n = Math.max(1, Math.min(MAX_NIGHTS, Math.floor(nights)));
  return rate * (n >= 7 ? n - 1 : n);
}
/** Checking out early refunds half of each unused whole night. */
export function earlyRefund(rate: number, msLeft: number) {
  return Math.floor(Math.max(0, msLeft) / 86_400_000) * Math.floor(rate / 2);
}

export const isHotel = (id: string): id is HotelId => id === "hotel-0" || id === "hotel-1";
export const roomInfo = (room: string) => HOTEL_ROOMS.find((r) => r.room === room) ?? null;
export const roomMapId = (hotel: string, room: string) => `${hotel}-room-${room}`;
export function parseRoomMap(id: string): { hotel: HotelId; room: string } | null {
  const m = /^(hotel-[01])-room-([12]0[1-4])$/.exec(id);
  return m && isHotel(m[1]) ? { hotel: m[1], room: m[2] } : null;
}

/** Furniture in each room type (positions inside the 20×14 room shell; the door is at the bottom middle). */
export const ROOM_LAYOUTS: Record<RoomType, Placed[]> = {
  standard: [
    { key: "bed", item: "bed", x: 2, y: 2 }, { key: "bedside", item: "bedside", x: 6, y: 2 }, { key: "lamp", item: "lamp", x: 1, y: 2 },
    { key: "desk", item: "desk", x: 13, y: 2 }, { key: "wardrobe", item: "wardrobe", x: 8, y: 2 },
    { key: "shower", item: "rain-shower", x: 16, y: 9 }, { key: "sink", item: "sink", x: 16, y: 7 }, { key: "toilet", item: "toilet", x: 18, y: 7 },
    { key: "plant", item: "plant", x: 1, y: 11 }, { key: "rug", item: "rug", x: 3, y: 7 },
  ],
  deluxe: [
    { key: "bed", item: "linen-bed", x: 2, y: 2 }, { key: "bedside", item: "bedside", x: 6, y: 2 }, { key: "lamp", item: "lamp", x: 1, y: 2 },
    { key: "tv", item: "tv", x: 12, y: 2 }, { key: "sofa", item: "velvet-sofa", x: 12, y: 5 }, { key: "fridge", item: "fridge", x: 8, y: 2 },
    { key: "desk", item: "oak-desk", x: 2, y: 9 }, { key: "shower", item: "rain-shower", x: 17, y: 10 }, { key: "sink", item: "sink", x: 17, y: 8 },
    { key: "toilet", item: "toilet", x: 16, y: 2 }, { key: "palm", item: "palm", x: 18, y: 2 }, { key: "rug", item: "woven-rug", x: 2, y: 6 },
  ],
  suite: [
    { key: "bed", item: "linen-bed", x: 2, y: 2 }, { key: "bedside", item: "bedside", x: 6, y: 2 }, { key: "bedside-2", item: "bedside", x: 1, y: 2 },
    { key: "tv", item: "cinema-tv", x: 12, y: 2 }, { key: "sofa", item: "velvet-sofa", x: 12, y: 5 }, { key: "fridge", item: "fridge", x: 8, y: 2 },
    { key: "table", item: "marble-table", x: 6, y: 8 }, { key: "bath", item: "bath", x: 16, y: 10 }, { key: "shower", item: "rain-shower", x: 17, y: 7 },
    { key: "toilet", item: "toilet", x: 18, y: 2 }, { key: "sink", item: "sink", x: 16, y: 2 }, { key: "dresser", item: "long-dresser", x: 1, y: 7 },
    { key: "palm", item: "palm", x: 10, y: 2 }, { key: "monstera", item: "monstera", x: 1, y: 11 }, { key: "rug", item: "woven-rug", x: 12, y: 8 },
  ],
};
