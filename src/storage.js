import { OPERATORS, BIOMES, WEAPONS, PASSIVES, RELICS, DIFFICULTIES, MODES, CORE_NODES, CUSTOM_RANGES, BALANCE_VERSION } from './content.js';
import {getNexusDefaults,normalizeNexus,awardNexus} from './nexus.js';

export const SAVE_KEY = 'neonRiftV5Save';
export const LEGACY_KEY = 'neonRiftV4Save';
const FALLBACK_CHECKPOINT_KEY = 'neonRiftV5Checkpoint';
const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
const DEFAULT_KEYS = {up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD',dash:'Space',ability:'KeyE',pause:'Escape'};
const titleNames = ['Initiate','Signal Hunter','Circuit Runner','Rift Scout','Vanguard','Pathfinder','Breaker','Starborn','Riftwalker','Rift Legend'];
const clone = value => JSON.parse(JSON.stringify(value));
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const idExists = (list,id) => list.some(item=>item.id===id);
function finite(value,label,min=0,max=1e12) {
  if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max) throw new Error(`Invalid ${label}.`);
  return value;
}
function integer(value,label,min=0,max=1e12) {finite(value,label,min,max);if(!Number.isInteger(value)) throw new Error(`Invalid ${label}.`);return value;}
function bool(value,label){if(typeof value!=='boolean')throw new Error(`Invalid ${label}.`);return value;}
function string(value,label,max=160){if(typeof value!=='string'||value.length>max)throw new Error(`Invalid ${label}.`);return value;}
function safeTree(value,depth=0) {
  if(depth>20) throw new Error('Save data is nested too deeply.');
  if(value===null||typeof value==='boolean') return;
  if(typeof value==='number'){finite(value,'number',-1e15,1e15);return;}
  if(typeof value==='string'){string(value,'text',10000);return;}
  if(Array.isArray(value)){if(value.length>5000)throw new Error('Save list is too large.');value.forEach(v=>safeTree(v,depth+1));return;}
  if(!object(value))throw new Error('Unsupported save data.');
  if(Object.keys(value).length>5000) throw new Error('Save object is too large.');
  for(const [key,v] of Object.entries(value)){if(['__proto__','constructor','prototype'].includes(key)) throw new Error('Unsafe save property.');safeTree(v,depth+1);}
}
const progressDefaults = () => Object.fromEntries(CORE_NODES.map(node=>[node.id,0]));
const customDefaults = () => ({enemyHp:1,enemySpeed:1,spawnRate:1,bossPower:1,playerDamage:1,xpGain:1,startHp:100,doubleBosses:false});
export function defaultSave() {
  return {
    version:5, updatedAt:0, cores:0,
    selected:{operator:'nova',biome:'neon-city',mode:'campaign',difficulty:'standard',class:'assault',subclass:''},
    progression:progressDefaults(),
    settings:{manualAim:false,masterVolume:.55,sfx:.7,music:.22,vfx:1,reducedMotion:false,reducedFlash:false,colorblind:'off',vibration:false,damageNumbers:true,screenShake:true,controller:true,fixedJoystick:false,performance:false,diagnostics:false,uiScale:1,highContrast:false,quality:'high',keybindings:{...DEFAULT_KEYS}},
    customDifficulty:customDefaults(), mastery:Object.fromEntries(OPERATORS.map(op=>[op.id,0])),
    operatorStats:Object.fromEntries(OPERATORS.map(op=>[op.id,{encounters:0,bosses:0,wins:0}])),
    unlocks:{act1:false,act2:false,campaign:false}, achievements:{},
    stats:{runs:0,kills:0,elites:0,bosses:0,seconds:0,bestScore:0,mythics:0,evos:0,coresEarned:0,campaignWins:0},
    history:[],records:{},completedRuns:[],lastRun:null,legacyV4:null,nexus:getNexusDefaults(),
  };
}

