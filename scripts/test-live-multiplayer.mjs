import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { projectData } from './lib/project-data.mjs';

const url = 'https://wfcihsbgkbjfvphzuuyi.supabase.co';
const key = 'sb_publishable_MOwypIaox9OuKENpjbBwyA_oTV659oN';
const passwords = [process.env.CITY_TEST_PASSWORD_1, process.env.CITY_TEST_PASSWORD_2];
if (passwords.some(p => !p)) throw new Error('Set CITY_TEST_PASSWORD_1 and CITY_TEST_PASSWORD_2');
const clients = passwords.map(() => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }));
const ids = [randomUUID(), randomUUID()];
const channels = [];
const pause = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(check, label) { for (let i = 0; i < 100; i++) { if (check()) return; await pause(100); } throw new Error(`Timed out: ${label}`); }
async function join(client, topic, id) {
  const ch = client.channel(topic, { config: { private: true, presence: { key: id }, broadcast: { self: false, ack: true } } });
  channels.push([client, ch]);
  await new Promise((resolve, reject) => { const t = setTimeout(() => reject(new Error(`Join timeout ${topic}`)), 12000); ch.subscribe(s => { if (s === 'SUBSCRIBED') { clearTimeout(t); resolve(); } else if (['CHANNEL_ERROR','TIMED_OUT'].includes(s)) { clearTimeout(t); reject(new Error(`${s}: ${topic}`)); } }); });
  assert.equal(await ch.track({ u: id, t: Date.now() }), 'ok');
  return ch;
}
try {
  const users = [];
  for (let i = 0; i < 2; i++) {
    const { data, error } = await clients[i].auth.signInWithPassword({ email: `illuminated.test${i + 1}@example.com`, password: passwords[i] });
    if (error) throw error;
    users.push(data.user.id); await clients[i].realtime.setAuth(data.session.access_token);
  }
  console.log('PASS: two independent authenticated accounts');
  const leases = [];
  for (let i = 0; i < 2; i++) {
    const { data, error } = await clients[i].rpc('world_claim', { p_map: 'city', p_server: 'lse-1', p_client: ids[i], p_previous: null });
    if (error) throw error; assert.equal(data.accepted, true, JSON.stringify(data)); leases.push(data);
  }
  const world = [];
  for (let i = 0; i < 2; i++) world.push(await join(clients[i], leases[i].topic, users[i]));
  await waitFor(() => world.every(c => Object.keys(c.presenceState()).length === 2), 'two-way world presence');
  console.log('PASS: both players see each other in the same regional city');
  for (let i = 0; i < 2; i++) {
    let got; world[1-i].on('broadcast', { event: 'm' }, ({payload}) => { got = payload; });
    await world[i].send({ type: 'broadcast', event: 'm', payload: { x: 100+i, y: 200, d: 1 } });
    await waitFor(() => got?.x === 100+i, 'movement');
  }
  console.log('PASS: bidirectional movement broadcasts');
  const code = randomUUID().slice(0, 5).toUpperCase();
  const rooms = [];
  for (let i = 0; i < 2; i++) rooms.push(await join(clients[i], `world:hub:${code}`, users[i]));
  await waitFor(() => rooms.every(c => Object.keys(c.presenceState()).length === 2), 'mini-game lobby');
  const S = projectData('src/game/core/hub/simple.ts');
  const received = [[], []];
  rooms.forEach((room, i) => room.on('broadcast', { event: 's' }, ({ payload }) => received[i].push(payload)));
  async function exchange(state, turn = 0) {
    const inbox = received[1-turn], before = inbox.length;
    assert.equal(await rooms[turn].send({type:'broadcast',event:'s',payload:state}), 'ok');
    await waitFor(() => inbox.length > before, 'mini-game state'); assert.deepEqual(inbox.at(-1), JSON.parse(JSON.stringify(state)));
  }
  let t = S.tttNew(); for (const [i, move] of [0,3,1,4,2].entries()) { t=S.tttMove(t,move); await exchange(t,i%2); } assert.equal(t.winner,0);
  console.log('PASS: Noughts & Crosses complete two-player win synchronizes');
  let c = S.c4New(); for (const [i, move] of [0,1,0,1,0,1,0].entries()) { c=S.c4Move(c,move); await exchange(c,i%2); } assert.equal(c.winner,0);
  console.log('PASS: Connect Four complete two-player win synchronizes');
  let d = S.draughtsNew(); for(let i=0;i<6;i++){ const move=S.draughtsMoves(d)[0]; d=S.draughtsMove(d,move); await exchange(d,i%2); }
  console.log('PASS: Draughts alternating legal moves synchronize');
  const T=projectData('src/game/core/hub/tycoon.ts'); let tycoon=T.tycoonNew(users.map((id,i)=>({id,name:`Tester ${i+1}`,cpu:false}))); await exchange(tycoon); tycoon=T.tycoonRoll(tycoon,1,2); await exchange(tycoon);
  console.log('PASS: Tycoon initial state and dice turn synchronize');
  const quiz=[]; for(let i=0;i<2;i++) quiz.push(await join(clients[i],'world:games:lse-1',users[i]));
  let question,score,ended=false; quiz[1].on('broadcast',{event:'q'},({payload})=>{question=payload;}); quiz[0].on('broadcast',{event:'s'},({payload})=>{score=payload;}); quiz[1].on('broadcast',{event:'end'},()=>{ended=true;});
  for(let n=1;n<=8;n++) {
    await quiz[0].send({type:'broadcast',event:'q',payload:{n,idx:n-1,endsAt:Date.now()+12000}}); await waitFor(()=>question?.n===n,'quiz question');
    await quiz[1].send({type:'broadcast',event:'s',payload:{i:users[1],u:'Tester 2',s:180*n}}); await waitFor(()=>score?.s===180*n,'quiz score');
  }
  await quiz[0].send({type:'broadcast',event:'end',payload:{}}); await waitFor(()=>ended,'quiz ending');
  console.log('PASS: Quiz Battle all 8 question/score messages and ending synchronize');
} finally {
  await Promise.all(clients.map(client => client.removeAllChannels()));
  for(let i=0;i<2;i++) { await clients[i].rpc('world_release',{p_client:ids[i]}); await clients[i].auth.signOut({scope:'local'}); clients[i].realtime.disconnect(); }
}
