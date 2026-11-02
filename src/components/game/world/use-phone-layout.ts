"use client";

import { useEffect, useState } from "react";

import { PHONE_MEDIA, phoneLayout } from "@/game/core/mobile-life";
import { isNativeIOS } from "@/lib/native-ios";

/** null avoids booting the 3D renderer before we know whether this is a phone. */
export function usePhoneLayout() {
  const [phone, setPhone] = useState<boolean | null>(null);
  useEffect(() => {
    const query = window.matchMedia(PHONE_MEDIA);
    const update = () =>
      setPhone(
        isNativeIOS(navigator.userAgent) ||
          phoneLayout(
            query.matches,
            navigator.userAgent,
            navigator.maxTouchPoints,
          ),
      );
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return phone;
}