/** Validate completely before the caller writes storage. Unknown top-level fields are discarded. */
export function validateSave(raw) {
  if(!object(raw)||raw.version!==5) throw new Error('This is not a V5 save.');
  safeTree(raw);
  if(JSON.stringify(raw).length>MAX_IMPORT_BYTES)throw new Error('Save exceeds the 2 MB limit.');
  const save=defaultSave();
  if(raw.updatedAt!==undefined) save.updatedAt=finite(raw.updatedAt,'save timestamp',0,1e15);
  if(raw.cores!==undefined) save.cores=integer(raw.cores,'Rift Cores');
  if(raw.selected!==undefined){
    if(!object(raw.selected))throw new Error('Invalid selected loadout.');
    for(const [key,list] of [['operator',OPERATORS],['biome',BIOMES],['mode',MODES],['difficulty',DIFFICULTIES]]) {
      const value=raw.selected[key];if(value!==undefined){if(!idExists(list,value))throw new Error(`Unknown ${key}.`);save.selected[key]=value;}
    }
    if(raw.selected.class!==undefined){if(!['assault','vanguard','velocity'].includes(raw.selected.class))throw new Error('Unknown class.');save.selected.class=raw.selected.class;}
    if(raw.selected.subclass!==undefined){if(!['','striker','demolisher','bastion','siphon','blink','ranger'].includes(raw.selected.subclass))throw new Error('Unknown subclass.');save.selected.subclass=raw.selected.subclass;}
  }
  if(raw.progression!==undefined){
    if(!object(raw.progression))throw new Error('Invalid Core Grid.');
    for(const node of CORE_NODES)if(raw.progression[node.id]!==undefined)save.progression[node.id]=integer(raw.progression[node.id],node.name,0,node.max);
  }
  if(raw.settings!==undefined){
    if(!object(raw.settings))throw new Error('Invalid settings.');
    for(const key of ['manualAim','reducedMotion','reducedFlash','vibration','damageNumbers','screenShake','controller','fixedJoystick','performance','diagnostics','highContrast'])if(raw.settings[key]!==undefined)save.settings[key]=bool(raw.settings[key],key);
    if(raw.settings.colorblind!==undefined){if(!['off','deuteranopia','protanopia','tritanopia'].includes(raw.settings.colorblind))throw new Error('Unknown colour preset.');save.settings.colorblind=raw.settings.colorblind;}
    for(const key of ['masterVolume','sfx','music','vfx'])if(raw.settings[key]!==undefined)save.settings[key]=finite(raw.settings[key],key,0,1);
    if(raw.settings.uiScale!==undefined)save.settings.uiScale=finite(raw.settings.uiScale,'UI scale',.75,1.5);
    if(raw.settings.quality!==undefined){if(!['low','medium','high','ultra','auto'].includes(raw.settings.quality))throw new Error('Invalid quality setting.');save.settings.quality=raw.settings.quality;}
    if(raw.settings.keybindings!==undefined){
      if(!object(raw.settings.keybindings))throw new Error('Invalid key bindings.');
      const bindings={...DEFAULT_KEYS};
      for(const key of Object.keys(bindings))if(raw.settings.keybindings[key]!==undefined){const code=string(raw.settings.keybindings[key],'key binding',30);if(!/^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Space|Escape|Shift(Left|Right)|Control(Left|Right)|Alt(Left|Right)|Enter|Tab|Backspace)$/.test(code))throw new Error('Unsupported key binding.');bindings[key]=code;}
      if(new Set(Object.values(bindings)).size!==Object.keys(bindings).length)throw new Error('Key bindings must be unique.');
      if(Object.values(bindings).some(key=>/^Digit[1-4]$/.test(key)))throw new Error('Keys 1–4 are reserved for reward choices.');
      const arrowActions={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'};
      for(const [action,code] of Object.entries(bindings))if(arrowActions[code]&&arrowActions[code]!==action)throw new Error('Arrow keys are reserved for movement.');
      save.settings.keybindings=bindings;
    }
  }
  if(raw.customDifficulty!==undefined){
    if(!object(raw.customDifficulty))throw new Error('Invalid custom difficulty.');
    for(const [key,[min,max]] of Object.entries(CUSTOM_RANGES))if(raw.customDifficulty[key]!==undefined)save.customDifficulty[key]=finite(raw.customDifficulty[key],key,min,max);
    if(raw.customDifficulty.doubleBosses!==undefined)save.customDifficulty.doubleBosses=bool(raw.customDifficulty.doubleBosses,'double bosses');
  }
  for(const op of OPERATORS){
    if(raw.mastery!==undefined){if(!object(raw.mastery))throw new Error('Invalid mastery.');if(raw.mastery[op.id]!==undefined)save.mastery[op.id]=integer(raw.mastery[op.id],'mastery XP');}
    if(raw.operatorStats!==undefined){if(!object(raw.operatorStats))throw new Error('Invalid operator progress.');if(raw.operatorStats[op.id]!==undefined){if(!object(raw.operatorStats[op.id]))throw new Error('Invalid operator progress.');for(const key of ['encounters','bosses','wins'])if(raw.operatorStats[op.id][key]!==undefined)save.operatorStats[op.id][key]=integer(raw.operatorStats[op.id][key],key);}}
  }
  if(raw.unlocks!==undefined){if(!object(raw.unlocks))throw new Error('Invalid unlocks.');for(const key of ['act1','act2','campaign'])if(raw.unlocks[key]!==undefined)save.unlocks[key]=bool(raw.unlocks[key],key);}
  if(raw.achievements!==undefined){if(!object(raw.achievements)||Object.keys(raw.achievements).length>300)throw new Error('Invalid achievements.');for(const [key,value] of Object.entries(raw.achievements)){string(key,'achievement ID',100);if(typeof value!=='boolean'&&typeof value!=='number'&&typeof value!=='string')throw new Error('Invalid achievement.');save.achievements[key]=value;}}
  if(raw.stats!==undefined){if(!object(raw.stats))throw new Error('Invalid statistics.');for(const key of Object.keys(save.stats))if(raw.stats[key]!==undefined)save.stats[key]=finite(raw.stats[key],key);}
  if(raw.history!==undefined){if(!Array.isArray(raw.history))throw new Error('Invalid run history.');save.history=raw.history.slice(0,100).map(validateRunSummary);}
  if(raw.records!==undefined){
    if(!object(raw.records)||Object.keys(raw.records).length>600)throw new Error('Invalid records.');
    for(const [key,records] of Object.entries(raw.records)){string(key,'record category',180);if(!Array.isArray(records))throw new Error('Invalid record entries.');save.records[key]=records.slice(0,20).map(validateRunSummary);}
  }
  if(raw.completedRuns!==undefined){if(!Array.isArray(raw.completedRuns)||raw.completedRuns.length>2000)throw new Error('Invalid completed run ledger.');save.completedRuns=[...new Set(raw.completedRuns.map(id=>string(id,'run ID',160)))];}
  if(raw.lastRun!==undefined&&raw.lastRun!==null)save.lastRun=validateRunSummary(raw.lastRun);
  if(raw.legacyV4!==undefined&&raw.legacyV4!==null){if(!object(raw.legacyV4))throw new Error('Invalid legacy archive.');save.legacyV4=clone(raw.legacyV4);}
  if(raw.nexus!==undefined)save.nexus=normalizeNexus(raw.nexus);
  return save;
}

