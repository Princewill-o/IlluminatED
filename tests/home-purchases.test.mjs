import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { projectData } from "../scripts/lib/project-data.mjs";

const require=createRequire(import.meta.url);
const homes=projectData("src/game/core/homes.ts");
function load(file,imports) {
  const exports={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:name=>imports[name]??require(name)});
  return exports;
}
function action({user="member",error=null,balance=7500,failBalance=false}={}) {
  const calls=[],paths=[];
  const sb={auth:{getUser:async()=>({data:{user:user?{id:user}:null}})},rpc:async(fn,args)=>{calls.push([fn,args]);return {error:error?{message:error}:null};},
    from:table=>{assert.equal(table,"player_stats");return {select:columns=>{assert.equal(columns,"clout");return {eq:(column,id)=>{assert.equal(column,"user_id");assert.equal(id,user);return {maybeSingle:async()=>{if(failBalance)throw Error("offline");return {data:{clout:balance}};}};}};}};}};
  const {buyHome}=load("src/app/games/careers/actions.ts",{
    "next/cache":{revalidatePath:path=>paths.push(path)},
    "@/game/core/homes":homes,"@/game/core/careers":{},"@/game/core/rng":{},
    "@/lib/game/career-receipt":{},"@/lib/stripe":{},"@/lib/social/server":{getSupabase:async()=>sb},
  });
  return {buyHome,calls,paths};
}

test("house purchases validate the catalogue and authentication before calling the database",async()=>{
  const invalid=action();assert.equal((await invalid.buyHome("made-up-house")).ok,false);assert.equal(invalid.calls.length,0);
  const anonymous=action({user:null});assert.equal((await anonymous.buyHome("terrace")).ok,false);assert.equal(anonymous.calls.length,0);
});
test("a successful purchase returns the saved house and authoritative balance, and refreshes home/world/wealth",async()=>{
  const a=action({balance:1234});const result=await a.buyHome("terrace");
  assert.equal(result.ok,true);assert.equal(result.data.home,"terrace");assert.equal(result.data.clout,1234);
  assert.equal(a.calls[0][0],"home_buy");assert.equal(a.calls[0][1].p_home,"terrace");
  assert.deepEqual(a.paths,["/games/home","/games/world","/games/wealth"]);
});
test("insufficient funds are reported without a success receipt or cache update",async()=>{
  const a=action({error:"not_enough_clout"});const result=await a.buyHome("penthouse");
  assert.equal(result.ok,false);assert.match(result.error,/Not enough Clout/);assert.equal(a.paths.length,0);
});
test("a balance read failure cannot turn a committed house purchase into a failure",async()=>{
  const a=action({failBalance:true});const result=await a.buyHome("studio");
  assert.equal(result.ok,true);assert.equal(result.data.home,"studio");assert.equal(result.data.clout,null);assert.equal(a.calls.length,1);
});
test("the housing catalogue distinguishes a free unclaimed studio, owned homes and unaffordable upgrades",()=>{
  const {HomeMarket}=load("src/components/game/world/home-market.tsx",{"@/game/core/homes":homes,"@/app/games/careers/actions":{buyHome:async()=>({ok:false,error:"not used"})}});
  const base={owned:["studio"],current:"studio",clout:1800,onClose:()=>{},onPurchased:()=>{},onEnterHome:()=>{}};
  const fresh=renderToStaticMarkup(React.createElement(HomeMarket,{...base,claimed:false}));
  assert.match(fresh,/Claim free home/);assert.ok(!fresh.includes("You live here"));assert.match(fresh,/Earn 700 more Clout/);
  const owner=renderToStaticMarkup(React.createElement(HomeMarket,{...base,claimed:true,owned:["studio","terrace"]}));
  assert.match(owner,/You live here/);assert.match(owner,/Move here · owned/);assert.ok(!owner.includes("Earn 700 more Clout"));
  assert.equal((owner.match(/<li /g)||[]).length,homes.HOMES.length);
});
