/** Presentation flag only. It never grants access, changes plans, or authenticates. */
export const NATIVE_IOS_AGENT = "IlluminatED-iOS/";
export const NATIVE_MEMBERSHIP_PATH = "/ios/membership";
const DIGITAL_CHECKOUT_PATHS = [
  "/premium",
  "/pricing",
  "/billing",
  "/games/expansions",
  "/games/store",
];

export function isNativeIOS(userAgent: string | null | undefined) {
  return Boolean(userAgent?.includes(NATIVE_IOS_AGENT));
}

export function nativeMembershipPath(path: string) {
  let decoded: string;
  try {
    decoded = decodeURIComponent(path).replace(/\/+$/, "");
  } catch {
    return false;
  }
  return DIGITAL_CHECKOUT_PATHS.some(
    (root) => decoded === root || decoded.startsWith(`${root}/`),
  );
}
