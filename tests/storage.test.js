import test, {afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {defaultSave,validateSave,migrateV4,loadSave,saveProfile,importSave,exportSave,finishRun,getMastery,isOperatorUnlocked,encodeBuild,decodeBuild,saveCheckpoint,loadCheckpoint,clearCheckpoint,SAVE_KEY,LEGACY_KEY} from '../src/storage.js';
import {OPERATORS,BIOMES,WEAPONS,PASSIVES,RELICS,CORE_NODES,BALANCE_VERSION} from '../src/content.js';

const originalLocalStorage=globalThis.localStorage;
afterEach(()=>{if(originalLocalStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=originalLocalStorage;});
function memoryStorage() {
  const values=new Map();
  globalThis.localStorage={getItem:key=>values.has(key)?values.get(key):null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
  return values;
}
const summary = (extra={}) => ({id:'run-001',operator:'nova',mode:'campaign',difficulty:'standard',score:1200,duration:430,kills:210,elites:2,bosses:1,encounters:5,completedActs:1,outcome:'defeat',...extra});
const checkpoint = () => ({id:'checkpoint-run',checkpointVersion:5,player:{x:50,y:80,hp:71},rng:456,phase:'route',weapons:{pulse:2},rewards:[],scrap:23});

test('catalogue contains all V5 content and preserves unique IDs and valid evolution pairs',()=>{
  assert.equal(OPERATORS.length,8);assert.equal(BIOMES.length,8);assert.equal(WEAPONS.length,20);assert.equal(RELICS.length,14);
  for(const list of [OPERATORS,BIOMES,WEAPONS,PASSIVES,RELICS,CORE_NODES])assert.equal(new Set(list.map(item=>item.id)).size,list.length);
  const evolutions=WEAPONS.filter(weapon=>weapon.evolution).map(weapon=>weapon.evolution.id);
  assert.equal(new Set(evolutions).size,evolutions.length);
  for(const weapon of WEAPONS){assert.equal(weapon.levels.length,5);for(let i=1;i<5;i++)assert.ok(weapon.levels[i].damage>weapon.levels[i-1].damage);if(weapon.evolution)assert.ok(PASSIVES.some(passive=>passive.id===weapon.evolution.passive));}
  assert.equal(WEAPONS.filter(weapon=>weapon.new).length,6);
});

test('defaults are independent, valid and manual aim is opt-in',()=>{
  const first=defaultSave(),second=defaultSave();first.progression.damage=4;first.settings.keybindings.dash='KeyQ';
  assert.equal(second.progression.damage,0);assert.equal(second.settings.keybindings.dash,'Space');assert.equal(second.settings.manualAim,false);
  assert.deepEqual(validateSave(second),second);
});

test('migrates V4 core grid, settings, achievements and history without mixing score eras',()=>{
  const raw={version:4,cores:71,progression:{damage:4,shield:3},selected:{operator:'ghost',arena:'frozen-rift',runMode:'endless'},settings:{sfx:.2,reducedMotion:true},achievements:{mythic:true},stats:{runs:12,bosses:20},history:[{score:899,operator:'ghost'}],leaderboards:{endless:[{score:899}]}};
  const old=JSON.stringify(raw),save=migrateV4(raw);
  assert.equal(save.cores,71);assert.equal(save.progression.shield,3);assert.equal(save.selected.biome,'frozen-rift');assert.equal(save.settings.sfx,.2);assert.equal(save.settings.manualAim,false);
  assert.deepEqual(save.legacyV4.history,raw.history);assert.deepEqual(save.records,{});assert.deepEqual(save.history,[]);assert.equal(save.stats.runs,12);assert.equal(JSON.stringify(raw),old);
});

test('automatic migration preserves the original V4 localStorage key byte for byte',()=>{
  const values=memoryStorage(),legacy=JSON.stringify({version:4,cores:83,history:[],leaderboards:{}});values.set(LEGACY_KEY,legacy);
  const save=loadSave();assert.equal(save.cores,83);assert.equal(values.get(LEGACY_KEY),legacy);assert.equal(JSON.parse(values.get(SAVE_KEY)).version,5);
});

test('invalid imports never change the active profile',()=>{
  const values=memoryStorage();saveProfile({...defaultSave(),cores:17});const before=values.get(SAVE_KEY);
  for(const text of ['broken','{}',JSON.stringify({...defaultSave(),cores:-1}),JSON.stringify({...defaultSave(),settings:{sfx:99}}),'{"version":5,"__proto__":{"cores":999}}'])assert.throws(()=>importSave(text));
  assert.equal(values.get(SAVE_KEY),before);
});

test('save export and import round trip, including the UTF-8 V4 export format',()=>{
  memoryStorage();const save=defaultSave();save.cores=37;save.mastery.nova=470;
  const imported=importSave(exportSave(save));assert.equal(imported.cores,37);assert.equal(imported.mastery.nova,470);assert.ok(imported.updatedAt>0);
  const legacy={version:4,cores:8,achievements:{mythic:'★'}};
  const encoded=Buffer.from(JSON.stringify(legacy),'utf8').toString('base64');assert.equal(importSave(encoded).achievements.mythic,'★');
});

test('key binding conflicts, unsupported keys and reserved reward keys are rejected',()=>{
  const save=defaultSave();save.settings.keybindings.ability='Space';assert.throws(()=>validateSave(save),/unique/);
  save.settings.keybindings.ability='Digit1';assert.throws(()=>validateSave(save),/reserved/);
  save.settings.keybindings.ability='ArrowUp';assert.throws(()=>validateSave(save),/reserved/);
  save.settings.keybindings.ability='DeleteEverything';assert.throws(()=>validateSave(save),/Unsupported/);
  save.settings.keybindings.ability='KeyQ';assert.equal(validateSave(save).settings.keybindings.ability,'KeyQ');
});

test('completion accounting is idempotent and unlocks campaign operators',()=>{
  const start=defaultSave();const first=finishRun(start,summary());assert.equal(start.stats.runs,0);assert.equal(first.stats.runs,1);assert.ok(first.cores>0);assert.equal(first.unlocks.act1,true);assert.equal(isOperatorUnlocked(first,'nyx'),true);assert.equal(isOperatorUnlocked(first,'echo'),false);
  const duplicate=finishRun(first,summary());assert.deepEqual(duplicate,first);
  const won=finishRun(first,summary({id:'run-002',outcome:'victory',completedActs:3,bosses:3,encounters:15}));
  assert.equal(won.unlocks.campaign,true);assert.equal(isOperatorUnlocked(won,'echo'),true);assert.equal(isOperatorUnlocked(won,'cryo'),true);assert.equal(won.stats.campaignWins,1);
});

test('records separate difficulty, mode, balance version and Daily date',()=>{
  let save=defaultSave();
  for(const [index,extra] of [{},{difficulty:'custom'},{balanceVersion:'4.9.9'},{mode:'daily',date:'2026-09-15'},{mode:'daily',date:'2026-09-16'}].entries())save=finishRun(save,summary({id:`run-${index}`,...extra}));
  assert.equal(Object.keys(save.records).length,5);
  assert.ok(save.records[`campaign:custom:${BALANCE_VERSION}`]);assert.ok(save.records[`daily:standard:${BALANCE_VERSION}:2026-09-15`]);
});

test('training has no records, cores, mastery or campaign unlocks',()=>{
  const save=finishRun(defaultSave(),summary({mode:'training',outcome:'victory',completedActs:3,cores:900,masteryXp:900}));
  assert.equal(save.cores,0);assert.equal(save.mastery.nova,0);assert.deepEqual(save.records,{});assert.equal(save.unlocks.campaign,false);
  assert.equal(isOperatorUnlocked(save,'nyx','training'),true);assert.equal(isOperatorUnlocked(save,'fake','training'),false);
});

test('mastery is cosmetic, has ten levels, and exposes monotonic progress',()=>{
  assert.equal(getMastery(0).level,1);assert.equal(getMastery(100).level,2);assert.equal(getMastery(3200).level,10);assert.equal(getMastery(99999).progress,1);
  assert.equal(getMastery(3200).next,null);assert.ok(!('damage' in getMastery(3200)));
});

test('build codes round trip and enforce six/six/three slots',()=>{
  const build={operator:'nyx',weapons:['pulse','gravity-needle','tesla-rail'],passives:['magnet','cube'],relics:['phase-battery']};
  const code=encodeBuild(build);assert.deepEqual(decodeBuild(code),{version:1,...build});
  assert.throws(()=>decodeBuild(`${code}x`),/checksum/);
  assert.throws(()=>encodeBuild({...build,weapons:WEAPONS.slice(0,7).map(item=>item.id)}),/at most 6/);
  assert.throws(()=>encodeBuild({...build,weapons:['pulse','pulse']}),/duplicate/);
  assert.throws(()=>encodeBuild({...build,relics:['imaginary']}),/Unknown/);
});

test('checkpoint preserves RNG, inventory and HP and completes atomically with profile',async()=>{
  memoryStorage();const save=defaultSave();save.cores=27;save.unlocks.act1=true;
  const run=checkpoint();await saveCheckpoint(run,save);run.player.hp=0;
  const restored=await loadCheckpoint();assert.equal(restored.player.hp,71);assert.equal(restored.rng,456);assert.deepEqual(restored.weapons,{pulse:2});assert.equal(loadSave().cores,27);
  await clearCheckpoint();assert.equal(await loadCheckpoint(),null);
});

test('checkpoint journal repairs a profile mirror interrupted after atomic commit',async()=>{
  const values=memoryStorage(),storage=globalThis.localStorage,realSet=storage.setItem;
  const save=defaultSave();save.cores=51;
  storage.setItem=(key,value)=>{if(key===SAVE_KEY)throw new Error('simulated interruption');realSet(key,value);};
  await assert.rejects(()=>saveCheckpoint(checkpoint(),save),/interruption/);
  storage.setItem=realSet;assert.equal(values.has(SAVE_KEY),false);
  const restored=await loadCheckpoint();assert.equal(restored.id,'checkpoint-run');assert.equal(loadSave().cores,51);
});

test('completed runs cannot be resumed or checkpointed again',async()=>{
  memoryStorage();const run=checkpoint();await saveCheckpoint(run,defaultSave());
  const completed=finishRun(defaultSave(),summary({id:run.id}));saveProfile(completed);
  assert.equal(await loadCheckpoint(),null);await assert.rejects(()=>saveCheckpoint(run,completed),/completed/);
});

test('malformed checkpoint fails before writing profile or run',async()=>{
  const values=memoryStorage();await assert.rejects(()=>saveCheckpoint({id:'bad',checkpointVersion:5},defaultSave()),/player state/);assert.equal(values.size,0);
});

test('build codes preserve class specialization and reject incompatible subclasses',()=>{
  const build={operator:'titan',classId:'vanguard',subclass:'bastion',weapons:['pulse','guard'],passives:['armor'],relics:['shield-to-crit']};
  assert.deepEqual(decodeBuild(encodeBuild(build)),{version:1,...build});
  assert.throws(()=>encodeBuild({...build,subclass:'blink'}),/Subclass/);
});

test('V4 achievement timestamp objects and documented V4.1/V4.2 imports migrate safely',()=>{
  for(const version of [4,'4.1',4.2]){const legacy={version,cores:41,achievements:{mythic:{at:12345}}};const save=migrateV4(legacy);assert.equal(save.achievements.mythic,12345);assert.equal(save.cores,41);assert.deepEqual(legacy.achievements.mythic,{at:12345});}
});
