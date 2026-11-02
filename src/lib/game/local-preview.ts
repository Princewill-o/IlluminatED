/** Offline gameplay is explicitly limited to the local development server. */
export const localGamePreview = (nodeEnv?: string, flag?: string) =>
  nodeEnv === "development" && flag === "1";
export function localPreviewPath(
  path: string,
  nodeEnv?: string,
  flag?: string,
) {
  return (
    localGamePreview(nodeEnv, flag) &&
    (["/games/city-showcase", "/games/locker"].includes(path) ||
      /^\/games\/promotion-panic\/[a-z0-9-]+\/?$/.test(path) ||
      path.startsWith("/world3d/"))
  );
}
export function gameWorldReturn(
  value: string | undefined,
  previewAllowed: boolean,
) {
  if (value && /^\/games\/world(?:\?[a-zA-Z0-9%=&._-]*)?$/.test(value))
    return value;
  if (
    previewAllowed &&
    value &&
    /^\/games\/city-showcase(?:\?[a-zA-Z0-9%=&._-]*)?$/.test(value)
  )
    return value;
  return previewAllowed
    ? "/games/city-showcase?map=city"
    : "/games/world?map=city";
}
