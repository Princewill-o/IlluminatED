import assert from "node:assert/strict";
import test from "node:test";
import { projectData } from "../scripts/lib/project-data.mjs";

const C = projectData("src/game/core/careers.ts");
const W = projectData("src/game/core/world.ts");

test("every workplace has reachable reception, terminals and exit", () => {
  for (const workplace of C.WORKPLACES) {
    const map = W.workplaceMap(workplace.id);
    const seen = new Set();
    const queue = [[Math.floor(map.spawn.x/W.TILE), Math.floor(map.spawn.y/W.TILE)]];
    for (let i=0;i<queue.length;i++) {
      const [x,y] = queue[i], key = `${x},${y}`;
      if (seen.has(key) || !map.tiles[y]?.[x] || W.SOLID.has(map.tiles[y][x])) continue;
      seen.add(key);
      queue.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
    }
    assert.equal(map.portals.filter(p=>p.to.kind === "workstation").length,4);
    for (const p of map.portals) assert.ok(seen.has(`${p.rect.x/W.TILE},${p.rect.y/W.TILE}`), `${workplace.id}: ${p.id}`);
  }
  assert.equal(W.workplaceMap("missing"), null);
});

test("all ranks generate deterministic, answerable shifts with lessons", () => {
  const positions = new Set();
  for (const w of C.WORKPLACES) for (const role of w.roles) for (let seed=1;seed<=15;seed++) {
    const tasks = C.buildShift(role,seed);
    assert.deepEqual(tasks,C.buildShift(role,seed));
    assert.equal(tasks.length,5);
    for (const task of tasks) {
      assert.ok(task.lesson.text.length > 20);
      assert.ok(C.checkAnswer(task,task.answer));
      if (task.options) { assert.ok(task.options[task.answer]); positions.add(task.answer); }
      else assert.ok(Number.isFinite(task.answer));
      if (task.title === "Plan for lead time") {
        const demand = Number(task.prompt.match(/demand is (\d+)/)[1]);
        assert.equal(task.answer,demand*2);
      }
    }
  }
  assert.ok(positions.size > 2,"correct options should move between positions");
});
