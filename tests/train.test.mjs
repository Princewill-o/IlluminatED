import test from "node:test";
import assert from "node:assert/strict";
import { projectData } from "../scripts/lib/project-data.mjs";
const T = projectData("src/game/core/train.ts");
test("Train stops before doors open and closes before departure",()=>{
 const stop=T.trainFrame(5000,30).x;
 for(const t of [5500,6000,11000,12500]) assert.equal(T.trainFrame(t,30).x,stop);
 assert.equal(T.trainFrame(6000,30).doorOpen,1);
 assert.equal(T.trainFrame(13000,30).doorOpen,0);
 assert.ok(T.trainFrame(17000,30).x>stop);
 assert.equal(T.trainFrame(22000,30).visible,false);
});
test("Boarding waits for open doors without restarting the visible train",()=>{
 assert.equal(T.trainBoardingDelay(1000),5000);
 assert.equal(T.trainBoardingDelay(7000),600);
 assert.equal(T.trainBoardingDelay(12500),17500);
});
