/** Accelerate gently, while respecting the collision system's hard travel limit. */
export function trafficAdvance(speed:number, target:number, dt:number, clearance:number) {
  const elapsed=Math.max(0,Math.min(0.1,dt));
  const next=Math.min(Math.max(0,target),Math.max(0,speed)+elapsed*1.4);
  const distance=Math.min(Math.max(0,clearance),next*elapsed);
  return {distance,speed:elapsed?distance/elapsed:Math.max(0,speed)};
}
