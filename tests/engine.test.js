import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, stepRun, applyDamage, chooseRoute, getRouteChoices, getRewardChoices, selectReward, togglePause, dash, useAbility, getStats, equipRelic, serializeCheckpoint, restoreCheckpoint, getRunSummary, buyItem, chooseEvent, rerollReward, endRun, getUltimateSynergies, triggerWorldEvent, hasHazardEscape } from '../src/engine.js';
import { OPERATORS, WEAPONS, DIFFICULTIES } from '../src/content.js';

const make = (config={},save={}) => { const run=createRun({mode:'endless',seed:'test-seed',date:'2026-09-16',...config},save);run.spawnTimer=1e8;run.hazardTimer=1e8;run.bossTimer=1e8;run.worldEventTimer=1e8;return run; };
const enemy = (run,extra={}) => ({id:run.nextId++,type:'chaser',x:700,y:380,r:14,hp:100,maxHp:100,speed:0,damage:10,cooldown:10,slow:0,stun:0,counted:false,...extra});
test('empty runs cannot farm cores while earned combat progress is retained',()=>{
  const empty=make();endRun(empty,'defeat','Expedition abandoned');assert.equal(getRunSummary(empty).cores,0);
  const earned=make();earned.kills=50;endRun(earned,'defeat','Expedition abandoned');assert.equal(getRunSummary(earned).cores,2);
});
function frames(run,count,input={}) { for(let i=0;i<count;i++)stepRun(run,input,1/60); }
function clearRewards(run) { for(let guard=0;run.state==='reward'&&guard<100;guard++){if(run.pendingRelic)equipRelic(run,run.pendingRelic,run.relics[0]);else selectReward(run,getRewardChoices(run).find(c=>c.kind==='heal')?.id||getRewardChoices(run)[0].id);} }
function reward(run,choice) { run.state='reward';run.rewardQueue=[{type:'upgrade',title:'Test'}];run.rewardChoices=[choice];run.resumeState='playing';return selectReward(run,choice.id); }

