import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function mount(component,props={}) {
 const slots=[],effects=[],cleanup=[],listeners=new Map(),timers=new Map(),stored=new Map();let cursor=0,nextTimer=0;
 const react={
  useState(initial){const at=cursor++;if(!(at in slots))slots[at]=typeof initial==="function"?initial():initial;return[slots[at],value=>slots[at]=typeof value==="function"?value(slots[at]):value];},
  useRef(initial){const at=cursor++;return slots[at]??={current:initial};},
  useEffect(fn,deps){const at=cursor++;if(!(at in slots)||deps.some((value,i)=>value!==slots[at][i])){slots[at]=deps;effects.push(fn);}},
 };
 const jsx=(type,props)=>({type,props}),exports={};
 const timeout=(fn,ms)=>{const id=++nextTimer;timers.set(id,{fn,ms});return id;},clear=id=>timers.delete(id);
 const window={setTimeout:timeout,clearTimeout:clear,setInterval:timeout,clearInterval:clear,addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name)=>listeners.delete(name)};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/components/game/world/game-feedback.tsx","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,window,document:{activeElement:null},setTimeout:timeout,clearTimeout:clear,localStorage:{getItem:key=>stored.get(key)??null,setItem:(key,value)=>stored.set(key,value)},require(name){if(name==="react")return react;if(name==="react/jsx-runtime")return{jsx,jsxs:jsx};if(name==="lucide-react")return{};if(name==="../avatar")return{AvatarFigure:()=>null};if(name==="./hud")return{HudSlot:()=>null};if(name.endsWith(".css"))return{default:{}};if(name==="@/game/core/game-moments")return{GAME_MOMENT_EVENT:"moment"};throw Error(name);}});
 return {exports,timers,listeners,stored,emit(value){listeners.get("moment")({detail:value});},render(){cursor=0;const tree=exports[component](props);for(const effect of effects.splice(0)){const stop=effect();if(stop)cleanup.push(stop);}return tree;},unmount(){for(const fn of cleanup)fn();}};
}
function nodes(tree){if(tree==null||typeof tree==="boolean")return[];if(Array.isArray(tree))return tree.flatMap(nodes);if(typeof tree!=="object")return[tree];return[tree,...nodes(tree.props?.children)];}

test("quest events show a skippable scene, pause the world, and keep notification history",()=>{
 const pauses=[],app=mount("GameFeedback",{playerId:"one",avatar:{},onSceneChange:value=>pauses.push(value)});app.render();
 app.emit({kind:"quest",title:"Algebra mission",message:"Learn then practise",scene:true});
 let tree=app.render();const scene=nodes(tree).find(node=>node.type===app.exports.GameCutscene);
 assert.equal(scene.props.moment.title,"Algebra mission");assert.equal(pauses.at(-1),true);
 scene.props.onClose();tree=app.render();assert.equal(pauses.at(-1),false);
 assert.ok(nodes(tree).some(node=>node.props?.role==="status"));
 nodes(tree).find(node=>node.props?.["aria-label"]?.startsWith("Game notifications")).props.onClick();
 tree=app.render();assert.ok(nodes(tree).some(node=>node.type==="article"));
 app.unmount();assert.equal(app.listeners.size,0);assert.equal(app.timers.size,0);
});
test("notification history is bounded and disabling cutscenes keeps the updates available",()=>{
 const app=mount("GameFeedback",{playerId:"one",avatar:{},onSceneChange(){}});app.render();
 for(let i=0;i<25;i++)app.emit({kind:"revision",title:`Result ${i}`,message:"Progress saved"});
 nodes(app.render()).find(node=>node.props?.["aria-label"]?.startsWith("Game notifications")).props.onClick();
 let tree=app.render();assert.equal(nodes(tree).filter(node=>node.type==="article").length,20);
 nodes(tree).find(node=>node.type==="input").props.onChange({target:{checked:false}});
 assert.equal(app.stored.get("illumed-cutscenes"),"off");
 app.emit({kind:"reward",title:"Reward",message:"40 XP",scene:true});tree=app.render();
 assert.equal(nodes(tree).filter(node=>node.type===app.exports.GameCutscene).length,0);
 app.unmount();
});
test("cutscenes finish automatically or on Escape and release all timers/listeners",()=>{
 let closes=0;const app=mount("GameCutscene",{moment:{kind:"quest",title:"Mission",message:"Begin"},onClose:()=>closes++});
 const tree=app.render();assert.ok(nodes(tree).some(node=>node.props?.role==="dialog"));
 let prevented=false,stopped=false;app.listeners.get("keydown")({key:"Escape",preventDefault(){prevented=true;},stopImmediatePropagation(){stopped=true;}});
 assert.equal(closes,1);assert.ok(prevented&&stopped);
 [...app.timers.values()].find(timer=>timer.ms===5400).fn();assert.equal(closes,2);
 app.unmount();assert.equal(app.timers.size,0);assert.equal(app.listeners.size,0);
});
