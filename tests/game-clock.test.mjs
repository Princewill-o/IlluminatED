import test from 'node:test';
import assert from 'node:assert/strict';
import { projectData } from '../scripts/lib/project-data.mjs';
const { gameDateAt, gamePhaseAt } = projectData('src/game/core/game-clock.ts');
const epoch = Date.UTC(2026, 9, 19);
test('one game hour takes 30 seconds and a full day takes twelve minutes', () => {
  assert.equal(gameDateAt(epoch + 30_000).getTime() - gameDateAt(epoch).getTime(), 3_600_000);
  assert.equal(gameDateAt(epoch + 720_000).getTime() - gameDateAt(epoch).getTime(), 86_400_000);
});
test('daylight and night advance without remounting a scene', () => {
  assert.equal(gamePhaseAt(epoch), 'night');
  assert.equal(gamePhaseAt(epoch + 7 * 30_000), 'day');
  assert.equal(gamePhaseAt(epoch + 18 * 30_000), 'dusk');
  assert.equal(gamePhaseAt(epoch + 20 * 30_000), 'night');
});