function validateRunSummary(raw) {
  if(!object(raw))throw new Error('Invalid run summary.');
  const copy=clone(raw);
  for(const key of ['id','operator','mode','difficulty','balanceVersion','outcome','cause','date'])if(copy[key]!==undefined)string(copy[key],key,key==='cause'?300:160);
  for(const key of ['score','duration','seconds','kills','elites','bosses','cores','masteryXp','actCompleted','completedActs','encounters','damageDealt','damageTaken','shieldAbsorbed'])if(copy[key]!==undefined)finite(copy[key],key);
  if(copy.operator!==undefined&&!idExists(OPERATORS,copy.operator))throw new Error('Unknown result operator.');
  if(copy.mode!==undefined&&!idExists(MODES,copy.mode))throw new Error('Unknown result mode.');
  return copy;
}

/** Legacy data is copied, never removed or overwritten at its original key. */
export function migrateV4(raw) {
  if(!object(raw)||!/^4(?:\.[12])?$/.test(String(raw.version)))throw new Error('This is not a V4 save.');
  safeTree(raw);
  const save=defaultSave();
  if(raw.cores!==undefined)save.cores=integer(raw.cores,'legacy cores');
  if(object(raw.progression))for(const node of CORE_NODES)if(raw.progression[node.id]!==undefined)save.progression[node.id]=integer(raw.progression[node.id],node.name,0,node.max);
  if(object(raw.selected)){
    if(idExists(OPERATORS,raw.selected.operator))save.selected.operator=raw.selected.operator;
    if(idExists(BIOMES,raw.selected.arena))save.selected.biome=raw.selected.arena;
    if(idExists(MODES,raw.selected.runMode))save.selected.mode=raw.selected.runMode;
  }
  if(object(raw.settings))for(const key of Object.keys(save.settings))if(key!=='keybindings'&&raw.settings[key]!==undefined)save.settings[key]=raw.settings[key];
  if(object(raw.achievements))save.achievements=Object.fromEntries(Object.entries(raw.achievements).map(([id,value])=>[id,object(value)?(Number.isFinite(value.at)?value.at:true):value]));
  if(object(raw.stats))for(const key of Object.keys(save.stats))if(raw.stats[key]!==undefined)save.stats[key]=raw.stats[key];
  save.legacyV4={history:Array.isArray(raw.history)?clone(raw.history.slice(0,100)):[],leaderboards:object(raw.leaderboards)?clone(raw.leaderboards):{},lastRun:object(raw.lastRun)?clone(raw.lastRun):null};
  return validateSave(save);
}

