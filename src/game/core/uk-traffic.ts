/** M25 routes already describe all six lane centres and their correct flow. */
export function ukTrafficRoutes(mapId: string, routes: [number, number][][]) {
  return (mapId === "m25" || mapId.startsWith("road-"))
    ? routes
    : routes.flatMap((route) => [route, [...route].reverse()]);
}
export const ukTrafficOffset = (mapId: string) => ((mapId === "m25" || mapId.startsWith("road-")) ? 0 : 1);
export const ukAmbientPeople = (mapId: string, normal: number) =>
  (["m25", "rotherhithe"].includes(mapId)||mapId.startsWith("road-")) ? 0 : normal;
export const ukTrafficCount = (mapId: string) =>
  (mapId === "m25" || mapId.startsWith("road-")) ? 54 : mapId === "rotherhithe" ? 16 : 10;
