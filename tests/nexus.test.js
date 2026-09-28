import test from 'node:test';
import assert from 'node:assert/strict';
import { getNexusDefaults,normalizeNexus,awardNexus,getSeason,getWeeklyChallenges,getRunQuests,validateClassSelection,favoriteBuild,removeFavorite,encodeGhost,decodeGhost,benchmarkGhost,recordGhostSample,getProfileView,renderNexusPage,CLASS_DEFINITIONS,SUBCLASSES,TUTORIAL_STEPS,SEASON_EPOCH } from '../src/nexus.js';
import {WEAPONS,PASSIVES,RELICS} from '../src/content.js';
import {createInput} from '../src/input.js';
import {render,drawMenu} from '../src/render.js';
import {createAudio} from '../src/audio.js';

const summary=(overrides={})=>({id:'run-1',mode:'campaign',operator:'nova',classId:'assault',difficulty:'standard',date:'2026-09-16T12:00:00Z',balanceVersion:'5.0.0',outcome:'victory',score:4000,kills:100,elites:3,bosses:1,duration:300,encounters:5,completedActs:1,damageDealt:50000,damageTaken:10,damageByWeapon:{pulse:50000},weapons:{pulse:5},passives:{},relics:[],evolutions:['pulse'],dashes:15,abilities:3,biome:'neon-city',...overrides});
const save=nexus=>({nexus,history:[],stats:{runs:0,bestScore:0}});

