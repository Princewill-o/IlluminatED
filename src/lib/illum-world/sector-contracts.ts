import type { ContractQuestion, RoleContract } from "./role-contracts";
import profiles from "./sector-profiles.json";

export const TRAINING_SECTORS = profiles;
function check(prompt: string, correct: string, wrong: string[], explanation: string, offset: number): ContractQuestion {
  const options = [...wrong];
  const answer = offset % 3;
  options.splice(answer, 0, correct);
  return { prompt, options, answer, explanation };
}
/** Introductory career scenarios share an evidence-review format within each sector. */
export const SECTOR_CONTRACTS: RoleContract[] = profiles.flatMap((sector, sectorIndex) =>
  sector.titles.map((title, roleIndex) => {
    const count = 12 + roleIndex * 3;
    const complete = count - 2;
    const cost = 40 + sectorIndex * 5 + roleIndex;
    const brief = `You are the ${title.toLowerCase()} in a fictional ${sector.name.toLowerCase()} team. Review ${sector.artifact}, decide which items can proceed and hand over unresolved work.`;
    const evidence = `Your queue has ${count} records. ${complete} have complete identifiers, one has a missing identifier and one repeats an existing reference. Keep the original records and investigate the two exceptions.`;
    const q = (prompt: string, answer: string, wrong: string[], reason: string, n: number) =>
      check(prompt, answer, wrong, reason, roleIndex + n);
    return {
      id: `career-${sector.id}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      title, workplace: `${sector.name} training studio`, workplaceId: `training-${sector.id}`,
      summary: brief, skills: ["Evidence review", "Checking totals", "Prioritising exceptions", "Clear handover"],
      sources: [{ title: "Explore occupational skills", provider: "European Commission ESCO", url: "https://esco.ec.europa.eu/en/classification/occupation_main", checked: "2026-11-15" }],
      shifts: [
        { id: "review", title: "Shift 1 · Review the evidence", minutes: 8, brief,
          steps: [`Read the ${title.toLowerCase()}'s brief and identify the requested outcome.`, `Inspect the supplied ${sector.artifact}; preserve the original.`, "Mark missing and repeated identifiers for review before changing any records."],
          example: evidence,
          questions: [
            q("What is the best first action?", "Preserve the original and inspect identifiers", ["Remove anything that looks unusual", "Mark all records complete"], "An unchanged original lets another person trace and verify your decisions.", 0),
            q("How many records have complete identifiers?", String(complete), [String(count), String(complete - 1)], `${count} minus the two exceptions leaves ${complete} complete records.`, 1),
            q("A reference appears twice. What is established?", "The records need checking against the source", ["There were definitely two separate events", "The second record must be deleted immediately"], "A repeated reference is a reason to investigate. Keep both records until the source resolves the ambiguity.", 2),
          ] },
        { id: "decide", title: "Shift 2 · Make a decision", minutes: 8,
          brief: `The supervisor asks you to deal with a discrepancy in the ${sector.artifact}. Explain the next action and the resource it needs.`,
          steps: [`In this exercise, ${sector.action}.`, "Use the supplied cost and time figures, then state what they cover.", "Give the supervisor the evidence and unresolved question."],
          example: `The scenario's approved next step is to ${sector.action}. Reviewing each exception takes 6 minutes and costs £${cost}. There are two exceptions. No other costs or times are included.`,
          questions: [
            q("Which action follows the scenario's approved process?", sector.action.charAt(0).toUpperCase() + sector.action.slice(1), ["Approve the unresolved record without checking", "Publish the records online to ask for help"], "Use the stated escalation process and provide the evidence to the responsible person.", 3),
            q("What is the total review time for both exceptions?", "12 minutes", ["6 minutes", "18 minutes"], "Two exceptions multiplied by six minutes per review gives twelve minutes.", 4),
            q("What is the supplied review cost for two exceptions?", `£${cost * 2}`, [`£${cost}`, `£${cost * 3}`], `Two reviews at £${cost} each cost £${cost * 2} under the supplied assumptions.`, 5),
          ] },
        { id: "handover", title: "Shift 3 · Explain your work", minutes: 8,
          brief: `Prepare the ${title.toLowerCase()}'s short handover so the next colleague understands your decision.`,
          steps: ["State the scope, checked count and two exceptions.", "Explain the approved action and give a named owner and next check.", "Keep personal information in the approved fictional team system."],
          example: `Reviewed ${count} ${sector.artifact}. ${complete} have complete identifiers; two need investigation. Proposed action: ${sector.action}. Supervisor to confirm the exceptions before the next processing run. Review estimate: 12 minutes, £${cost * 2}.`,
          questions: [
            q("What belongs in the handover?", "The checked evidence, exceptions, action and owner", ["Only a claim that everything is fine", "Only the total number of records"], "A colleague needs both the evidence and a clear action with ownership to continue the work.", 6),
            q("What can you conclude from this queue?", "It shows these records and the two unresolved exceptions", ["It proves the whole organisation has the same issue", "It proves a named colleague caused the issue"], "Keep the conclusion within the records actually reviewed. Responsibility and wider patterns require further evidence.", 7),
            q("Where should the detailed records be shared?", "The approved team system with authorised colleagues", ["A public social media post", "An unrelated personal group chat"], "Use the approved system and share the minimum information required for the handover.", 8),
          ] },
      ],
    };
  }),
);