function localStore(){try{return globalThis.localStorage||null;}catch{return null;}}
export function loadSave() {
  const storage=localStore();if(!storage)return defaultSave();
  try {
    const current=storage.getItem(SAVE_KEY);
    if(current!==null)return validateSave(JSON.parse(current));
    const legacy=storage.getItem(LEGACY_KEY);
    if(legacy!==null){const migrated=migrateV4(JSON.parse(legacy));saveProfile(migrated);return migrated;}
  } catch(error) { console.warn('Saved profile could not be loaded; its original data has been preserved.',error.message); }
  return defaultSave();
}
export function saveProfile(raw) {
  const save=validateSave(raw);save.updatedAt=Math.max(Date.now(),save.updatedAt+1);
  const storage=localStore();if(storage)storage.setItem(SAVE_KEY,JSON.stringify(save));
  return save;
}
export function exportSave(raw){return JSON.stringify(validateSave(raw),null,2);}
export function importSave(text){
  if(typeof text!=='string'||text.length>MAX_IMPORT_BYTES)throw new Error('Import must be a V4/V5 save under 2 MB.');
  let raw;try{raw=JSON.parse(text);}catch{try{raw=JSON.parse(decodeURIComponent(escape(atob(text.trim()))));}catch{throw new Error('This file is not valid save JSON or a V4 export.');}}
  const save=/^4(?:\.[12])?$/.test(String(raw?.version))?migrateV4(raw):validateSave(raw);
  return saveProfile(save);
}

let databasePromise;
function openDatabase() {
  if(!globalThis.indexedDB)return Promise.resolve(null);
  if(!databasePromise)databasePromise=new Promise((resolve,reject)=>{
    const request=indexedDB.open('neon-rift-v5',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('state');
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error('Checkpoint storage is unavailable.'));
    request.onblocked=()=>reject(new Error('Close another game tab to enable checkpoint storage.'));
  });
  return databasePromise;
}
async function readJournal() {
  const db=await openDatabase();
  if(!db){const value=localStore()?.getItem(FALLBACK_CHECKPOINT_KEY);return value?JSON.parse(value):null;}
  return new Promise((resolve,reject)=>{const tx=db.transaction('state','readonly'),request=tx.objectStore('state').get('checkpoint');request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>reject(request.error);});
}
function validateCheckpoint(raw){
  if(!object(raw)||(raw.checkpointVersion!==5&&raw.version!==5))throw new Error('Checkpoint version is unsupported.');
  safeTree(raw);
  if(typeof raw.id!=='string'||!raw.id||raw.id.length>160)throw new Error('Checkpoint has no valid run ID.');
  if(!object(raw.player))throw new Error('Checkpoint has no player state.');
  return clone(raw);
}
/** Run and profile travel in one journal transaction, preventing half-committed encounter rewards. */
export async function saveCheckpoint(run,rawSave) {
  const checkpoint=validateCheckpoint(run),save=validateSave(rawSave);
  if(save.completedRuns.includes(checkpoint.id))throw new Error('A completed run cannot be checkpointed.');
  save.updatedAt=Math.max(Date.now(),save.updatedAt+1);
  const journal={run:checkpoint,profile:save,savedAt:save.updatedAt};
  const db=await openDatabase();
  if(db)await new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite');const store=tx.objectStore('state');store.put(journal,'checkpoint');store.put(save,'profile');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Checkpoint transaction was interrupted.'));});
  else {const storage=localStore();if(!storage)throw new Error('Checkpoint storage is unavailable.');storage.setItem(FALLBACK_CHECKPOINT_KEY,JSON.stringify(journal));}
  // Recovery reads the atomic journal if the browser closes before this mirror is written.
  localStore()?.setItem(SAVE_KEY,JSON.stringify(save));
  return checkpoint;
}
export async function loadCheckpoint() {
  const journal=await readJournal();if(!journal)return null;
  const run=validateCheckpoint(journal.run),profile=validateSave(journal.profile),current=loadSave();
  if(current.completedRuns.includes(run.id)||profile.completedRuns.includes(run.id))return null;
  if(profile.updatedAt>current.updatedAt)localStore()?.setItem(SAVE_KEY,JSON.stringify(profile));
  return run;
}
export async function clearCheckpoint() {
  const db=await openDatabase();
  if(db)await new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite');tx.objectStore('state').delete('checkpoint');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
  localStore()?.removeItem(FALLBACK_CHECKPOINT_KEY);
}

