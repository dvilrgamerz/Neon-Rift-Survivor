import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {createRiftServer} from '../server/index.mjs';
import {defaultSave} from '../src/storage.js';
import {createRun} from '../src/engine.js';
import {BALANCE_VERSION} from '../src/content.js';

const SECRET='correct horse galaxy 42';
async function fixture(t,options={}) {
  const directory=await mkdtemp(path.join(tmpdir(),'rift-nexus-test-'));
  const app=await createRiftServer({dataDir:directory,port:0,...options});await app.start();
  t.after(async()=>{await app.close();const resolved=path.resolve(directory),base=path.resolve(tmpdir())+path.sep;if(!resolved.startsWith(base))throw new Error('Refusing unexpected test cleanup path.');await rm(resolved,{recursive:true,force:true});});
  async function request(route,{method='GET',body,user,origin=app.url,headers={}}={}) {
    const response=await fetch(app.url+'/api/v1'+route,{method,headers:{...(origin?{Origin:origin}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{}),...(user?{Cookie:user.cookie}:{}),...headers},body:body===undefined?undefined:typeof body==='string'?body:JSON.stringify(body)});
    let data;try{data=await response.json();}catch{data=null;}
    return {status:response.status,data,headers:response.headers};
  }
  async function signup(name,extra={}) {const response=await request('/auth/signup',{method:'POST',body:{username:name,password:SECRET,...extra}});assert.equal(response.status,201,JSON.stringify(response.data));return {...response.data.user,cookie:response.headers.get('set-cookie').split(';')[0],setCookie:response.headers.get('set-cookie')};}
  return {app,request,signup,directory};
}
function complete(ticket,extra={}) {return {mode:ticket.config.mode,difficulty:ticket.config.difficulty,operator:ticket.config.operator,biome:ticket.config.biome,balanceVersion:BALANCE_VERSION,outcome:'defeat',score:1200,duration:60,kills:80,elites:1,bosses:0,weapons:{pulse:2},passives:{},relics:[],...extra};}
async function openEvents(app,user,code) {
  const controller=new AbortController();const response=await fetch(`${app.url}/api/v1/rooms/${code}/events`,{headers:{Cookie:user.cookie,Origin:app.url},signal:controller.signal});assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/event-stream/);
  const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
  return {close(){controller.abort();},async next(){
    const deadline=Date.now()+4000;
    while(Date.now()<deadline){let split;while((split=buffer.indexOf('\n\n'))>=0){const packet=buffer.slice(0,split);buffer=buffer.slice(split+2);if(packet.includes('event: state'))return JSON.parse(packet.split('\n').find(line=>line.startsWith('data: ')).slice(6));}
      const result=await Promise.race([reader.read(),delay(4000).then(()=>{throw new Error('SSE state timeout');})]);if(result.done)throw new Error('SSE stream ended.');buffer+=decoder.decode(result.value,{stream:true});
    }throw new Error('SSE state timeout');
  }};
}

test('server auth uses salted password hashes, scoped cookies, privacy defaults and no public admin assignment',async t=>{
  const {request,signup,app}=await fixture(t);const alice=await signup('Alice',{role:'admin'});
  assert.equal(alice.role,'player');assert.match(alice.setCookie,/HttpOnly/);assert.match(alice.setCookie,/SameSite=Strict/);assert.equal(alice.profile.analyticsOptIn,false);assert.equal(alice.profile.privacy.publicProfile,false);
  assert.equal((await request('/auth/me',{user:alice})).data.user.username,'Alice');assert.equal((await request('/auth/me')).data.user,null);
  const stored=app.store.state.users[alice.id];assert.equal(stored.password.algorithm,'scrypt-v1');assert.equal(stored.password.salt.length,32);assert.ok(!JSON.stringify(stored).includes(SECRET));
  assert.equal((await request('/auth/signup',{method:'POST',body:{username:'alice',password:SECRET}})).status,409);
  assert.equal((await request('/auth/login',{method:'POST',body:{username:'Alice',password:'incorrect password'}})).status,401);
  const logged=await request('/auth/login',{method:'POST',body:{username:'ALICE',password:SECRET}});assert.equal(logged.status,200);assert.ok(!JSON.stringify(logged.data).includes('salt'));
  assert.equal((await request('/auth/logout',{method:'POST',body:{},user:alice})).status,200);assert.equal((await request('/cloud-save',{user:alice})).status,401);
});

