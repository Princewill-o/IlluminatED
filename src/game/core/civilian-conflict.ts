import { sentenceMs } from "./law";
import { createRng, type Rng } from "./rng";

export type StreetActor = "player" | "civilian";
export interface StreetHit { attacker: StreetActor; damage: number; at: number }
export interface StreetEncounter {
  id: string;
  npcId: string;
  npcName: string;
  startedAt: number;
  seed: number;
  witnesses: number;
  hits: readonly (StreetHit & { afterThreatEnded?: boolean })[];
  threatEndedAt: number | null;
}
export interface StreetEvidence {
  firstAttacker: StreetActor | null;
  civilianHits: number;
  playerHits: number;
  damageToPlayer: number;
  damageToCivilian: number;
  durationMs: number;
  responseDelayMs: number;
  lateRetaliationHits: number;
  hitsAfterThreatEnded: number;
  witnesses: number;
  proportionate: boolean;
}
export interface StreetCourtCase {
  id: string;
  npcId?: string;
  npcName: string;
  seed: number;
  charge: string;
  evidence: StreetEvidence;
  acquittalChance: number;
  fine: number;
  stars: number;
}
export interface StreetAssessment {
  kind: "no-case" | "defence" | "aggression" | "contested";
  message: string;
  caseFile?: StreetCourtCase;
  offence?: "scuffle";
}
export interface StreetVerdict {
  caseId: string;
  outcome: "acquitted" | "fine";
  fine: number;
  custodyMs: number;
}
export interface StreetResolution {
  caseId: string;
  outcome: "acquitted" | "paid" | "jailed";
  balance: number;
  finePaid: number;
  jailUntil: number;
}
const hash = (value: string) => Array.from(value).reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,2166136261);
const finite = (value: number, fallback = 0) => Number.isFinite(value) ? value : fallback;

/** A stable minority of civilians are agitated; staff and other players never are. */
export function civilianDisposition(id: string, seed = 0, role: "civilian" | "staff" | "player" = "civilian") {
  return {
    hostile: role === "civilian" && hash(`${id}:${seed}`) % 12 === 0,
    warning: "Agitated civilian · keep your distance or walk away",
    warningRadiusTiles: 3.2,
    attackRangeTiles: 1.05,
    windupMs: 2000,
    hitCooldownMs: 3500,
    damage: 9,
  };
}

export function beginStreetEncounter(input: { npcId: string; npcName: string; at: number; seed?: number; witnesses?: number }): StreetEncounter {
  const at = Math.max(0, finite(input.at));
  return {
    id: `${input.npcId}:${at}`, npcId: input.npcId, npcName: input.npcName,
    startedAt: at, seed: input.seed ?? hash(`${input.npcId}:${at}`),
    witnesses: Math.max(0, Math.min(5, Math.floor(finite(input.witnesses ?? 0)))),
    hits: [], threatEndedAt: null,
  };
}

/** Call only when an attack actually lands. The first landed hit fixes provenance. */
export function recordStreetHit(encounter: StreetEncounter, hit: StreetHit): StreetEncounter {
  const lastAt = encounter.hits.at(-1)?.at ?? encounter.startedAt;
  if (!Number.isFinite(hit.damage) || hit.damage <= 0 || !Number.isFinite(hit.at) || hit.at < lastAt || (hit.attacker !== "civilian" && hit.attacker !== "player")) return encounter;
  return {
    ...encounter,
    hits: [...encounter.hits, { attacker: hit.attacker, at: hit.at, damage: Math.min(100, hit.damage), afterThreatEnded: hit.attacker === "player" && encounter.threatEndedAt !== null && hit.at > encounter.threatEndedAt + 1500 }],
    // A new civilian attack restarts the threat, rather than treating the next
    // defensive response as retaliation against someone who had already stopped.
    threatEndedAt: hit.attacker === "civilian" ? null : encounter.threatEndedAt,
  };
}
export function endCivilianThreat(encounter: StreetEncounter, at: number): StreetEncounter {
  return { ...encounter, threatEndedAt: Math.max(encounter.hits.at(-1)?.at ?? encounter.startedAt, finite(at, encounter.startedAt)) };
}