export function finishRun(rawSave,rawSummary) {
  const save=validateSave(rawSave),summary=validateRunSummary(rawSummary);
  if(!summary.id)throw new Error('Run completion requires a stable ID.');
  if(save.completedRuns.includes(summary.id))return save;
  summary.operator=summary.operator||'nova';summary.mode=summary.mode||'campaign';summary.difficulty=summary.difficulty||'standard';summary.balanceVersion=summary.balanceVersion||BALANCE_VERSION;
  summary.date=summary.date||new Date().toISOString();summary.duration=summary.duration??summary.seconds??0;
  const won=summary.outcome==='victory'||summary.outcome==='won';
  const encounters=summary.encounters||0;
  summary.cores=summary.mode==='training'?0:Math.floor(summary.cores??((summary.kills||0)/30+(summary.bosses||0)*8+(won?30:0)));
  summary.masteryXp=summary.mode==='training'?0:Math.floor(summary.masteryXp??(encounters*30+(summary.bosses||0)*75+(won?150:0)));
  save.completedRuns=[summary.id,...save.completedRuns].slice(0,2000);
  if(summary.mode==='training'){save.lastRun=summary;return validateSave(save);}
  save.cores+=summary.cores;save.mastery[summary.operator]+=summary.masteryXp;
  const operatorStats=save.operatorStats[summary.operator];operatorStats.encounters+=encounters;operatorStats.bosses+=summary.bosses||0;if(won&&summary.mode==='campaign')operatorStats.wins++;
  const completedActs=summary.completedActs??summary.actCompleted??0;
  if(summary.mode==='campaign'){
    if(completedActs>=1)save.unlocks.act1=true;
    if(completedActs>=2)save.unlocks.act2=true;
    if(won){save.unlocks.act1=true;save.unlocks.act2=true;save.unlocks.campaign=true;save.stats.campaignWins++;}
  }
  save.stats.runs++;save.stats.kills+=summary.kills||0;save.stats.elites+=summary.elites||0;save.stats.bosses+=summary.bosses||0;save.stats.seconds+=summary.duration;save.stats.coresEarned+=summary.cores;
  save.stats.mythics+=Array.isArray(summary.mythics)?summary.mythics.length:Number(summary.mythics)||0;
  save.stats.evos+=Array.isArray(summary.evolutions)?summary.evolutions.length:Number(summary.evos)||0;
  save.stats.bestScore=Math.max(save.stats.bestScore,summary.score||0);
  const day=summary.mode==='daily'?`:${String(summary.dailyDate||summary.date).slice(0,10)}`:'';
  const category=`${summary.coOp?'coop:':''}${summary.mode}:${summary.difficulty}:${summary.balanceVersion}${day}`;
  const previous=save.records[category]||[];
  summary.personalBest=(summary.score||0)>(previous[0]?.score??-1);
  save.records[category]=[summary,...previous].sort((a,b)=>(b.score||0)-(a.score||0)).slice(0,20);
  // A bounded number of dated Daily categories keeps long-lived profiles small.
  const categories=Object.keys(save.records);if(categories.length>600)for(const key of categories.slice(0,categories.length-600))delete save.records[key];
  save.history=[summary,...save.history].slice(0,100);save.lastRun=summary;
  save.achievements['first-run']=true;if(save.stats.bosses>=10)save.achievements['boss-hunter']=true;
  if(summary.duration>=600)save.achievements['ten-minute']=true;
  if((Array.isArray(summary.evolutions)?summary.evolutions.length:summary.evos||0)>=3)save.achievements['evo-master']=true;
  if(save.stats.mythics>=1)save.achievements.mythic=true;
  if(summary.mode==='ascension'&&(summary.bosses||0)>=3)save.achievements.ascended=true;
  if(summary.biome==='final-rift')save.achievements['final-rift']=true;
  if((summary.score||0)>=1000000)save.achievements.million=true;
  if(won&&summary.mode==='campaign')save.achievements.riftfall=true;
  for(const operator of OPERATORS)for(const quest of operator.quests)if(save.operatorStats[operator.id][quest.stat]>=quest.target)save.achievements[quest.id]=true;
  save.nexus=awardNexus(save.nexus,summary);
  return validateSave(save);
}

