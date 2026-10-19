/** Cap expensive updates without tying simulation speed to screen refresh rate. */
export function frameBudget(fps = 60) {
  const interval = 1000 / fps;
  let next = 0;
  return (now: number) => {
    if (now + 0.1 < next) return false;
    // Retain fractional timing at 120/144/240Hz; discard backlog after a pause.
    next = next && now - next < interval * 2 ? next + interval : now + interval;
    return true;
  };
}

export function graphicsBudget(low: boolean, mobile: boolean) {
  return {
    pixelRatio: low ? 0.65 : mobile ? 0.75 : 0.85,
    residents: low ? 8 : mobile ? 10 : 14,
    cyclists: low ? 2 : mobile ? 3 : 4,
    lights: low ? 0 : 2,
  };
}
