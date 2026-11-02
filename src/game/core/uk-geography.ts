import boundary from "./uk-boundary.json";
import roadData from "./uk-road-geometry.json";

type Coordinate = readonly number[];
const mercatorY = (latitude: number) =>
  Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360));
const west = (-8.6 * Math.PI) / 180,
  east = (2.2 * Math.PI) / 180;
const north = mercatorY(61.1),
  south = mercatorY(49.7);
const scale = Math.min(450 / (east - west), 500 / (north - south));
const offsetX = (520 - (east - west) * scale) / 2;
const offsetY = (570 - (north - south) * scale) / 2;

/** One shared projection for the coastline, road lines and every place marker. */
export function projectUK(
  longitude: number,
  latitude: number,
): [number, number] {
  return [
    offsetX + ((longitude * Math.PI) / 180 - west) * scale,
    offsetY + (north - mercatorY(latitude)) * scale,
  ];
}

export const geographicPath = (
  coordinates: readonly Coordinate[],
  close = false,
): string =>
  coordinates
    .map((point, index) => {
      const [x, y] = projectUK(point[0], point[1]);
      return `${index ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join("") + (close ? "Z" : "");

export const UK_OUTLINE = boundary.geometry.coordinates
  .flatMap((polygon) => polygon.map((ring) => geographicPath(ring, true)))
  .join("");
export const UK_ROAD_GEOMETRY = roadData.lines.map((road) => ({
  ref: road.ref,
  path: geographicPath(road.coordinates),
}));

function inRing(
  longitude: number,
  latitude: number,
  ring: readonly Coordinate[],
) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i],
      b = ring[j];
    if (
      a[1] > latitude !== b[1] > latitude &&
      longitude < ((b[0] - a[0]) * (latitude - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside;
}

export function isUKLand(longitude: number, latitude: number): boolean {
  return boundary.geometry.coordinates.some(
    (polygon) =>
      inRing(longitude, latitude, polygon[0]) &&
      !polygon.slice(1).some((ring) => inRing(longitude, latitude, ring)),
  );
}
