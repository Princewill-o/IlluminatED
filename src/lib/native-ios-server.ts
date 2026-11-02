import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { isNativeIOS, NATIVE_MEMBERSHIP_PATH } from "./native-ios";

/** Guard actions too: a client-side transition must not create a Stripe session. */
export async function requireWebCheckout() {
  if (isNativeIOS((await headers()).get("user-agent")))
    redirect(NATIVE_MEMBERSHIP_PATH);
}
