import type { ResidentPath } from "./residents";

export interface NearbyPerson {
  id: string;
  name: string;
  kind: "npc" | "player";
  x: number;
  y: number;
  distance: number;
}
export interface NpcFriend {
  npc_id: string;
  name: string;
  map_id: string;
  created_at?: string;
}
export const FRIEND_DISTANCE = 64;
const NAMES = [
  "Amara",
  "Theo",
  "Priya",
  "Oliver",
  "Zara",
  "Kai",
  "Freya",
  "Idris",
  "Maya",
  "Leo",
  "Aisha",
  "Noah",
  "Esme",
  "Ravi",
  "Sofia",
  "Jude",
];
export function residentIdentity(mapId: string, path: ResidentPath) {
  const route = `${path.x0}:${path.z0}:${path.x1}:${path.z1}`;
  const seed = Array.from(`${mapId}:${route}`).reduce(
    (n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) >>> 0,
    0,
  );
  return {
    id: `${mapId}:resident:${route}`,
    name: `${NAMES[seed % NAMES.length]} ${String.fromCharCode(65 + ((seed >>> 5) % 26))}.`,
  };
}
export const NPC_TOPICS = [
  {
    label: "Say hello",
    reply:
      "Good to see you! Fancy a walk around the city? There’s always something new to try.",
  },
  {
    label: "Study together",
    reply:
      "Let’s try five questions in the Study Quarter. Small sessions add up. You can open Study from your phone.",
  },
  {
    label: "Talk about work",
    reply:
      "I’m exploring different jobs. Pizzazz has delivery shifts, or you can visit a company reception and apply for a role.",
  },
  {
    label: "Business advice",
    reply:
      "Check your costs before accepting an order. Revenue minus supplies and wages is your profit. You can practise in Venture.",
  },
] as const;
