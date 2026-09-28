import test from 'node:test';
import assert from 'node:assert/strict';
import { createCoopRun, stepCoopRun, coopAction, getCoopView } from '../src/coop.js';
import { applyDamage, stepRun, withCoopPlayer } from '../src/engine.js';

const make=(configs=[{},{}])=>{const session=createCoopRun(configs.map(c=>({mode:'endless',seed:'co-op-test',date:'2026-09-16',...c})));const run=session.run;run.spawnTimer=run.hazardTimer=run.bossTimer=run.worldEventTimer=1e8;return session;};
const frames=(session,count,inputs={})=>{for(let i=0;i<count;i++)stepCoopRun(session,inputs);};

test('two players advance one world clock and move independently',()=>{
  const session=make();frames(session,60,{p1:{x:1},p2:{x:-1}});
  assert.ok(Math.abs(session.run.time-1)<1e-9);assert.equal(session.run.tick,60);assert.equal(session.tick,60);assert.ok(session.players[0].player.x>550);assert.ok(session.players[1].player.x<650);
});
test('one authoritative step advances world entities once regardless of player count',()=>{
  const session=make();session.run.enemies=[{id:9,x:100,y:100,r:12,hp:100,maxHp:100,type:'chaser',speed:60,damage:0,cooldown:10,stun:0,slow:0}];
  stepCoopRun(session,{},9);const e=session.run.enemies[0];assert.ok(Math.abs(Math.hypot(e.x-100,e.y-100)-1)<1e-8);assert.equal(session.run.tick,1);
});
test('each participant fires its own operator weapons with stable ownership',()=>{
  const session=make([{operator:'nova',manualAim:true},{operator:'cryo',manualAim:true}]);
  stepCoopRun(session,{p1:{aimX:1},p2:{aimX:-1}});
  assert.ok(session.run.bullets.some(b=>b.ownerId==='p1'&&b.weapon==='pulse'));
  assert.ok(session.run.bullets.some(b=>b.ownerId==='p2'&&b.weapon==='cryo-shards'));
  const local=getCoopView(session,'p2');assert.equal(local.config.operator,'cryo');assert.ok(local.weapons['cryo-shards']);assert.equal(local.coop.playerId,'p2');assert.equal(local.coop.players.length,2);assert.equal(local.coopPlayers,undefined);
});
test('damage targets the requested player and downs instead of ending the team immediately',()=>{
  const session=make();session.players[1].player.invulnerable=0;session.players[1].player.hp=4;
  applyDamage(session.run,{amount:99,playerId:'p2',unavoidable:true});
  assert.equal(session.players[1].player.downed,true);assert.equal(session.players[0].player.downed,false);assert.equal(session.run.state,'playing');
  session.players[0].player.invulnerable=0;applyDamage(session.run,{amount:999,playerId:'p1',unavoidable:true});assert.equal(session.run.state,'gameover');assert.equal(session.run.outcome,'defeat');
});
test('standing beside downed partner revives after three seconds and movement interrupts',()=>{
  const session=make();const [rescuer,downed]=session.players;downed.player.downed=true;downed.player.hp=0;downed.player.x=rescuer.player.x+30;downed.player.y=rescuer.player.y;
  frames(session,90);assert.ok(downed.player.reviveProgress>1.4);assert.equal(downed.player.downed,true);
  frames(session,30,{p1:{x:-1}});assert.ok(downed.player.reviveProgress<1.2);
  rescuer.player.x=downed.player.x-30;for(let i=0;i<181&&downed.player.downed;i++)stepCoopRun(session);assert.equal(downed.player.downed,false);assert.equal(downed.player.hp,downed.player.maxHp*.35);assert.ok(downed.player.invulnerable>1.9);
});
test('both players can pause on lost focus; only host resumes; rewards cannot be skipped',()=>{
  const session=make();assert.equal(coopAction(session,'p2',{type:'pause',paused:true}),true);assert.equal(session.run.state,'paused');assert.equal(coopAction(session,'p2',{type:'pause',paused:true}),true);assert.equal(session.run.state,'paused');assert.equal(coopAction(session,'p2',{type:'pause'}),false);assert.equal(coopAction(session,'p1',{type:'pause'}),true);
  session.run.xp=session.run.need;stepCoopRun(session);assert.equal(session.run.state,'reward');assert.equal(coopAction(session,'p1',{type:'pause'}),false);assert.equal(session.run.state,'reward');
});
test('both players get personal rewards while the shared simulation remains paused',()=>{
  const session=make();session.run.xp=session.run.need;stepCoopRun(session);const stopped=session.run.time;
  assert.equal(session.run.rewardOwnerId,'p1');assert.equal(getCoopView(session,'p2').coop.waitingForOtherPlayer,true);assert.deepEqual(getCoopView(session,'p2').rewardChoices,[]);
  const first=session.run.rewardChoices[0].id;assert.equal(coopAction(session,'p2',{type:'reward',id:first}),false);assert.equal(coopAction(session,'p1',{type:'reward',id:first}),true);assert.equal(session.run.rewardOwnerId,'p2');
  stepCoopRun(session);assert.equal(session.run.time,stopped);assert.equal(coopAction(session,'p2',{type:'reward',id:session.run.rewardChoices[0].id}),true);assert.equal(session.run.state,'playing');
});
test('disconnect migrates host control; reconnect preserves build and position',()=>{
  const session=make([{mode:'campaign'},{mode:'campaign'}]);const before=session.players[0].player.x;
  assert.equal(coopAction(session,'p1',{type:'disconnect'}),true);assert.equal(session.hostId,'p2');assert.equal(coopAction(session,'p2',{type:'route',index:0}),true);frames(session,10,{p2:{x:1}});assert.ok(session.run.time>0);assert.equal(session.players[0].player.x,before);
  assert.equal(coopAction(session,'p1',{type:'reconnect'}),true);assert.equal(session.players[0].connected,true);assert.ok(session.players[0].player.invulnerable>=2);assert.equal(session.players[0].weapons.pulse,1);
});
test('an offline reward owner cannot permanently block the connected partner',()=>{
  const session=make();session.run.xp=session.run.need;stepCoopRun(session);assert.equal(session.run.rewardOwnerId,'p1');coopAction(session,'p1',{type:'disconnect'});assert.equal(session.run.rewardOwnerId,'p2');assert.equal(coopAction(session,'p2',{type:'reward',id:session.run.rewardChoices[0].id}),true);assert.equal(session.run.state,'playing');
});
test('shield sharing absorbs damage only for a nearby living partner',()=>{
  const session=make([{operator:'nova'},{operator:'titan'}]);const [a,b]=session.players;a.player.invulnerable=0;b.player.shield=100;const hp=a.player.hp;
  applyDamage(session.run,{amount:20,playerId:'p1',unavoidable:true});assert.equal(a.player.hp,hp-15);assert.equal(b.player.shield,95);assert.equal(b.stats.shieldAbsorbed,5);
  a.player.invulnerable=0;b.player.x=1100;applyDamage(session.run,{amount:20,playerId:'p1',unavoidable:true});assert.equal(b.player.shield,95);
});
test('Volt creates a damaging shared chain between nearby players',()=>{
  const session=make([{operator:'volt'},{operator:'nova'}]);for(const p of session.players)p.weaponTimers={pulse:100,arc:100};session.run.weaponTimers=session.players[0].weaponTimers;
  session.run.enemies=[{id:99,x:600,y:380,r:12,hp:500,maxHp:500,type:'tank',speed:0,damage:0,cooldown:10,stun:0,slow:0}];stepCoopRun(session);
  assert.ok(session.run.enemies[0].hp<500);assert.ok(session.players[0].damageByWeapon['coop-chain']>0);assert.ok(session.run.events.some(e=>e.type==='chain-link'));
});
test('server inputs are clamped and views never mutate server world',()=>{
  const session=make();stepCoopRun(session,{p1:{x:999,y:NaN,aimX:Infinity,ability:'true'}});assert.ok(Number.isFinite(session.players[0].player.x));assert.equal(session.players[0].stats.abilities,0);
  const view=getCoopView(session,'p1');view.player.hp=1;assert.notEqual(session.players[0].player.hp,1);assert.throws(()=>getCoopView(session,'intruder'));assert.equal(coopAction(session,'intruder',{type:'abandon'}),false);
});
test('co-op summaries retain personal kills/damage and separate team totals',()=>{
  const session=make();session.run.kills=8;session.players[0].stats.kills=3;session.players[1].stats.kills=5;session.players[1].stats.damageDealt=200;
  const summary=getCoopView(session,'p2').summary;assert.equal(summary.coOp,true);assert.equal(summary.kills,5);assert.equal(summary.teamKills,8);assert.equal(summary.damageDealt,200);assert.match(summary.id,/:p2$/);
});
test('a shared XP shard is collected once even when both players overlap it',()=>{
  const session=make();for(const p of session.players){p.player.x=600;p.player.y=380;}
  session.run.pickups=[{id:20,type:'xp',x:600,y:380,r:4,xp:5}];stepCoopRun(session);assert.equal(session.run.xp,5);assert.equal(session.run.pickups.length,0);
});
test('two-player campaign completes after both final boss rewards without losing ownership',()=>{
  const session=make([{mode:'campaign'},{mode:'campaign',operator:'titan'}]);const run=session.run;let guard=0;
  while(run.state!=='gameover'&&guard++<300){
    if(run.state==='route'){assert.equal(coopAction(session,session.hostId,{type:'route',index:0}),true);run.spawnTimer=run.hazardTimer=1e8;}
    else if(run.state==='reward'){
      const owner=run.rewardOwnerId;
      if(run.pendingRelic)assert.equal(coopAction(session,owner,{type:'relic',id:run.pendingRelic,replaceId:session.players.find(p=>p.id===owner).relics[0]}),true);
      else assert.equal(coopAction(session,owner,{type:'reward',id:run.rewardChoices[0].id}),true);
    }else if(run.state==='shop')coopAction(session,session.hostId,{type:'shop',id:'leave'});
    else if(run.state==='event')coopAction(session,session.hostId,{type:'event',id:run.eventChoices[1].id});
    else{for(const p of session.players)p.player.invulnerable=999;run.encounterTime=90;for(const e of run.enemies){e.hp=0;e.lastHitBy='p2';}stepCoopRun(session);}
  }
  assert.equal(run.outcome,'victory');assert.equal(run.completedEncounters,15);assert.equal(run.completedActs,3);assert.equal(run.rewardQueue.length,0);assert.equal(getCoopView(session,'p1').summary.completedActs,3);assert.ok(getCoopView(session,'p2').summary.bosses>=3);
});