test('mutation Origin checks, HTTP body limits, rate limits, and private file denial',async t=>{
  const {request,signup,app}=await fixture(t);const alice=await signup('Alice');
  assert.equal((await request('/profile',{method:'PATCH',body:{bio:'changed'},user:alice,origin:null})).status,403);
  assert.equal((await request('/profile',{method:'PATCH',body:{bio:'changed'},user:alice,origin:'https://attacker.invalid'})).status,403);
  assert.equal((await request('/profile',{method:'PATCH',body:'{bad json',user:alice})).status,400);
  assert.equal((await request('/profile',{method:'PATCH',body:{bio:'x'.repeat(5000)},user:alice})).status,413);
  assert.equal((await request('/profile',{method:'PATCH',body:'bio=changed',headers:{'Content-Type':'application/x-www-form-urlencoded'},user:alice})).status,415);
  for(const file of ['/server/index.mjs','/server/security.mjs','/.git/config','/package.json','/nexus.json','/src/../server/index.mjs'])assert.equal((await fetch(app.url+file)).status,404);
  assert.equal((await fetch(app.url+'/')).status,200);assert.equal((await fetch(app.url+'/docs/SELF_HOSTING.md')).status,200);
  let response;for(let i=0;i<13;i++)response=await request('/auth/login',{method:'POST',body:{username:'Nobody',password:'incorrect password'}});
  assert.equal(response.status,429);assert.ok(Number(response.headers.get('retry-after'))>0);
});

test('cloud save revisions are atomic, private, validated and persistent',async t=>{
  const {request,signup,app,directory}=await fixture(t);const alice=await signup('Alice'),bob=await signup('Bob');
  assert.deepEqual((await request('/cloud-save',{user:alice})).data,{save:null,revision:0});const save=defaultSave();save.cores=48;
  const outcomes=await Promise.all([request('/cloud-save',{method:'PUT',body:{revision:0,save},user:alice}),request('/cloud-save',{method:'PUT',body:{revision:0,save:{...save,cores:49}},user:alice})]);
  assert.deepEqual(outcomes.map(item=>item.status).sort(),[200,409]);assert.equal((await request('/cloud-save',{user:alice})).data.revision,1);assert.equal((await request('/cloud-save',{user:bob})).data.save,null);
  assert.equal((await request('/cloud-save',{method:'PUT',body:{revision:1,save:{...save,cores:-1}},user:alice})).status,400);
  assert.equal((await request('/cloud-save',{user:alice})).data.revision,1);
  await app.store.flush();const disk=JSON.parse(await readFile(path.join(directory,'nexus.json'),'utf8'));assert.equal(disk.cloudSaves[alice.id].revision,1);assert.ok(!JSON.stringify(disk).includes(SECRET));
  await app.close();const restarted=await createRiftServer({dataDir:directory,port:0});await restarted.start();t.after(()=>restarted.close());
  const login=await fetch(restarted.url+'/api/v1/auth/login',{method:'POST',headers:{Origin:restarted.url,'Content-Type':'application/json'},body:JSON.stringify({username:'Alice',password:SECRET})});assert.equal(login.status,200);await login.json();const cookie=login.headers.get('set-cookie').split(';')[0];
  const restored=await fetch(restarted.url+'/api/v1/cloud-save',{headers:{Cookie:cookie}});assert.equal((await restored.json()).revision,1);
});

test('friends require the recipient’s response and respect profile/notification preferences',async t=>{
  const {request,signup}=await fixture(t);const alice=await signup('Alice'),bob=await signup('Bob'),eve=await signup('Eve');
  assert.equal((await request('/profiles/Bob',{user:alice})).status,403);
  const sent=await request('/friends/requests',{method:'POST',body:{username:'Bob'},user:alice});assert.equal(sent.status,201);const id=sent.data.request.id;
  assert.equal((await request(`/friends/requests/${id}/respond`,{method:'POST',body:{accept:true},user:eve})).status,404);
  assert.equal((await request(`/friends/requests/${id}/respond`,{method:'POST',body:{accept:true},user:bob})).status,200);
  assert.equal((await request('/friends',{user:alice})).data.friends[0].username,'Bob');assert.equal((await request('/profiles/Bob',{user:alice})).status,200);
  assert.ok((await request('/notices',{user:bob})).data.notices.some(notice=>/friend request/.test(notice.message)));
  await request('/notices/read',{method:'POST',body:{},user:bob});assert.ok((await request('/notices',{user:bob})).data.notices.every(notice=>notice.read));
  await request('/friends/'+bob.id,{method:'DELETE',user:alice});assert.equal((await request('/friends',{user:alice})).data.friends.length,0);
  await request('/profile',{method:'PATCH',body:{privacy:{allowFriendRequests:false},notifications:{friends:false},analyticsOptIn:false},user:bob});
  assert.equal((await request('/friends/requests',{method:'POST',body:{username:'Bob'},user:eve})).status,404);
});

