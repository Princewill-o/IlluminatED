/** M25 length in tiles: long enough to feel like a motorway, with two cut-and-cover tunnels. */
export const M25_COLS = 720;
/** Covered sections of the M25 (tile x ranges): the carriageway runs under a grassed roof. */
export const M25_TUNNELS: readonly [number, number][] = [[214, 262], [452, 520]];
