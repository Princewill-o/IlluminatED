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

/** High-detail population and lighting, independent of previous quality settings. */
export function graphicsBudget() {
  return { residents: 14, cyclists: 4, lights: 2 };
}