test('one-use ranked tickets enforce ownership, elapsed time, version and quarantine with server-only moderation',async t=>{
  let now=Date.UTC(2026,8,17,12);const {request,signup,app}=await fixture(t,{clock:()=>now,adminUsername:'Owner',adminPassword:SECRET});const alice=await signup('Alice'),bob=await signup('Bob');
  const login=await request('/auth/login',{method:'POST',body:{username:'Owner',password:SECRET}});const owner={...login.data.user,cookie:login.headers.get('set-cookie').split(';')[0]};assert.equal(owner.role,'admin');
  const ticket=(await request('/runs/start',{method:'POST',body:{mode:'endless'},user:alice})).data;now+=60000;
  assert.equal((await request(`/runs/${ticket.runId}/finish`,{method:'POST',body:{summary:complete(ticket)},user:bob})).status,404);
  const result=await request(`/runs/${ticket.runId}/finish`,{method:'POST',body:{summary:complete(ticket)},user:alice});assert.equal(result.data.status,'accepted');
  assert.equal((await request(`/runs/${ticket.runId}/finish`,{method:'POST',body:{summary:complete(ticket,{score:999999})},user:alice})).data.duplicate,true);
  assert.equal((await request('/leaderboard?period=all')).data.entries[0].score,1200);
  const suspect=(await request('/runs/start',{method:'POST',body:{mode:'endless'},user:alice})).data;
  const quarantine=await request(`/runs/${suspect.runId}/finish`,{method:'POST',body:{summary:complete(suspect,{score:1e11,duration:300})},user:alice});assert.equal(quarantine.data.status,'quarantined');assert.ok(quarantine.data.reasons.length>=2);
  assert.equal((await request('/admin/reports',{user:alice})).status,403);
  const queue=await request('/admin/reports',{user:owner});assert.equal(queue.data.runs[0].id,suspect.runId);
  assert.equal((await request('/admin/runs/'+suspect.runId,{method:'PATCH',body:{decision:'reject',reason:'Impossible timing'},user:owner})).status,200);
  assert.equal(app.store.state.runs[suspect.runId].status,'rejected');assert.equal((await request('/leaderboard?period=all')).data.entries.length,1);
  await request('/reports',{method:'POST',body:{username:'Bob',reason:'Review this player name'},user:alice});assert.equal((await request('/admin/reports',{user:owner})).data.reports[0].targetUserId,bob.id);
  await request('/admin/users/'+bob.id,{method:'PATCH',body:{banned:true},user:owner});assert.equal((await request('/cloud-save',{user:bob})).status,401);
});

test('Daily ticket date, seeded operator and fixed difficulty match the shared engine; seasons last eight weeks',async t=>{
  let now=Date.UTC(2026,8,17,12);const {request,signup}=await fixture(t,{clock:()=>now});const alice=await signup('Alice');
  const ticket=(await request('/runs/start',{method:'POST',body:{mode:'daily',operator:'nova',difficulty:'nightmare'},user:alice})).data;
  const run=createRun({mode:'daily',date:ticket.dailyDate,seed:ticket.seed},defaultSave());assert.equal(ticket.config.operator,run.config.operator);assert.equal(ticket.seed,run.config.seed);assert.equal(ticket.config.difficulty,run.config.difficulty);
  now+=60000;assert.equal((await request(`/runs/${ticket.runId}/finish`,{method:'POST',body:{summary:complete(ticket)},user:alice})).data.status,'accepted');
  const season=(await request('/season')).data;assert.equal((Date.parse(season.season.endsAt)-Date.parse(season.season.startsAt))/86400000,56);assert.equal(season.weeklyChallenges.length,3);
  now+=56*86400000;assert.equal((await request('/leaderboard?period=season')).data.entries.length,0);assert.equal((await request('/leaderboard?period=all')).data.entries.length,0);assert.equal((await request('/leaderboard?period=all&date='+ticket.dailyDate)).data.entries.length,1);
});

