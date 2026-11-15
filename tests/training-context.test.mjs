import assert from "node:assert/strict";
import test from "node:test";
import { projectData } from "../scripts/lib/project-data.mjs";

const {
  lookupTrainingContext, escoOccupationUrl, parseEscoOccupation, parseBoardVacancies,
} = projectData("src/lib/illum-world/training-context.ts");
const { ROLE_CONTRACTS } = projectData("src/lib/illum-world/role-contracts.ts");

test("all catalogue courses resolve to allow-listed read-only career references", () => {
  for (const course of ROLE_CONTRACTS) {
    const context = lookupTrainingContext(course.id);
    assert.ok(context, course.id);
    const url = escoOccupationUrl(context.occupation);
    assert.equal(url.origin, "https://ec.europa.eu");
    assert.equal(url.pathname, "/esco/api/resource/occupation");
    assert.equal(url.searchParams.get("selectedVersion"), "v1.2.0");
    assert.equal(url.searchParams.get("uri"), context.occupation);
  }
  assert.equal(lookupTrainingContext("https://example.invalid"), null);
});

test("ESCO occupation results keep verified role names and deduplicated skill titles", () => {
  const uri = lookupTrainingContext("data-analyst").occupation;
  const data = { uri, title: "data analyst", _links: { hasEssentialSkill: [
    { title: "interpret data" }, { title: "manage data" },
    { title: "interpret data" }, {}, { title: "<iframe>" },
  ] } };
  const result = parseEscoOccupation(data, uri);
  assert.equal(result.title, "data analyst");
  assert.deepEqual([...result.skills], ["interpret data", "manage data"]);
  assert.equal(parseEscoOccupation({ ...data, uri: "https://example.org" }, uri), null);
});

test("Greenhouse returns only related safe links to verified listings", () => {
  const config = lookupTrainingContext("risk-analyst");
  const record = (id, title, absolute_url) => ({ id, title, absolute_url, location: { name: "London" } });
  const jobs = [
    record(1, "Credit Risk Analyst", "https://stripe.com/jobs/search?gh_jid=1"),
    record(1, "Credit Risk Analyst", "https://stripe.com/jobs/search?gh_jid=1"),
    record(2, "Credit Risk Analyst", "https://stripe.com.evil.test/jobs/search?gh_jid=2"),
    record(3, "Credit Risk Analyst", "javascript:alert(3)"),
    record(4, "Barista", "https://stripe.com/jobs/search?gh_jid=4"),
    record(5, "Fraud Analyst", "https://stripe.com/jobs/search?gh_jid=6"),
    record(7, "Credit Risk Analyst", "https://job-boards.greenhouse.io/notstripe/jobs/7"),
  ];
  const result = parseBoardVacancies({ jobs }, config);
  assert.equal(result.length, 1);
  assert.equal(result[0].title, "Credit Risk Analyst");
  assert.equal(result[0].location, "London");
});