test('Nexus defaults normalize without aliasing or browser globals',()=>{
  const first=getNexusDefaults(),second=getNexusDefaults();first.discoveries.weapons.push('pulse');assert.deepEqual(second.discoveries.weapons,[]);
  assert.deepEqual(normalizeNexus(),getNexusDefaults());assert.deepEqual(normalizeNexus(getNexusDefaults()),getNexusDefaults());
});
test('Nexus import rejects malformed progression and unsafe text-shaped data',()=>{
  for(const invalid of [{xp:-1},{xp:Infinity},{weaponMastery:{unknown:5}},{tutorial:{step:7,complete:false}},{favoriteBuilds:Array(9).fill({})},{cosmetics:{equipped:'locked',unlocked:['standard']}}])assert.throws(()=>normalizeNexus(invalid));
  assert.throws(()=>normalizeNexus({seasons:JSON.parse('{"__proto__":{"xp":1}}')}));
});
test('eight-week seasons use exact UTC Monday boundaries',()=>{
  const a=getSeason(SEASON_EPOCH),b=getSeason(SEASON_EPOCH+56*86400000-1),c=getSeason(SEASON_EPOCH+56*86400000);
  assert.equal(a.id,'nexus-1');assert.equal(a.week,1);assert.equal(b.id,'nexus-1');assert.equal(b.week,8);assert.equal(c.id,'nexus-2');assert.equal(c.week,1);
  assert.equal(getSeason('2026-09-21T00:00:00Z').weekId,'nexus-1-w2');assert.equal(getSeason('2026-09-20T23:59:59Z').weekId,'nexus-1-w1');assert.throws(()=>getSeason('not a date'));
});
test('weekly challenges are stable across clients and rotate every week',()=>{
  const first=getWeeklyChallenges('2026-09-14T00:00:00Z');assert.deepEqual(first,getWeeklyChallenges('2026-09-20T23:59:59Z'));
  assert.equal(new Set(first.map(q=>q.id)).size,3);assert.notDeepEqual(first,getWeeklyChallenges('2026-09-21T00:00:00Z'));
  assert.deepEqual(first.map(q=>q.templateId),['swarm','elites','bosses']);assert.ok(first.every(q=>q.rewardXp>0&&q.target>0));
});
test('awarding a run is immutable and idempotent with quest, mastery, lore and cosmetic progression',()=>{
  const initial=getNexusDefaults(),result=awardNexus(initial,summary());
  assert.equal(initial.xp,0);assert.ok(result.xp>0);assert.equal(result.weaponMastery.pulse,500);assert.ok(result.cosmetics.unlocked.includes('weapon-pulse'));
  assert.ok(result.achievements.includes('hundred'));assert.ok(result.achievements.includes('riftwalker'));assert.ok(result.lore.includes('roots'));
  assert.deepEqual(awardNexus(result,summary()),result);assert.deepEqual(awardNexus(initial,summary({mode:'training'})),initial);
});
test('weekly rewards are paid once and season progress stays separate across rollover',()=>{
  const run=summary({kills:600,elites:20,bosses:6});let nexus=awardNexus(undefined,run);
  assert.equal(nexus.weekly['nexus-1-w1'].claimed.length,3);
  const once=nexus.seasons['nexus-1'].xp;nexus=awardNexus(nexus,{...run,id:'run-2'});assert.ok(nexus.seasons['nexus-1'].xp-once<once);
  nexus=awardNexus(nexus,{...run,id:'run-3',date:'2026-11-09T00:00:00Z'});assert.equal(nexus.seasons['nexus-2'].runs,1);assert.equal(nexus.seasons['nexus-1'].runs,2);
});
test('every class has two matching sidegrades and subclasses have a concrete unlock',()=>{
  assert.equal(CLASS_DEFINITIONS.length,3);for(const role of CLASS_DEFINITIONS)assert.equal(SUBCLASSES.filter(s=>s.classId===role.id).length,2);
  assert.throws(()=>validateClassSelection('assault','striker',getNexusDefaults()));assert.deepEqual(validateClassSelection('assault','striker',{xp:2000}),{classId:'assault',subclass:'striker'});
  assert.throws(()=>validateClassSelection('velocity','striker',{xp:2000}));assert.deepEqual(validateClassSelection('velocity','blink',{xp:2000},'daily'),{classId:'assault',subclass:null});
});
test('run quests and onboarding cover actionable inputs',()=>{
  assert.equal(getRunQuests({mode:'campaign',operator:'nova'}).length,3);assert.equal(getRunQuests({mode:'campaign'}).at(-1).stat,'encounters');assert.equal(getRunQuests({mode:'endless'}).at(-1).stat,'duration');assert.equal(TUTORIAL_STEPS.length,6);
});
test('favorite builds preserve loadout and enforce eight slots without silent replacement',()=>{
  let nexus=favoriteBuild(undefined,summary());assert.equal(nexus.favoriteBuilds[0].weapons[0],'pulse');assert.equal(nexus.favoriteBuilds[0].operator,'nova');assert.equal(favoriteBuild(nexus,summary()).favoriteBuilds.length,1);
  for(let i=2;i<=8;i++)nexus=favoriteBuild(nexus,summary({id:`run-${i}`}));assert.throws(()=>favoriteBuild(nexus,summary({id:'run-9'})),/eight/i);
  assert.equal(removeFavorite(nexus,'run-1').favoriteBuilds.length,7);assert.equal(nexus.favoriteBuilds.length,8);
});
test('ghost sharing roundtrips Unicode and interpolates score pace',()=>{
  const code=encodeGhost(summary({name:'Nova ✦',ghostSamples:[{time:0,score:0,kills:0},{time:100,score:1000,kills:40},{time:300,score:4000,kills:100}]}));
  const ghost=decodeGhost(code);assert.equal(ghost.name,'Nova ✦');assert.deepEqual(benchmarkGhost(ghost,200),{time:200,score:2500,kills:70,finished:false});assert.equal(benchmarkGhost(ghost,900).finished,true);
});
test('ghost validation rejects malformed, oversized, reversed, and impossible samples',()=>{
  assert.throws(()=>decodeGhost('not-a-ghost'));assert.throws(()=>decodeGhost('NRG1.'+'A'.repeat(40000)));
  for(const samples of [[{time:30,score:2,kills:1},{time:20,score:3,kills:2}],[{time:0,score:99999,kills:1}],[{time:301,score:10,kills:1}],Array.from({length:121},(_,i)=>({time:i,score:i,kills:i}))])assert.throws(()=>encodeGhost(summary({ghostSamples:samples})));
});
test('ghost pace interpolates the unrecorded final interval without jumping to the final score',()=>{
  const ghost=decodeGhost(encodeGhost(summary({ghostSamples:[],replaySnapshots:[{time:0,score:0,kills:0},{time:100,score:1000,kills:40}]})));
  assert.equal(ghost.samples.length,2);assert.deepEqual(benchmarkGhost(ghost,200),{time:200,score:2500,kills:70,finished:false});
  const fractional=recordGhostSample([],{time:10.006,score:50,kills:1});assert.doesNotThrow(()=>encodeGhost(summary({duration:10.006,ghostSamples:fractional})));
});
test('replay samples remain bounded and sparse in a long run',()=>{
  let samples=[];for(let time=0;time<7200;time++)samples=recordGhostSample(samples,{time,score:time*20,kills:time});
  assert.ok(samples.length<=120);assert.equal(samples[0].time,0);assert.ok(samples.at(-1).time>=7190);for(let i=1;i<samples.length;i++)assert.ok(samples[i].time-samples[i-1].time>=10);
});
test('profile level and cosmetics never alter combat data',()=>{
  const profile=getProfileView(save({...getNexusDefaults(),xp:2000}));assert.equal(profile.level,5);assert.equal(profile.subclassesUnlocked,true);assert.equal(profile.weaponMastery.length,WEAPONS.length);
  assert.ok(profile.weaponMastery.every(w=>w.xp===0));
});
test('all Nexus pages render concrete content and escape imported run names',()=>{
  const state=save(awardNexus(undefined,summary()));state.history=[summary({id:'<script>alert(1)</script>',name:'<img src=x onerror=alert(1)>'})];
  for(const page of ['profile','seasons','achievements','history','lore','tutorial'])assert.ok(renderNexusPage(page,state,{now:'2026-09-16'}).length>200);
  const html=renderNexusPage('history',state,{selectedIds:[state.history[0].id]});assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('data-nexus-action="export-ghost"'));
  assert.ok(renderNexusPage('tutorial',state).includes('tutorial-next'));assert.ok(renderNexusPage('lore',state).includes('ARCHIVED TRANSMISSIONS'));
});

