export const CHAT_LIMIT = 180;
export const CHAT_INTERVAL = 1500;
export type RoomMessage = { id: string; userId: string; username: string; text: string; at: number };
export function roomChatText(value: unknown): string | null {
  if (typeof value !== "string" || value.length > CHAT_LIMIT) return null;
  const text = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g," ").trim();
  return text || null;
}