test('private co-op uses two authenticated actors, separate views, authoritative inputs, spectators and reconnect',async t=>{
  const {request,signup,app}=await fixture(t);const alice=await signup('Alice'),bob=await signup('Bob'),eve=await signup('Eve');const profile=defaultSave();profile.nexus.xp=2200;
  const created=await request('/rooms',{method:'POST',body:{config:{mode:'endless',operator:'nova',classId:'assault',subclass:'striker'},profile},user:alice});assert.equal(created.status,201,JSON.stringify(created.data));const code=created.data.room.code;
  assert.equal((await request('/rooms/'+code,{user:eve})).status,403);
  assert.equal((await request('/rooms/join',{method:'POST',body:{code,operator:'titan',classId:'vanguard',subclass:'bastion',profile},user:bob})).status,200);
  assert.equal((await request('/rooms/join',{method:'POST',body:{code},user:eve})).status,409);
  assert.equal((await request('/rooms/join',{method:'POST',body:{code,spectator:true},user:eve})).status,200);
  assert.equal((await request(`/rooms/${code}/start`,{method:'POST',body:{},user:alice})).status,409);
  await request(`/rooms/${code}/ready`,{method:'POST',body:{ready:true},user:alice});await request(`/rooms/${code}/ready`,{method:'POST',body:{ready:true},user:bob});
  assert.equal((await request(`/rooms/${code}/start`,{method:'POST',body:{},user:bob})).status,403);
  const started=await request(`/rooms/${code}/start`,{method:'POST',body:{},user:alice});assert.equal(started.status,200,JSON.stringify(started.data));assert.equal(started.data.view.coop.players.length,2);assert.equal(started.data.view.config.subclass,'striker');
  const first=await openEvents(app,alice,code),second=await openEvents(app,bob,code);t.after(()=>{first.close();second.close();});
  const firstView=await first.next(),secondView=await second.next();assert.equal(firstView.view.coop.playerId,'p1');assert.equal(secondView.view.coop.playerId,'p2');assert.equal(secondView.view.config.operator,'titan');assert.equal(secondView.view.config.subclass,'bastion');assert.ok(!JSON.stringify(secondView).includes('password'));
  assert.equal((await request(`/rooms/${code}/input`,{method:'POST',body:{input:{x:1,y:0}},user:eve})).status,403);
  assert.equal((await request(`/rooms/${code}/input`,{method:'POST',body:{input:{x:50}},user:alice})).status,400);
  const startX=started.data.view.player.x;await request(`/rooms/${code}/input`,{method:'POST',body:{sequence:100,input:{x:1,y:0,aimX:1,aimY:0}},user:alice});await delay(120);
  const moved=await request('/rooms/'+code,{user:alice});assert.ok(moved.data.view.player.x>startX);assert.ok(moved.data.view.coop.serverTick>0);
  assert.equal((await request(`/rooms/${code}/input`,{method:'POST',body:{sequence:99,input:{x:0}},user:alice})).data.stale,true);
  first.close();await delay(70);const remaining=await request('/rooms/'+code,{user:bob});assert.equal(remaining.data.room.you.host,true);
  const reconnected=await request(`/rooms/${code}/reconnect`,{method:'POST',body:{},user:alice});assert.equal(reconnected.status,200);assert.equal(reconnected.data.room.players.find(player=>player.userId===alice.id).connected,true);
  assert.equal((await request(`/rooms/${code}/input`,{method:'POST',body:{sequence:1,input:{x:0}},user:alice})).data.stale,undefined);
  assert.equal((await request(`/rooms/${code}/action`,{method:'POST',body:{action:{type:'pause',paused:true}},user:alice})).status,200);
  assert.equal((await request(`/rooms/${code}/action`,{method:'POST',body:{action:{type:'pause',paused:true}},user:alice})).data.view.state,'paused');
  assert.equal((await request(`/rooms/${code}/action`,{method:'POST',body:{action:{type:'pause'}},user:alice})).status,403);
  assert.equal((await request(`/rooms/${code}/action`,{method:'POST',body:{action:{type:'pause'}},user:bob})).status,200);
  await request(`/rooms/${code}/leave`,{method:'POST',body:{},user:alice});assert.equal((await request('/rooms',{method:'POST',body:{config:{mode:'endless'}},user:alice})).status,201);
});

test('failed ready requests cannot mutate lobby state and class/subclass combinations are validated',async t=>{
  const {request,signup}=await fixture(t);const alice=await signup('Alice');
  assert.equal((await request('/rooms',{method:'POST',body:{config:{classId:'assault',subclass:'bastion'}},user:alice})).status,400);
  const room=(await request('/rooms',{method:'POST',body:{config:{}},user:alice})).data.room;
  assert.equal((await request(`/rooms/${room.code}/ready`,{method:'POST',body:{ready:true,operator:'cryo'},user:alice})).status,400);
  assert.equal((await request('/rooms/'+room.code,{user:alice})).data.room.players[0].ready,false);
});

test('server configuration refuses nonlocal exposure without an explicit origin and never stores under static files',async()=>{
  await assert.rejects(()=>createRiftServer({host:'0.0.0.0',dataDir:path.join(tmpdir(),'unused-nexus-test')}),/RIFT_ORIGIN/);
  await assert.rejects(()=>createRiftServer({dataDir:path.resolve('server-data')}),/outside/);
});
