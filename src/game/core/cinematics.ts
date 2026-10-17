/** Shared clock for a short in-world establishing shot; no extra game scene is loaded. */
export const CAMERA_SHOT={at:-1};
export const INTRO_MS=2200;
export function cinematicOffset(elapsed:number,reduced=false){
 if(reduced||elapsed<0||elapsed>=INTRO_MS)return {x:0,z:0};
 const arc=Math.sin(Math.PI*elapsed/INTRO_MS);
 return {x:arc*0.9,z:-arc*0.6};
}
