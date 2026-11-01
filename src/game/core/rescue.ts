/** Ambulance choreography in milliseconds; hospital arrival happens after the full sequence. */
export const RESCUE_DURATION_MS = 15_000;
export type RescuePhase = "downed" | "approaching" | "loading" | "departing" | "arrived";
const clamp = (value: number) => Math.max(0,Math.min(1,value));
const smooth = (value: number) => { const t=clamp(value); return t*t*(3-2*t); };
export function rescueFrame(elapsedMs: number) {
  const time = Math.max(0,Number.isFinite(elapsedMs)?elapsedMs:0);
  const phase: RescuePhase = time < 3000 ? "downed" : time < 7000 ? "approaching" : time < 11000 ? "loading" : time < RESCUE_DURATION_MS ? "departing" : "arrived";
  const approach = smooth((time-3000)/4000);
  const loading = smooth((time-7900)/2100);
  const depart = smooth((time-11000)/4000);
  const doors = time < 7000 ? 0 : time < 7600 ? smooth((time-7000)/600) : time < 10300 ? 1 : time < 11000 ? 1-smooth((time-10300)/700) : 0;
  return {
    phase, approach, loading, depart, doors,
    stretcherApproach: smooth((time-7000)/900),
    lift: smooth((time-7900)/700),
    ambulanceX: phase === "downed" ? -13 : phase === "approaching" ? -13+approach*15 : 2+depart*19,
    playerOnGround: time < 7900,
    playerInAmbulance: time >= 10000,
    stretcherVisible: time >= 7000 && time < 10000,
    crewVisible: time >= 6500 && time < 10400,
    complete: time >= RESCUE_DURATION_MS,
  };
}

/** Carry the full stretcher past the rear opening before hiding the patient inside. */
export function rescuePatientPose(frame: ReturnType<typeof rescueFrame>, rearX: number) {
  const groundX=-2.4,insideX=rearX+.95;
  const patientX=groundX+(insideX-groundX)*frame.loading;
  return {
    patientX,
    patientY:.24+frame.lift*.8,
    stretcherX:frame.playerOnGround?(rearX-.85)+(groundX-rearX+.85)*frame.stretcherApproach:patientX,
    stretcherY:frame.lift*.37,
  };
}
