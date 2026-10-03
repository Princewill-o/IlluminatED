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
    const { data } = sb.auth.onAuthStateChange((_e, session) =>
      setSignedIn(Boolean(session)),
    );
    sb.auth.getSession().then(({ data: sessionData }) =>
      setSignedIn(Boolean(sessionData.session)),
    );
    sb.auth.getUser().then(({ data: userData }) =>
      setSignedIn(Boolean(userData.user)),
    );
    return () => data.subscription.unsubscribe();
  }, []);
  return signedIn;
}