export function getMastery(rawXp=0) {
  const xp=Math.max(0,Number(rawXp)||0), thresholds=[0,100,250,450,700,1000,1400,1900,2500,3200];
  let index=0;while(index<9&&xp>=thresholds[index+1])index++;
  return {level:index+1,xp,title:titleNames[index],current:thresholds[index],next:index<9?thresholds[index+1]:null,progress:index===9?1:(xp-thresholds[index])/(thresholds[index+1]-thresholds[index]),cosmetic:index>=8?'Sovereign trail':index>=5?'Prismatic trail':index>=2?'Signal trail':'Standard trail'};
}
export function isOperatorUnlocked(save,id,mode=save?.selected?.mode) {
  if(!idExists(OPERATORS,id))return false;
  if(mode==='training')return true;
  if(id==='nyx')return !!save?.unlocks?.act1;
  if(id==='echo')return !!save?.unlocks?.act2;
  if(id==='cryo')return !!save?.unlocks?.campaign;
  return true;
}

function validateBuild(raw) {
  if(!object(raw))throw new Error('Invalid build.');safeTree(raw);
  const build={version:1,operator:raw.operator||'nova',weapons:[],passives:[],relics:[]};
  if(!idExists(OPERATORS,build.operator))throw new Error('Unknown operator in build.');
  if(raw.classId!==undefined){if(!['assault','vanguard','velocity'].includes(raw.classId))throw new Error('Unknown class in build.');build.classId=raw.classId;}
  if(raw.subclass){const classes={striker:'assault',demolisher:'assault',bastion:'vanguard',siphon:'vanguard',blink:'velocity',ranger:'velocity'};if(classes[raw.subclass]!==build.classId)throw new Error('Subclass does not match this build.');build.subclass=raw.subclass;}
  for(const [key,list,max] of [['weapons',WEAPONS,6],['passives',PASSIVES,6],['relics',RELICS,3]]){
    const values=raw[key]??[];if(!Array.isArray(values)||values.length>max)throw new Error(`A build supports at most ${max} ${key}.`);
    if(new Set(values).size!==values.length||values.some(id=>typeof id!=='string'||!idExists(list,id)))throw new Error(`Unknown or duplicate ${key}.`);
    build[key]=[...values];
  }
  return build;
}
function checksum(text){let hash=2166136261;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}return(hash>>>0).toString(36);}
export function encodeBuild(raw) {const text=JSON.stringify(validateBuild(raw));const payload=btoa(text).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');return`NR5.${payload}.${checksum(text)}`;}
export function decodeBuild(code) {
  if(typeof code!=='string'||code.length>8192)throw new Error('Invalid build code.');
  const parts=code.trim().split('.');if(parts.length!==3||parts[0]!=='NR5')throw new Error('Use a V5 build code beginning with NR5.');
  let text,raw;try{text=atob(parts[1].replaceAll('-','+').replaceAll('_','/'));raw=JSON.parse(text);}catch{throw new Error('The build code is damaged.');}
  if(checksum(text)!==parts[2]||raw.version!==1)throw new Error('The build code checksum or version is invalid.');
  return validateBuild(raw);
}