test('Canvas renderer accepts all biomes, telegraphs, downed teammates and effect settings',()=>{
  let calls=0;const gradient={addColorStop(){}};const ctx=new Proxy({canvas:{width:1200,height:760},createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get(target,key){if(key in target)return target[key];return()=>{calls++;};},set(target,key,value){target[key]=value;return true;}});
  for(const biome of ['neon-city','overgrown-circuit','void-factory','frozen-rift','magma-core','storm-spire','void-cathedral','final-rift'])render(ctx,{biome,time:10,config:{operator:'nova',cosmetic:'trail-gold'},player:{x:600,y:380,hp:100,maxHp:100,shield:15,maxShield:20,dashCharges:2,dashMax:2},enemies:[{x:400,y:400,hp:100,maxHp:100,r:20,type:'boss',phase:2}],bullets:[],hazards:[{type:'line',x:30,y:30,x2:400,y2:400,warning:1},{type:'silence',x:500,y:500,r:40},{type:'ring',x:200,y:200,r:50}],effects:[{type:'text',x:300,y:300,life:1,maxLife:1,text:'12'}],coop:{playerId:'one',players:[{id:'two',operator:'titan',x:400,y:500,hp:0,downed:true,reviveProgress:1.5}]}},{width:800,height:600,settings:{colorblind:'deuteranopia',reducedFlash:true,vfx:.5,performance:true}});
  drawMenu(ctx,{width:800,height:600,settings:{reducedMotion:true}});assert.ok(calls>100);
});

test('keyboard rebinding, edge triggering, controller disable and blur force-pause work',()=>{
  const makeTarget=()=>({listeners:new Map(),style:{},addEventListener(type,listener){const list=this.listeners.get(type)||[];list.push(listener);this.listeners.set(type,list);},removeEventListener(){},fire(type,event={}){for(const listener of this.listeners.get(type)||[])listener({preventDefault(){},target:null,...event});}});
  const oldWindow=globalThis.window,oldDocument=globalThis.document,oldNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
  const window=makeTarget(),document=makeTarget(),canvas=makeTarget();canvas.getBoundingClientRect=()=>({left:0,top:0,width:1200,height:760});let settings={keybindings:{dash:'KeyQ',pause:'KeyP'},controller:false};const reasons=[];
  globalThis.window=window;globalThis.document=document;Object.defineProperty(globalThis,'navigator',{value:{getGamepads:()=>[{connected:true,index:0,axes:[1,0,0,0],buttons:[]}]},configurable:true});
  try{
    const input=createInput(canvas,{getSettings:()=>settings,onPause:reason=>reasons.push(reason)});window.fire('keydown',{code:'KeyQ'});assert.equal(input.sample({state:'playing'}).dash,true);assert.equal(input.sample({state:'playing'}).dash,false);assert.equal(input.sample({state:'playing'}).x,0);
    assert.equal(input.rebind('ability','KeyQ').ok,false);assert.equal(input.rebind('dash','KeyF').ok,true);window.fire('keydown',{code:'KeyF'});assert.equal(input.sample({state:'playing'}).dash,true);
    window.fire('keydown',{code:'KeyP'});window.fire('blur');assert.deepEqual(reasons,['toggle','blur']);input.destroy();
  }finally{if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;if(oldNavigator)Object.defineProperty(globalThis,'navigator',oldNavigator);else delete globalThis.navigator;}
});

