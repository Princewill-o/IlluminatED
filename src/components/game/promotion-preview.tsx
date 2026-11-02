"use client";
import { useEffect, useState, type ComponentProps } from "react";

import { PromotionPanic } from "./promotion-panic";

import {
  normaliseBlockyAvatar,
  PREVIEW_AVATAR_KEY,
} from "@/game/core/blocky-customization";
import { DEFAULT_AVATAR } from "@/game/core/cosmetics";

/** The local showroom never writes quiz rewards or needs an account session. */
export function PromotionPreview(
  props: Omit<ComponentProps<typeof PromotionPanic>, "avatar" | "canSave">,
) {
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);
  useEffect(() => {
    try {
      setAvatar(
        normaliseBlockyAvatar(
          JSON.parse(localStorage.getItem(PREVIEW_AVATAR_KEY) ?? "null"),
        ),
      );
    } catch {
      /* Keep the free starting character. */
    }
  }, []);
  return <PromotionPanic {...props} avatar={avatar} canSave={false} />;
}
