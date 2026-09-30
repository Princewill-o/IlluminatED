"use client";

import { useEffect, useState } from "react";

import { socialConfigured } from "@/lib/social/config";
import { browserSupabase } from "@/lib/supabase-browser";

/** true / false once known, null while checking. Updates on sign-in and sign-out. */
export function useSignedIn(): boolean | null {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    const sb = browserSupabase();
    if (!sb || !socialConfigured) {
      setSignedIn(false);
      return;
    }
    sb.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = sb.auth.onAuthStateChange((_e, session) =>
      setSignedIn(Boolean(session)),
    );
    return () => data.subscription.unsubscribe();
  }, []);
  return signedIn;
}
