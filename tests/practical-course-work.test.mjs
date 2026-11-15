import assert from "node:assert/strict";
import test from "node:test";
import { projectData } from "../scripts/lib/project-data.mjs";
const {ROLE_CONTRACTS}=projectData("src/lib/illum-world/role-contracts.ts");
const {courseWork,assessCourseWork}=projectData("src/lib/illum-world/course-work.ts");
const {liftCabinMap,blocked,TILE}=projectData("src/game/core/world.ts");
const {driverSeatAnchor}=projectData("src/game/core/realistic-cars.ts");
test("all courses require practical decisions, a calculation and an exception handover",()=>{
 assert.equal(ROLE_CONTRACTS.length,349);
 for(const course of ROLE_CONTRACTS){
  const task=courseWork(course);
  const work={decisions:Object.fromEntries(task.rows.map(row=>[row.id,row.expected])),total:String(task.total),owner:"Team supervisor",handover:"R2 needs the missing information supplied before it can proceed. R3 needs its conflicting evidence checked by the supervisor before the next processing run."};
  assert.equal(assessCourseWork(course,work).complete,true,course.id);
  assert.equal(assessCourseWork(course,{...work,total:"0"}).complete,false);
  assert.equal(assessCourseWork(course,{...work,handover:"done"}).complete,false);
  assert.equal(assessCourseWork(course,{...work,decisions:{}}).complete,false);
 }
});
test("the lift cabin can be entered on foot and controls are inside",()=>{
 const map=liftCabinMap();
 const target=map.portals.find(p=>p.id==="lift-controls");
 assert.ok(!blocked(map,map.spawn.x,map.spawn.y));
 assert.ok(!blocked(map,4.5*TILE,4.5*TILE));
 assert.ok(!blocked(map,target.rect.x+TILE/2,target.rect.y+TILE/2));
 assert.ok(map.portals.some(p=>p.id==="lift-exit"));
});
test("driver cushion anchors fit inside differently sized cars on the UK driving side",()=>{
 for(const size of [{x:3.8,y:1.5,z:1.65},{x:3.2,y:1.2,z:1.45},{x:4.5,y:2.1,z:1.8}]){
  const anchor=driverSeatAnchor(size);
  assert.ok(anchor.z>0&&anchor.z<size.z/2);
  assert.ok(anchor.y>0&&anchor.y<size.y);
  assert.ok(Math.abs(anchor.x)<size.x/2);
 }
 assert.throws(()=>driverSeatAnchor({x:0,y:1,z:2}));
});