test('audio remains safe without browser audio support and allows stop/restart',()=>{
  const audio=createAudio({sfx:0,music:0});audio.play('start');audio.stop();audio.play('reward');audio.setSettings({sfx:.5});audio.setBiome('frozen-rift');audio.destroy();assert.ok(true);
});
test('fixed touch movement uses a stable safe-area origin and Enter prevents native duplicate activation',()=>{
  const target=()=>({listeners:new Map(),style:{},addEventListener(type,fn){const list=this.listeners.get(type)||[];list.push(fn);this.listeners.set(type,list);},removeEventListener(){},fire(type,event={}){for(const fn of this.listeners.get(type)||[])fn({preventDefault(){},target:null,...event});}});
  const oldWindow=globalThis.window,oldDocument=globalThis.document,oldNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
  const win=target(),doc=target(),canvas=target();doc.body={append(){}};doc.createElement=()=>({style:{},setAttribute(){},append(child){this.firstChild=child;},remove(){}});canvas.getBoundingClientRect=()=>({left:0,top:0,width:1200,height:760});
  globalThis.window=win;globalThis.document=doc;Object.defineProperty(globalThis,'navigator',{value:{getGamepads:()=>[]},configurable:true});let settings={fixedJoystick:true};let selected=0,prevented=false;
  try{
    const input=createInput(canvas,{getSettings:()=>settings,onMenu:action=>{if(action==='select')selected++;}});
    canvas.fire('pointerdown',{pointerType:'touch',pointerId:1,clientX:120,clientY:650});assert.equal(input.sample({state:'playing'}).x,1);
    win.fire('pointerup',{pointerId:1});settings={fixedJoystick:false};canvas.fire('pointerdown',{pointerType:'touch',pointerId:2,clientX:120,clientY:650});assert.equal(input.sample({state:'playing'}).x,0);
    input.setMenuActive(true);win.fire('keydown',{code:'Enter',preventDefault(){prevented=true;}});assert.equal(selected,1);assert.equal(prevented,true);input.destroy();
  }finally{if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;if(oldNavigator)Object.defineProperty(globalThis,'navigator',oldNavigator);else delete globalThis.navigator;}
});
test('stopping WebAudio closes its graph and a new run creates a fresh graph',()=>{
  const oldWindow=globalThis.window,oldDocument=globalThis.document;let created=0,closed=0;
  const parameter=()=>({value:0,setTargetAtTime(){},setValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){}});
  const node=()=>({gain:parameter(),frequency:parameter(),detune:parameter(),threshold:parameter(),knee:parameter(),ratio:parameter(),connect(){},disconnect(){},start(){},stop(){}});
  class FakeAudioContext{constructor(){created++;this.currentTime=0;this.state='running';this.sampleRate=8000;this.destination={};}createGain(){return node();}createDynamicsCompressor(){return node();}createOscillator(){return node();}createBiquadFilter(){return node();}createBufferSource(){return node();}createBuffer(channels,length){return{getChannelData(){return new Float32Array(length);}};}close(){closed++;return Promise.resolve();}resume(){return Promise.resolve();}}
  globalThis.window={AudioContext:FakeAudioContext,addEventListener(){},removeEventListener(){}};globalThis.document={addEventListener(){},removeEventListener(){}};
  try{const audio=createAudio();audio.play('start');audio.stop();audio.play('hit');audio.destroy();assert.equal(created,2);assert.equal(closed,2);}finally{if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;}
});