test('shield resolves before lethal HP evaluation',()=>{
  const run=make();run.player.hp=5;run.player.shield=100;run.player.invulnerable=0;
  const result=applyDamage(run,{amount:30,unavoidable:true,source:'test'});
  assert.equal(run.player.hp,5);assert.equal(run.player.shield,70);assert.equal(run.state,'playing');assert.equal(result.hp,0);assert.equal(run.stats.shieldAbsorbed,30);
});
test('boss death and simultaneous level-up preserve credit and queue every reward',()=>{
  const run=make();run.xp=run.need-1;run.enemies.push(enemy(run,{type:'boss',hp:0,name:'Guardian',bossId:'grid-tyrant',phase:1,age:0}));
  stepRun(run);assert.equal(run.bosses,1);assert.equal(run.state,'reward');assert.equal(run.rewardQueue[0].type,'relic');assert.ok(run.rewardQueue.some(r=>r.type==='upgrade'));
  assert.equal(togglePause(run),false);assert.equal(run.state,'reward');clearRewards(run);assert.equal(run.state,'playing');assert.equal(run.bosses,1);
});
test('dead enemies cannot contact player or count twice',()=>{
  const run=make();run.player.invulnerable=0;run.enemies.push(enemy(run,{x:run.player.x,y:run.player.y,hp:0,damage:1000}));const hp=run.player.hp;
  stepRun(run);stepRun(run);assert.equal(run.player.hp,hp);assert.equal(run.kills,1);assert.equal(run.enemies.length,0);
});
test('Mythic selection is identical for keyboard index and pointer reward id',()=>{
  const a=make(),b=make(),choice={id:'weapon:pulse',kind:'weapon',target:'pulse',name:'Mythic pulse',rarity:'mythic'};
  for(const run of [a,b]){run.state='reward';run.rewardQueue=[{type:'upgrade'}];run.rewardChoices=[choice];}
  selectReward(a,0);selectReward(b,choice.id);assert.deepEqual(a.weapons,b.weapons);assert.deepEqual(a.mythicBonuses,b.mythicBonuses);assert.equal(a.stats.mythics,1);assert.equal(a.mythicSelections[0],'Mythic pulse');
});
test('difficulty presets and every custom knob are normalized and honored',()=>{
  for(const def of DIFFICULTIES){const run=make({difficulty:def.id});assert.equal(run.config.difficulty,def.id);assert.equal(run.difficultySettings.enemyHp,def.enemyHp);assert.equal(getStats(run).maxHp,def.startHp*.92);}
  const run=make({difficulty:'custom',customDifficulty:{enemyHp:9,enemySpeed:.7,spawnRate:2,bossPower:3,playerDamage:1.7,xpGain:2,startHp:220,doubleBosses:true}});
  assert.equal(run.difficultySettings.enemyHp,4);assert.equal(run.difficultySettings.enemySpeed,.7);assert.equal(getStats(run).xp,2);assert.equal(run.player.maxHp,220*.92);assert.equal(run.difficultySettings.doubleBosses,true);
  run.bossTimer=0;stepRun(run);assert.equal(run.enemies.filter(e=>e.type==='boss').length,2);
});
test('Daily ignores permanent combat bonuses, class and subclass choices',()=>{
  const a=make({mode:'daily',classId:'velocity',subclass:'blink'},{progression:{damage:10,health:10,reroll:3}}),b=make({mode:'daily'});
  assert.deepEqual(a.progression,{});assert.equal(a.config.classId,'assault');assert.equal(a.config.subclass,null);assert.equal(a.rerolls,0);assert.equal(a.config.seed,b.config.seed);assert.equal(a.config.operator,b.config.operator);assert.deepEqual(getStats(a),getStats(b));
});
test('passive tuning matches catalogue including pulse-only attack rate',()=>{
  const run=make();const base=getStats(run);run.passives={vital:1,ammo:1,fuel:1,regen:1,bracer:1,cube:1,catalyst:1,armor:1,boots:1,power:1,rate:1,crit:1,magnet:1};const stats=getStats(run);
  assert.equal(stats.maxHp-base.maxHp,22);assert.equal(stats.projectileSpeed,1.18);assert.equal(stats.area,1.16);assert.equal(stats.regen,.55);assert.equal(stats.duration,1.16);assert.equal(stats.zoneDuration,1.2);assert.equal(stats.cooldown,.88);assert.equal(stats.pulseCooldown,.88);assert.equal(stats.armor,.09);assert.equal(stats.pickup,95*1.28);assert.equal(stats.speed,base.speed*1.12);
});
test('all classes and subclass sidegrades change the advertised dimensions',()=>{
  const assault=make({classId:'assault'}),vanguard=make({classId:'vanguard'}),velocity=make({classId:'velocity',subclass:'blink'},{nexus:{xp:2000}});
  assert.ok(getStats(assault).damage>getStats(vanguard).damage);assert.ok(getStats(vanguard).maxHp>getStats(assault).maxHp);assert.ok(getStats(velocity).speed>getStats(assault).speed);assert.equal(velocity.player.dashMax,3);
  assert.equal(make({classId:'assault',subclass:'blink'}).config.subclass,null);
});
test('dash grants brief invulnerability, consumes charges and regenerates one per 4 seconds',()=>{
  const run=make();run.player.invulnerable=0;assert.equal(dash(run,1,0),true);assert.equal(run.player.dashCharges,1);const hp=run.player.hp;applyDamage(run,{amount:999,unavoidable:true});assert.equal(run.player.hp,hp);frames(run,241);assert.equal(run.player.dashCharges,2);assert.equal(run.player.invulnerable,0);
});
test('all eight operator abilities activate with cooldowns and cannot be repeated immediately',()=>{
  for(const operator of OPERATORS){const run=make({operator:operator.id});run.enemies.push(enemy(run,{x:650}));assert.equal(useAbility(run),true,operator.id);assert.equal(useAbility(run),false);assert.ok(run.player.abilityCooldown>0);assert.equal(run.stats.abilities,1);if(operator.id==='forge')assert.equal(run.companions[0].type,'turret');if(operator.id==='nyx')assert.equal(run.companions[0].type,'well');}
});
test('manual aim retains last valid direction and can switch without reset',()=>{
  const run=make({manualAim:true});stepRun(run,{aimX:0,aimY:1,manualAim:true});stepRun(run,{manualAim:true});assert.equal(run.player.aimY,1);const time=run.time;stepRun(run,{manualAim:false});assert.equal(run.config.manualAim,false);assert.ok(run.time>time);
});
test('six weapon slots exclude unusable new weapons from rewards',()=>{
  const run=make();run.weapons=Object.fromEntries(WEAPONS.slice(0,6).map(w=>[w.id,1]));run.xp=run.need;stepRun(run);
  assert.ok(getRewardChoices(run).every(c=>c.kind!=='weapon'||Object.hasOwn(run.weapons,c.target)));
});
test('every evolution requires level 5 plus its correct passive and activates',()=>{
  for(const def of WEAPONS.filter(w=>w.evolution)){
    const run=make();run.weapons={[def.id]:5};run.passives={[def.evolution.passive]:1};run.xp=run.need;stepRun(run);
    const evo=getRewardChoices(run).find(c=>c.kind==='evolution');assert.equal(evo?.target,def.id,def.id);selectReward(run,evo.id);assert.ok(run.evolved.includes(def.id));
  }
});
test('all twenty weapons deal recorded damage through their actual simulation mechanics',()=>{
  for(const weapon of WEAPONS){
    const run=make({manualAim:true});run.weapons={[weapon.id]:5};run.evolved=weapon.evolution?[weapon.id]:[];run.player.invulnerable=999;
    run.enemies.push(enemy(run,{x:weapon.id==='mine'?625:670,hp:1e6,maxHp:1e6,damage:0}));
    frames(run,240,{aimX:1,aimY:0});
    assert.ok(run.damageByWeapon[weapon.id]>0,`${weapon.name} must deal actual damage`);
    assert.ok(run.enemies.every(e=>Number.isFinite(e.hp)&&Number.isFinite(e.x)&&Number.isFinite(e.y)),weapon.id);
  }
});
test('subclasses stay locked below profile level 5 except in Training',()=>{
  assert.equal(make({classId:'velocity',subclass:'blink'},{nexus:{xp:1999}}).config.subclass,null);
  assert.equal(make({mode:'training',classId:'velocity',subclass:'blink'}).config.subclass,'blink');
});
test('rerolls consume earned charges and cannot bypass a pending relic replacement',()=>{
  const run=make({}, {progression:{reroll:2}});run.xp=run.need;stepRun(run);assert.equal(rerollReward(run),true);assert.equal(run.rerolls,1);assert.equal(run.state,'reward');run.pendingRelic='glass-reactor';assert.equal(rerollReward(run),false);assert.equal(run.rerolls,1);
});
test('relic replacement recomputes modifiers without cumulative drift',()=>{
  const run=make();equipRelic(run,'glass-reactor');equipRelic(run,'heavy-plating');equipRelic(run,'phase-battery');const original=getStats(run);
  assert.equal(equipRelic(run,'orbit-lens'),false);assert.equal(run.pendingRelic,'orbit-lens');equipRelic(run,'orbit-lens','glass-reactor');equipRelic(run,'glass-reactor','orbit-lens');assert.deepEqual(getStats(run),original);
});
test('double-shot doubles aimed shots at 60% each without reducing field damage',()=>{
  const a=make({manualAim:true}),b=make({manualAim:true});equipRelic(b,'double-shot');stepRun(a,{aimX:1});stepRun(b,{aimX:1});assert.equal(b.bullets.length,a.bullets.length*2);assert.equal(b.bullets[0].damage,a.bullets[0].damage*.6);assert.equal(getStats(a).damage,getStats(b).damage);
});
test('shield-to-crit trades half maximum shield for fixed critical chance',()=>{
  const run=make({operator:'titan'});const before=getStats(run);equipRelic(run,'shield-to-crit');assert.equal(run.player.maxShield,before.shield*.5);assert.equal(run.player.shield,before.shield*.5);assert.ok(Math.abs(getStats(run).crit-before.crit-.15)<1e-9);
});
test('four retained ultimate synergies activate only with complete recipes',()=>{
  const run=make();run.weapons={pulse:1,arc:1,plasma:1};assert.equal(getUltimateSynergies(run).length,0);run.passives.cube=1;assert.equal(getUltimateSynergies(run)[0].id,'supernova-grid');stepRun(run);assert.ok(run.ultimateSynergies.includes('supernova-grid'));
});
test('campaign completes fifteen encounters and all unlock milestones after queued rewards',()=>{
  const run=make({mode:'campaign'});let guard=0;
  while(run.state!=='gameover'&&guard++<180){
    if(run.state==='route'){chooseRoute(run,0);run.spawnTimer=1e8;run.hazardTimer=1e8;}
    else if(run.state==='reward')clearRewards(run);
    else if(run.state==='shop')buyItem(run,'leave');
    else if(run.state==='event')chooseEvent(run,run.eventChoices[1].id);
    else{run.player.invulnerable=999;run.encounterTime=90;for(const e of run.enemies)e.hp=0;stepRun(run);}
  }
  assert.equal(run.outcome,'victory');assert.equal(run.completedEncounters,15);assert.equal(run.completedActs,3);assert.deepEqual(run.unlocks,['nyx','echo','cryo']);assert.equal(run.config.biome,'final-rift');const summary=getRunSummary(run);assert.equal(summary.completedActs,3);assert.ok(summary.masteryXp>0);assert.ok(summary.bossIds.includes('rift-sovereign'));
});
test('hunt timeout and reactor destruction end campaign honestly',()=>{
  const hunt=make({mode:'campaign'});const route=getRouteChoices(hunt).find(c=>c.objective==='hunt');chooseRoute(hunt,route.index);hunt.encounterTime=90;stepRun(hunt);assert.equal(hunt.outcome,'defeat');assert.match(hunt.causeOfDeath,/hunt/);
  const reactor=make({mode:'campaign'});chooseRoute(reactor,0);reactor.reactor={x:600,y:380,r:28,hp:0,maxHp:300};stepRun(reactor);assert.equal(reactor.causeOfDeath,'Reactor destroyed');
});
test('all five world events provide distinct playable effects and prevent duplicate bosses',()=>{
  for(const id of ['rift-storm','elite-hunt','supply-drop','time-fracture','boss-invasion']){const run=make();assert.equal(triggerWorldEvent(run,id),true,id);assert.equal(run.worldEvent.id,id);if(id==='elite-hunt')assert.equal(run.enemies.filter(e=>e.type==='elite').length,3);if(id==='supply-drop'){run.player.x=run.worldEvent.x;run.player.y=run.worldEvent.y;stepRun(run);assert.ok(run.scrap>=60);assert.equal(run.worldEvent,null);}if(id==='boss-invasion'){run.worldEvent=null;assert.equal(triggerWorldEvent(run,id),false);}}
});
test('run quests grant Scrap once, never once per subsequent frame',()=>{
  const run=make();run.kills=30;stepRun(run);const scrap=run.scrap;assert.ok(run.runQuests[0].complete);stepRun(run);assert.equal(run.scrap,scrap);
});
test('same seed and input sequence replay identical simulation state',()=>{
  const a=make({operator:'cryo',manualAim:true}),b=make({operator:'cryo',manualAim:true});
  for(let i=0;i<300;i++){const input={x:Math.sin(i/30),y:Math.cos(i/30),aimX:1,aimY:0,dash:i===30,ability:i===100};stepRun(a,input);stepRun(b,input);}
  assert.deepEqual(serializeCheckpoint(a),serializeCheckpoint(b));
});
test('checkpoint restoration preserves RNG/build/cooldowns and rejects malformed data',()=>{
  const run=make({operator:'echo'});frames(run,60,{x:1,ability:true});const data=serializeCheckpoint(run),restored=restoreCheckpoint(data);assert.equal(restored.rngState,run.rngState);assert.deepEqual(restored.weapons,run.weapons);assert.equal(restored.player.abilityCooldown,run.player.abilityCooldown);assert.throws(()=>restoreCheckpoint({...data,player:{...data.player,hp:NaN}}));assert.throws(()=>restoreCheckpoint({...data,weapons:{madeup:1}}));
});
test('checkpoint rejects nonfinite simulation coordinates and impossible stage/economy values',()=>{
  const snapshot=serializeCheckpoint(make());
  for(const invalid of [{act:9},{encounter:0},{scrap:-1},{rngState:0},{player:{...snapshot.player,x:Infinity}},{enemies:[{id:1,x:NaN,y:100}]},{state:'reward',rewardQueue:[],rewardChoices:[]}])assert.throws(()=>restoreCheckpoint({...snapshot,...invalid}));
});
test('Flux Magnet changes shard collection range while ordinary drops remain bounded',()=>{
  const a=make(),b=make();b.passives.magnet=2;
  for(const run of [a,b])run.pickups=[{id:200,type:'xp',x:730,y:380,r:4,xp:4}];frames(a,30);frames(b,30);assert.equal(a.xp,0);assert.equal(b.xp,4);assert.equal(a.pickups[0].x,730);assert.equal(b.pickups.length,0);
  a.pickups=Array.from({length:300},(_,i)=>({id:1000+i,type:'xp',x:10,y:10,r:4,xp:1}));a.enemies.push(enemy(a,{x:20,y:20,hp:0}));stepRun(a);assert.equal(a.pickups.length,300);assert.equal(a.pickups.reduce((sum,p)=>sum+p.xp,0),302);
});
test('new hazard scheduling requires a walking-speed escape path',()=>{
  const run=make();const ordinary={type:'circle',x:600,y:380,r:75,warning:1.2,life:2};assert.equal(hasHazardEscape(run,ordinary),true);
  assert.equal(hasHazardEscape(run,{...ordinary,r:400,warning:.2}),false);
  run.hazards=[{type:'circle',x:600,y:380,r:2000,warning:0,life:5}];assert.equal(hasHazardEscape(run,ordinary),false);
});
test('bosses announce 70% and 35% transitions and one enrage after 3 minutes',()=>{
  const run=make();run.bossTimer=0;stepRun(run);const boss=run.enemies.find(e=>e.type==='boss');assert.ok(boss);run.weaponTimers.pulse=999;
  boss.hp=boss.maxHp*.69;boss.cooldown=0;stepRun(run);assert.equal(boss.phase,2);assert.ok(run.events.some(e=>e.type==='boss-phase'&&e.phase===2));assert.ok(run.hazards.every(h=>h.warning>0));
  boss.hp=boss.maxHp*.34;boss.age=180;stepRun(run);assert.equal(boss.phase,3);assert.equal(boss.enraged,true);assert.equal(run.events.filter(e=>e.type==='boss-enrage').length,1);stepRun(run);assert.equal(run.events.filter(e=>e.type==='boss-enrage').length,0);
});
test('endRun reports canonical summary and cannot award twice',()=>{
  const run=make();run.kills=100;run.masteryEarned=50;endRun(run,'defeat','Abandoned');const first=getRunSummary(run);endRun(run,'victory','ignored');assert.deepEqual(getRunSummary(run),first);assert.equal(first.masteryXp,50);assert.ok(Array.isArray(first.mythics));assert.equal(first.outcome,'defeat');
});
