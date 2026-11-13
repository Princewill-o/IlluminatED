/**
 * Even frame pacing on any display. High-refresh screens (120, 144, 165, 240 Hz, common on
 * Windows laptops) would otherwise do two or three times the work for little gain, so the game
 * runs on every Nth display frame, where N is a whole number picked from the measured refresh
 * rate. Whole-frame steps keep motion even; a time-based cap on a 144 Hz screen updates on an
 * uneven 2-3-2-2-3 pattern of frames, which reads as judder when walking.
 *
 * Calls with the same timestamp (several loops in one display frame) get the same answer, so
 * the movement loop and the drawing loop always run on the same frames.
 */
export function framePacer(target = 60) {
  const wanted = 1000 / target;
  const gaps: number[] = [];
  let seen = Number.NaN, previous = Number.NaN, decision = true, count = 0, stride = 1;
  return (now: number) => {
    if (now === seen) return decision;
    seen = now;
    const gap = now - previous;
    previous = now;
    // Back from a pause or a long hitch: run straight away, and don't let it skew the rate.
    if (!(gap > 0) || gap > 100) { count = 0; decision = true; return decision; }
    gaps.push(gap);
    if (gaps.length > 40) gaps.shift();
    if (gaps.length >= 12 && count % 20 === 0) {
      const refresh = [...gaps].sort((a, b) => a - b)[gaps.length >> 1];
      stride = Math.max(1, Math.floor(wanted / refresh + 0.2));
    }
    count++;
    decision = count % stride === 0;
    return decision;
  };
}

/** One pacer for the whole page, shared by the movement and drawing loops. */
export const displayFrames = framePacer(60);

/** Cap expensive updates without tying simulation speed to screen refresh rate. */
export function frameBudget(fps = 60) {
  const interval = 1000 / fps;
  let next = 0;
  return (now: number) => {
    if (now + 0.1 < next) return false;
    // Retain fractional timing at 120/144/240Hz; discard backlog after a pause.
    next = next && now - next < interval ? next + interval : now + interval;
    return true;
  };
}

/** High-detail population and lighting, independent of previous quality settings. */
export function graphicsBudget() {
  return { residents: 64, cyclists: 8, lights: 2 };
}
