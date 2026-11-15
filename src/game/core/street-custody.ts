import type { StreetAssessment, StreetCourtCase } from "./civilian-conflict";
import { canArrestPlayer, commit, type LifeState } from "./law";

export interface StreetCustody {
  caseId: string;
  npcId?: string;
  npcName: string;
  participants: ("player" | "civilian")[];
  stage: "responding" | "arresting" | "transport";
  dispatchedAt: number;
  arrestedAt: number | null;
  transportAt: number | null;
}
export interface StreetArrestProof {
  caseId: string;
  participants: ("player" | "civilian")[];
  arrestedAt: number;
  deliveredAt: number;
}

/** A reported scuffle raises the wanted level before custody is considered. */
export function recordStreetIncident(state: LifeState, assessment: StreetAssessment, now: number): LifeState {
  const file = assessment.caseFile;
  if (!file?.evidence.playerHits || state.hearing || state.jailUntil > now) return state;
  const next = assessment.offence ? commit(state, now, assessment.offence) : state;
  if (!canArrestPlayer(next.stars)) return next;
  return { ...next, hearing: { stars: next.stars, charge: file.charge, streetCase: file } };
}

export function beginStreetCustody(
  caseFile: StreetCourtCase,
  now: number,
  wantedStars: number,
): StreetCustody | null {
  const participants: StreetCustody["participants"] = [
    ...(caseFile.evidence.playerHits > 0 && canArrestPlayer(wantedStars) ? ["player" as const] : []),
    ...(caseFile.evidence.civilianHits > 0 ? ["civilian" as const] : []),
  ];
  if (participants.length === 0) return null;
  return {
    caseId: caseFile.id,
    npcId: caseFile.npcId,
    npcName: caseFile.npcName,
    participants,
    stage: "responding",
    dispatchedAt: now,
    arrestedAt: null,
    transportAt: null,
  };
}
export function advanceStreetCustody(
  state: StreetCustody,
  now: number,
  officersNear: boolean,
  wantedStars: number,
): StreetCustody {
  if (!Number.isFinite(now)) return state;
  if (
    state.stage === "responding" &&
    (!state.participants.includes("player") || canArrestPlayer(wantedStars)) &&
    officersNear &&
    now - state.dispatchedAt >= 2000
  )
    return { ...state, stage: "arresting", arrestedAt: now };
  if (
    state.stage === "arresting" &&
    state.arrestedAt !== null &&
    now - state.arrestedAt >= 3000
  )
    return { ...state, stage: "transport", transportAt: now };
  return state;
}
export function finishStreetTransport(
  state: StreetCustody,
  now: number,
): StreetArrestProof | null {
  if (
    state.stage !== "transport" ||
    state.arrestedAt === null ||
    state.transportAt === null ||
    !Number.isFinite(now) ||
    now - state.transportAt < 3000
  )
    return null;
  return {
    caseId: state.caseId,
    participants: state.participants,
    arrestedAt: state.arrestedAt,
    deliveredAt: now,
  };
}
export function canHearStreetCase(
  caseFile: StreetCourtCase,
  proof?: StreetArrestProof | null,
): boolean {
  return (
    !!proof &&
    proof.caseId === caseFile.id &&
    Number.isFinite(proof.arrestedAt) &&
    Number.isFinite(proof.deliveredAt) &&
    proof.deliveredAt - proof.arrestedAt >= 6000 &&
    Array.isArray(proof.participants) &&
    proof.participants.includes("player") &&
    (caseFile.evidence.civilianHits === 0 ||
      proof.participants.includes("civilian"))
  );
}

/** The renderer freezes a detained civilian beside the responding officers. */
export const STREET_CUSTODY: {
  npcId: string | null;
  stage: StreetCustody["stage"] | null;
  both: boolean;
} = { npcId: null, stage: null, both: false };
