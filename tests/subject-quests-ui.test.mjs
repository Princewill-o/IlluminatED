import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { projectData } from "../scripts/lib/project-data.mjs";
const core=projectData("src/game/core/subject-quests.ts");
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function mount({submit,onReward}={}) {
 const slots=[],effects=[];let cursor=0;
 const calls={choose:[],start:[],submit:[],reward:[]};
 const board={quests:["Percentages","Equations"].map((title,i)=>({courseId:"gcse-maths",courseTitle:"GCSE Mathematics",topicId:`maths-${i}`,title,questionCount:1,reviewed:false,passes:0,bestScore:0,recent:false,active:false})),exams:[]};
 const react={
  useState(initial){const at=cursor++;if(!(at in slots))slots[at]=typeof initial==="function"?initial():initial;return[slots[at],next=>{slots[at]=typeof next==="function"?next(slots[at]):next;}];},
  useRef(initial){const at=cursor++;return slots[at]??=( {current:initial} );},
  useEffect(fn,deps){const at=cursor++;if(!(at in slots)||deps.some((value,i)=>value!==slots[at][i])){slots[at]=deps;effects.push(fn);}},
 };
 const jsx=(type,props)=>({type,props}),exports={};
 const actions={
  async loadSubjectQuests(){return{ok:true,board:JSON.parse(JSON.stringify(board))};},
  async chooseSubjectQuest(course,topic,review){calls.choose.push({course,topic,review});for(const quest of board.quests){quest.active=quest.topicId===topic;if(quest.active&&review)quest.reviewed=true;}return{ok:true,content:{summary:"Learn this topic.",objectives:[],explanation:["Practise a worked example."],workedExample:null,keyTerms:[],misconceptions:[],retrieval:[],route:"alevel",subject:"Mathematics"}};},
  async startSubjectQuest(course,topic){calls.start.push({course,topic});return{ok:true,session:{id:"attempt-1",courseId:course,topicId:topic,questions:[{key:"q1",prompt:"What is 1 + 1?",options:["2","3"]}]}};},
  async submitSubjectQuest(id,answers){calls.submit.push({id,answers:Array.from(answers)});return submit?submit(id,answers):{ok:true,result:{correct:1,total:1,score:100,passed:true,passes:1,xp:0,clout:0,answers:[{answer:0,explain:"One and one make two."}]}};},
  async questLibraryLesson(){return null;},
 };
 const code=ts.transpileModule(fs.readFileSync("src/components/game/study/subject-quests.tsx","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,URLSearchParams,require(name){
  if(name==="@/game/core/game-moments")return{announceGameMoment(){}};if(name.endsWith("game-feedback.module.css"))return{default:{}};
  if(name==="react")return react;if(name==="react/jsx-runtime")return{jsx,jsxs:jsx};if(name==="next/link")return{default:"a"};
  if(name==="@/app/games/study/quest-actions")return actions;if(name==="@/game/core/subject-quests")return core;
  if(name==="@/components/app/app-shell")return{notifyPlayerChanged(){}};
  if(name==="@/components/learn/lesson-slides")return{LessonSlides:()=>null};throw Error(name);
 }});
 const app={calls,render(){cursor=0;const tree=exports.SubjectQuests({onReward:reward=>{calls.reward.push(reward);onReward?.(reward);}});for(const effect of effects.splice(0))effect();return tree;}};
 return app;
}
function nodes(tree){if(tree===null||tree===undefined||typeof tree==="boolean")return[];if(Array.isArray(tree))return tree.flatMap(nodes);if(typeof tree!=="object")return[tree];return[tree,...nodes(tree.props?.children)];}
function text(tree){return nodes(tree).filter(node=>typeof node==="string"||typeof node==="number").join(" ");}
function button(app,label){return nodes(app.render()).find(node=>node.type==="button"&&text(node).includes(label));}
async function click(app,label){const item=button(app,label);assert.ok(item,`Missing ${label}`);assert.ok(!item.props.disabled,`${label} disabled`);item.props.onClick();await tick();}
async function enterPractice(app){app.render();await tick();await click(app,"Equations");await click(app,"Next slide");await click(app,"I’ve reviewed");await click(app,"Choose this practice quest");const radio=nodes(app.render()).find(node=>node.type==="input"&&node.props.type==="radio");radio.props.onChange();}
test("the learner chooses a quest and its own lesson/practice session is used",async()=>{
 const app=mount();app.render();await tick();assert.ok(text(app.render()).includes("GCSE Mathematics"));
 await enterPractice(app);assert.equal(app.calls.choose[0].topic,"maths-1");assert.equal(app.calls.start[0].topic,"maths-1");
 await click(app,"Submit answers");assert.ok(text(app.render()).includes("Quest practice complete"));assert.deepEqual(app.calls.submit[0].answers,[0]);
});
test("a lost submit response freezes the handed-in answers and retries the same attempt",async()=>{
 let attempts=0;const app=mount({submit:async()=>++attempts===1?{ok:false,error:"Connection lost"}:{ok:true,result:{correct:1,total:1,score:100,passed:true,passes:1,xp:0,clout:0,answers:[{answer:0,explain:"Two."}]}}});
 await enterPractice(app);await click(app,"Submit answers");
 assert.ok(nodes(app.render()).filter(node=>node.type==="input").every(node=>node.props.disabled));
 await click(app,"Submit answers");assert.equal(app.calls.submit.length,2);assert.equal(app.calls.submit[0].id,app.calls.submit[1].id);assert.deepEqual(app.calls.submit[0].answers,app.calls.submit[1].answers);
});
test("two finish taps create only one in-flight submission",async()=>{
 let resolve;const wait=new Promise(done=>{resolve=done;});const app=mount({submit:()=>wait});await enterPractice(app);
 const submit=button(app,"Submit answers");submit.props.onClick();submit.props.onClick();assert.equal(app.calls.submit.length,1);
 resolve({ok:false,error:"Try again"});await tick();
});
