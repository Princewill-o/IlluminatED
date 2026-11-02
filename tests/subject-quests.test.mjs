import test from "node:test";
import assert from "node:assert/strict";
import { projectData } from "../scripts/lib/project-data.mjs";
const {questComplete,subjectQuestSummary}=projectData("src/game/core/subject-quests.ts");
const quest={courseId:"gcse-maths",topicId:"percentages",reviewed:true,passes:2,recent:true,questionCount:4};
test("a checkbox, stale pass or single round cannot complete a study quest",()=>{
 assert.equal(questComplete(quest),true);
 for(const change of [{reviewed:false},{passes:1},{recent:false},{recent:null},{questionCount:0}])assert.equal(questComplete({...quest,...change}),false);
});
test("the checkpoint unlocks only after every available quest is complete",()=>{
 assert.equal(subjectQuestSummary([]).examUnlocked,false);
 assert.equal(subjectQuestSummary([quest,{...quest,topicId:"equations",passes:1}]).examUnlocked,false);
 const summary=subjectQuestSummary([quest,{...quest,topicId:"equations"}]);
 assert.equal(summary.examUnlocked,true);assert.equal(summary.percent,100);assert.equal(summary.completed,2);
});
