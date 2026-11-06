/** Shared start time for the visible Underground train and station trips. */
export const TRAIN_CALL = { at: -1 };
/**
 * You on the train. `rel` is your x from the train's front (tiles), so you stay put inside the
 * carriage while it moves; your y is your own. Survives the switch between stations.
 */
export const RIDE: { active: boolean; phase: "boarded" | "departing" | "arriving" | "docked"; at: number; rel: number; dest: string } = {
  active: false, phase: "boarded", at: 0, rel: 0, dest: "",
};
