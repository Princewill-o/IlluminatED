import assert from "node:assert/strict";
import test from "node:test";
import { worldHarness, flush, playerId } from "./helpers/world-harness.mjs";
import { projectData } from "../scripts/lib/project-data.mjs";
const {roomChatText}=projectData("src/game/core/room-chat.ts");
test("chat rejects invalid or oversized payloads and normalises whitespace",()=>{
  for(const value of [null,{},"", "   ","a".repeat(181)]) assert.equal(roomChatText(value),null);
  assert.equal(roomChatText(" Hi\n there\u0000! "),"Hi there !");
});
test("two room clients exchange chat through the private transport and rate limit repeats",async()=>{
  const a=worldHarness({local:0,signed:true}),b=worldHarness({local:1,signed:true});
  await flush();a.sync();b.sync();await flush();await a.advance(100);await b.advance(100);
  assert.equal(await a.world.sendChat("Hello city"),null);
  const packet=a.sent.find(p=>p.event==="chat");
  assert.equal(packet.payload.text,"Hello city");
  b.channels.at(-1).emit("broadcast","chat",{payload:packet.payload});
  assert.equal(b.world.players.current.get(playerId(0)).chat.text,"Hello city");
  assert.match(await a.world.sendChat("Again"),/Wait/);
  b.channels.at(-1).emit("broadcast","chat",{payload:{...packet.payload,text:"spam"}});
  assert.equal(b.world.players.current.get(playerId(0)).chat.text,"Hello city");
  a.dispose();b.dispose();
});
test("disconnected sends fail and unknown players cannot create chat bubbles",async()=>{
  const h=worldHarness();await flush();h.sync();await flush();
  h.channels.at(-1).emit("broadcast","chat",{payload:{i:"unknown",id:"x",text:"Fake"}});
  assert.equal(h.world.players.current.has("unknown"),false);
  h.channels.at(-1).state="closed";
  assert.match(await h.world.sendChat("Hello"),/disconnected/);
  h.dispose();
});
