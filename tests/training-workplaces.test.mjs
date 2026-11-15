import assert from "node:assert/strict";
import test from "node:test";
import { projectData } from "../scripts/lib/project-data.mjs";

const { TRAINING_WORKPLACES } = projectData("src/game/core/training-workplaces.ts");
const { londonMap, workplaceMap, blocked, TILE } = projectData("src/game/core/world.ts");
const { logoFor } = projectData("src/game/core/logos.ts");

function connectedTiles(map) {
  const visited = new Set();
  const queue = [[Math.floor(map.spawn.x / TILE), Math.floor(map.spawn.y / TILE)]];
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i];
    const tile = `${x},${y}`;
    if (visited.has(tile) || blocked(map, (x + 0.5) * TILE, (y + 0.5) * TILE)) continue;
    visited.add(tile);
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return visited;
}

test("the new employers have unique reachable London doors and working training stations", () => {
  assert.equal(TRAINING_WORKPLACES.length, 10);
  const london = londonMap();
  const reachable = connectedTiles(london);
  const doors = [];
  for (const employer of TRAINING_WORKPLACES) {
    const id = `workplace-${employer.id}`;
    const door = london.portals.find(p => p.to.kind === "map" && p.to.mapId === id);
    assert.ok(door, `Missing London door for ${employer.name}`);
    assert.ok(!blocked(london, door.rect.x + TILE / 2, door.rect.y + TILE / 2), employer.name);
    assert.ok(reachable.has(`${door.rect.x / TILE},${door.rect.y / TILE}`), `${employer.name} is outside the connected city`);
    const tile = [door.rect.x, door.rect.y].join(",");
    assert.ok(!doors.includes(tile), `Shared entry point: ${employer.name}`);
    doors.push(tile);
    const office = workplaceMap(employer.id);
    assert.equal(office.name, employer.name);
    assert.ok(office.portals.some(p => p.to.kind === "role-contracts" && p.to.role === employer.role));
    assert.ok(office.portals.some(p => p.to.kind === "map" && p.to.mapId === "city"));
    assert.ok(logoFor(employer.id));
  }
  assert.deepEqual(
    londonMap().portals.filter(p => p.id.startsWith("training-door-")).map(p => [p.rect.x,p.rect.y]),
    london.portals.filter(p => p.id.startsWith("training-door-")).map(p => [p.rect.x,p.rect.y]),
  );
});
