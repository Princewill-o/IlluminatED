import { DEFAULT_AVATAR, sanitiseAvatar, type Avatar } from "./cosmetics";

export const PREVIEW_AVATAR_KEY = "illuminated:preview-avatar:v1";
export const PREVIEW_AVATAR_EVENT = "illuminated:preview-avatar-changed";
/** Preview settings accept free cosmetics only; paid ownership stays on the account. */
export const normaliseBlockyAvatar = (raw: unknown): Avatar => sanitiseAvatar(raw ?? DEFAULT_AVATAR, new Set());