export function streetEvidence(encounter: StreetEncounter): StreetEvidence {
  let damageToPlayer = 0, damageToCivilian = 0, civilianHits = 0, playerHits = 0, lateRetaliationHits = 0, hitsAfterThreatEnded = 0;
  let lastCivilianAt: number | null = null, responseDelayMs = 0;
  for (const hit of encounter.hits) {
    if (hit.attacker === "civilian") { lastCivilianAt = hit.at; civilianHits++; damageToPlayer += hit.damage; }
    else {
      playerHits++; damageToCivilian += hit.damage;
      const delay = lastCivilianAt === null ? 0 : hit.at-lastCivilianAt;
      responseDelayMs = Math.max(responseDelayMs, delay);
      if (lastCivilianAt !== null && delay > 8000) lateRetaliationHits++;
      if (hit.afterThreatEnded) hitsAfterThreatEnded++;
    }
  }
  const firstAttacker = encounter.hits[0]?.attacker ?? null;
  const proportionate = firstAttacker === "civilian" && !lateRetaliationHits && !hitsAfterThreatEnded && damageToCivilian <= damageToPlayer*2+20;
  return {
    firstAttacker, civilianHits, playerHits, damageToPlayer, damageToCivilian,
    durationMs: encounter.hits.length ? encounter.hits.at(-1)!.at-encounter.hits[0].at : 0,
    responseDelayMs, lateRetaliationHits, hitsAfterThreatEnded,
    witnesses: encounter.witnesses, proportionate,
  };
}

/** Fictional case rules. A defensive response does not automatically earn wanted stars. */
export function assessStreetEncounter(encounter: StreetEncounter, rng: Rng = createRng(encounter.seed)): StreetAssessment {
  const evidence = streetEvidence(encounter);
  if (!evidence.playerHits) return { kind: "no-case", message: "The civilian started the incident. You have not been charged." };
  const aggression = evidence.firstAttacker === "player";
  if (!aggression && evidence.proportionate && rng() >= (evidence.witnesses ? .2 : .35)) {
    return { kind: "defence", message: "The recorded attack supports self-defence. No wanted stars or fine." };
  }
  const chance = aggression ? .08 : evidence.proportionate ? Math.min(.95,.78+evidence.witnesses*.08) : Math.max(.14,.42-evidence.lateRetaliationHits*.05-evidence.hitsAfterThreatEnded*.08);
  const stars = evidence.damageToCivilian >= 50 ? 2 : 1;
  const caseFile: StreetCourtCase = {
    id: encounter.id, npcId: encounter.npcId, npcName: encounter.npcName, seed: encounter.seed,
    charge: aggression ? "Starting a street scuffle" : "Contested street incident · self-defence review",
    evidence, acquittalChance: chance,
    fine: Math.min(240,30+Math.ceil(evidence.damageToCivilian)*2+(!evidence.proportionate&&!aggression?20:0)), stars,
  };
  return aggression
    ? { kind: "aggression", offence: "scuffle", caseFile, message: "You landed the first hit. A street-scuffle report has been filed." }
    : { kind: "contested", caseFile, message: "The civilian disputes what happened. You can present the recorded attack in court; defending yourself has not earned wanted stars." };
}

/** Seeded outcomes survive rerenders/reloads; tests can supply a controlled RNG. */
export function adjudicateStreetCase(caseFile: StreetCourtCase, plea: "contest" | "admit", rng: Rng = createRng(caseFile.seed ^ 0x6a09e667)): StreetVerdict {
  const acquitted = plea === "contest" && rng() < caseFile.acquittalChance;
  return {
    caseId: caseFile.id, outcome: acquitted ? "acquitted" : "fine",
    fine: acquitted ? 0 : Math.max(1,Math.round(caseFile.fine*(plea === "admit" ? .8 : 1))),
    custodyMs: acquitted ? 0 : sentenceMs(caseFile.stars),
  };
}

/** No debt or negative wallet: a lost case is paid, or the existing jail timer starts. */
export function settleStreetVerdict(verdict: StreetVerdict, balance: number, now: number, choice: "pay" | "custody" = "pay"): StreetResolution {
  const wallet = Math.max(0,Math.floor(finite(balance)));
  if (verdict.outcome === "acquitted") return { caseId:verdict.caseId,outcome:"acquitted",balance:wallet,finePaid:0,jailUntil:0 };
  if (choice === "pay" && wallet >= verdict.fine) return { caseId:verdict.caseId,outcome:"paid",balance:wallet-verdict.fine,finePaid:verdict.fine,jailUntil:0 };
  return { caseId:verdict.caseId,outcome:"jailed",balance:wallet,finePaid:0,jailUntil:Math.max(0,finite(now))+verdict.custodyMs };
}
