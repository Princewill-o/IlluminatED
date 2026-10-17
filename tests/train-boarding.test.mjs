import assert from "node:assert/strict";
import test from "node:test";
import { projectData } from "../scripts/lib/project-data.mjs";

const { canBoardTrain, trainDoorOpenAt, trainTimes, TRAIN_CYCLE_MS } = projectData("src/game/core/train.ts");

test("station countdowns match arrivals, open doors and departures across cycles", () => {
  assert.equal(trainTimes(1000).arrivalSeconds, 4);
  assert.equal(trainTimes(5000).boardingSeconds, 1);
  assert.equal(trainTimes(6000).closingSeconds, 6);
  assert.equal(trainTimes(11999).closingSeconds, 1);
  assert.equal(trainTimes(12000).phase, "closing");
  assert.equal(trainTimes(12000).departureSeconds, 1);
  assert.equal(trainTimes(13000).phase, "departing");
  assert.equal(trainTimes(20000).arrivalSeconds, 9);
  assert.deepEqual(trainTimes(25000), trainTimes(1000));
});

test("boarding requires a stopped train with fully open doors", () => {
  for (const time of [0, 4999, 5000, 5999, 12000, 12500, 13000, 20000, 23999]) {
    assert.equal(canBoardTrain(time, 30, 5.3, 15.7), false, `time ${time}`);
  }
  for (const time of [6000, 8000, 11999, TRAIN_CYCLE_MS + 8000]) {
    assert.equal(canBoardTrain(time, 30, 5.3, 15.7), true, `time ${time}`);
  }
});

test("players must walk into a carriage doorway rather than stand on the platform", () => {
  for (const x of [5.3, 11.5, 17.7, 23.9]) {
    assert.equal(trainDoorOpenAt(8000, 30, x), true);
    assert.equal(canBoardTrain(8000, 30, x, 14.5), false);
    assert.equal(canBoardTrain(8000, 30, x, 15.7), true);
  }
  for (const x of [1, 7, 15, 28]) {
    assert.equal(canBoardTrain(8000, 30, x, 15.7), false);
  }
  assert.equal(canBoardTrain(8000, 30, 5.3, 17), false);
});
