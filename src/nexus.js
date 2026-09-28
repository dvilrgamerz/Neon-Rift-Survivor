import { WEAPONS, PASSIVES, RELICS, BIOMES, OPERATORS, BALANCE_VERSION } from './content.js';

const DAY = 86400000;
export const SEASON_EPOCH = Date.UTC(2026, 8, 14);
export const CLASS_DEFINITIONS = [
  {id:'assault',name:'Assault',description:'+12% damage · −8% maximum HP',modifiers:{damage:1.12,maxHp:.92}},
  {id:'vanguard',name:'Vanguard',description:'+18% maximum HP · +5% armor · −10% speed',modifiers:{maxHp:1.18,armor:.05,speed:.9}},
  {id:'velocity',name:'Velocity',description:'+15% speed · −12% damage',modifiers:{speed:1.15,damage:.88}},
];
export const SUBCLASSES = [
  {id:'striker',classId:'assault',name:'Striker',description:'+10% critical chance · −5% armor',modifiers:{crit:.1,armor:-.05}},
  {id:'demolisher',classId:'assault',name:'Demolisher',description:'+20% area · −10% projectile speed',modifiers:{area:1.2,projectileSpeed:.9}},
  {id:'bastion',classId:'vanguard',name:'Bastion',description:'+20 shield · −8% speed',modifiers:{shield:20,speed:.92}},
  {id:'siphon',classId:'vanguard',name:'Siphon',description:'0.5% lifesteal · −10% maximum HP',modifiers:{lifesteal:.005,maxHp:.9}},
  {id:'blink',classId:'velocity',name:'Blink',description:'+1 dash charge · −8% maximum HP',modifiers:{dashCharges:1,maxHp:.92}},
  {id:'ranger',classId:'velocity',name:'Ranger',description:'+20% projectile speed · −8% area',modifiers:{projectileSpeed:1.2,area:.92}},
];
export const TUTORIAL_STEPS = [
  {id:'move',title:'Find your feet',text:'Move with WASD or the left stick. On touch, drag the left side of the arena.',action:'move'},
  {id:'fire',title:'Let the build work',text:'Weapons fire automatically. Keep enemies in reach and leave yourself an escape route.',action:'kill'},
  {id:'dash',title:'Cross the danger',text:'Press Space, LB, or Dash. Two charges recover over time; the first instant protects you.',action:'dash'},
  {id:'ability',title:'Your signature move',text:'Press E, RB, or Ability to activate your operator skill. Watch its cooldown.',action:'ability'},
  {id:'reward',title:'Make a build',text:'Choose upgrades by clicking, pressing 1–4, or using D-pad and A. Match a level-five weapon with its evolution passive.',action:'reward'},
  {id:'route',title:'Choose your crossing',text:'Read objectives before entering. Between encounters, inspect your build or save and leave.',action:'encounter-complete'},
];
export const WEEKLY_CATALOG = [
  {id:'swarm',name:'Signal sweep',description:'Defeat 500 enemies.',stat:'kills',target:500},
  {id:'elites',name:'Priority targets',description:'Defeat 12 elites.',stat:'elites',target:12},
  {id:'bosses',name:'Break the circuit',description:'Defeat 5 bosses.',stat:'bosses',target:5},
  {id:'damage',name:'Overload',description:'Deal 250,000 weapon damage.',stat:'damageDealt',target:250000},
  {id:'dash',name:'Never stand still',description:'Use dash 60 times.',stat:'dashes',target:60},
  {id:'evolutions',name:'Beyond the blueprint',description:'Evolve 4 weapons.',stat:'evolutions',target:4},
  {id:'survival',name:'Long-range signal',description:'Survive for 30 minutes across runs.',stat:'duration',target:1800},
  {id:'victories',name:'Three crossings',description:'Win 3 expeditions.',stat:'wins',target:3},
];
export const ACHIEVEMENTS = [
  {id:'first-signal',name:'First signal',description:'Finish your first scored run.'},
  {id:'hundred',name:'Hundred strong',description:'Defeat 100 enemies in one run.'},
  {id:'boss-breaker',name:'Boss breaker',description:'Defeat a boss.'},
  {id:'evolved',name:'Beyond limits',description:'Evolve a weapon.'},
  {id:'full-build',name:'Full spectrum',description:'Carry six weapons in one run.'},
  {id:'riftwalker',name:'Riftwalker',description:'Complete the campaign.'},
  {id:'unbroken',name:'Unbroken',description:'Complete three encounters without taking HP damage.'},
  {id:'cartographer',name:'Cartographer',description:'Discover all eight biomes.'},
  {id:'collector',name:'Relic keeper',description:'Discover twelve relics.'},
  {id:'veteran',name:'Veteran signal',description:'Complete twenty scored runs.'},
  {id:'weapon-adept',name:'Weapon adept',description:'Reach 500 mastery XP with one weapon.'},
  {id:'nexus-icon',name:'Nexus icon',description:'Earn 10,000 profile XP.'},
];
export const LORE = [
  {id:'signal',name:'01 / The first signal',requirement:'Finish a run',text:'The city went silent at 03:17. Every screen showed the same waveform. You were the first to answer.'},
  {id:'roots',name:'02 / A living circuit',requirement:'Complete act one',text:'Beneath the concrete, roots carry packets of light. Something inside the rift is learning the shape of our world.'},
  {id:'choir',name:'03 / The missing frequency',requirement:'Complete act two',text:'The cathedral does not echo. It listens. Each defeated machine leaves a note in a song no human wrote.'},
  {id:'sovereign',name:'04 / On the other side',requirement:'Win the campaign',text:'The Sovereign was guarding a door. Beyond it: a thousand cities, a thousand signals, and one familiar voice calling your name.'},
];
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const clone = value => JSON.parse(JSON.stringify(value));
const clean = (value, limit = 160) => { if(typeof value !== 'string' || value.length > limit)throw new Error('Invalid Nexus text.');return value; };
const number = (value, max = 1e12) => { if(typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max)throw new Error('Invalid Nexus number.');return value; };
const count = value => Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0);
const ids = (value, definitions, max = 100) => { if(!Array.isArray(value) || value.length > max)throw new Error('Invalid Nexus collection.');return [...new Set(value.map(id=>{clean(id);if(definitions && !definitions.some(d=>d.id===id))throw new Error('Unknown Nexus item.');return id;}))]; };
const keys = value => Array.isArray(value) ? value.map(item=>typeof item==='string'?item:item.id) : object(value) ? Object.keys(value) : [];
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const fmt = value => `${Math.floor(count(value)/60)}:${String(Math.floor(count(value)%60)).padStart(2,'0')}`;
const nice = value => Math.round(count(value)).toLocaleString('en-US');
const nameOf = (definitions,id) => definitions.find(d=>d.id===id)?.name || id || '—';

export function getNexusDefaults() {
  return {version:1,xp:0,awardedRuns:[],weaponMastery:{},discoveries:{weapons:[],passives:[],relics:[],biomes:[],bosses:[],evolutions:[]},achievements:[],lore:[],favoriteBuilds:[],ghosts:[],seasons:{},weekly:{},tutorial:{step:0,complete:false},cosmetics:{equipped:'standard',unlocked:['standard']}};
}
function validateBuild(raw) {
  if(!object(raw))throw new Error('Invalid favorite build.');
  return {id:clean(raw.id),name:clean(raw.name || 'Saved build',80),operator:ids([raw.operator || 'nova'],OPERATORS,1)[0],weapons:ids(keys(raw.weapons),WEAPONS,6),passives:ids(keys(raw.passives),PASSIVES,6),relics:ids(raw.relics || [],RELICS,3),classId:CLASS_DEFINITIONS.some(c=>c.id===raw.classId)?raw.classId:'assault',subclass:SUBCLASSES.some(c=>c.id===raw.subclass)?raw.subclass:null};
}
export function normalizeNexus(raw) {
  if(raw == null)return getNexusDefaults();
  if(!object(raw))throw new Error('Invalid Nexus profile.');
  const result=getNexusDefaults();
  if(raw.version!==undefined && raw.version!==1)throw new Error('Unsupported Nexus profile version.');
  if(raw.xp!==undefined)result.xp=number(raw.xp);
  if(raw.awardedRuns!==undefined)result.awardedRuns=ids(raw.awardedRuns,null,2000);
  if(raw.weaponMastery!==undefined){if(!object(raw.weaponMastery))throw new Error('Invalid weapon mastery.');for(const [id,xp] of Object.entries(raw.weaponMastery)){if(!WEAPONS.some(w=>w.id===id))throw new Error('Unknown mastery weapon.');result.weaponMastery[id]=number(xp);}}
  if(raw.discoveries!==undefined){if(!object(raw.discoveries))throw new Error('Invalid discoveries.');for(const [key,defs] of [['weapons',WEAPONS],['passives',PASSIVES],['relics',RELICS],['biomes',BIOMES],['bosses',BIOMES.map(b=>b.boss)],['evolutions',WEAPONS]])if(raw.discoveries[key]!==undefined)result.discoveries[key]=ids(raw.discoveries[key],defs);}
  if(raw.achievements!==undefined)result.achievements=ids(raw.achievements,ACHIEVEMENTS,100);
  if(raw.lore!==undefined)result.lore=ids(raw.lore,LORE,20);
  if(raw.favoriteBuilds!==undefined){if(!Array.isArray(raw.favoriteBuilds)||raw.favoriteBuilds.length>8)throw new Error('Save up to eight favorite builds.');result.favoriteBuilds=raw.favoriteBuilds.map(validateBuild);if(new Set(result.favoriteBuilds.map(b=>b.id)).size!==result.favoriteBuilds.length)throw new Error('Duplicate favorite build.');}
  if(raw.ghosts!==undefined){if(!Array.isArray(raw.ghosts)||raw.ghosts.length>5)throw new Error('Save up to five ghosts.');result.ghosts=raw.ghosts.map(validateGhost);}
  for(const [key,limit] of [['seasons',24],['weekly',96]]){
    if(raw[key]===undefined)continue;if(!object(raw[key])||Object.keys(raw[key]).length>limit)throw new Error('Nexus history is too large.');
    for(const [id,value] of Object.entries(raw[key])){
      if(!/^nexus-\d+(-w[1-8])?$/.test(id)||!object(value))throw new Error('Invalid season.');
      if(key==='seasons')result[key][id]={xp:number(value.xp||0),runs:number(value.runs||0),wins:number(value.wins||0),bestScore:number(value.bestScore||0)};
      else {const progress={};for(const item of WEEKLY_CATALOG)if(value.progress?.[item.id]!==undefined)progress[item.id]=number(value.progress[item.id]);result[key][id]={progress,claimed:ids(value.claimed||[],WEEKLY_CATALOG,8)};}
    }
  }
  if(raw.tutorial!==undefined){if(!object(raw.tutorial)||typeof raw.tutorial.complete!=='boolean')throw new Error('Invalid tutorial.');result.tutorial={step:Math.floor(number(raw.tutorial.step,6)),complete:raw.tutorial.complete};}
  if(raw.cosmetics!==undefined){if(!object(raw.cosmetics))throw new Error('Invalid cosmetics.');const unlocked=ids(raw.cosmetics.unlocked||['standard'],null,1000);if(unlocked.some(id=>!/^standard$|^trail-(mint|violet|gold)$|^weapon-[a-z0-9-]+$|^season-\d+-\d+$/.test(id)))throw new Error('Unknown cosmetic.');const equipped=clean(raw.cosmetics.equipped||'standard');if(!unlocked.includes(equipped))throw new Error('Cosmetic is locked.');result.cosmetics={equipped,unlocked};}
  return result;
}

export function getSeason(now = Date.now()) {
  const timestamp=now instanceof Date?now.getTime():typeof now==='string'?Date.parse(now):now;
  if(!Number.isFinite(timestamp))throw new Error('Invalid season date.');
  const index=Math.max(0,Math.floor((timestamp-SEASON_EPOCH)/(56*DAY)));
  const start=SEASON_EPOCH+index*56*DAY;
  const week=Math.max(1,Math.min(8,Math.floor((timestamp-start)/(7*DAY))+1));
  const id=`nexus-${index+1}`;
  return {id,index:index+1,name:`Season ${index+1} · Rift Nexus`,startsAt:new Date(start).toISOString(),endsAt:new Date(start+56*DAY).toISOString(),week,weekId:`${id}-w${week}`,weekEndsAt:new Date(start+week*7*DAY).toISOString()};
}
export function getWeeklyChallenges(now = Date.now()) {
  const season=getSeason(now),offset=((season.index-1)*8+season.week-1)*3;
  return [0,1,2].map((_,i)=>{const challenge=WEEKLY_CATALOG[(offset+i)%WEEKLY_CATALOG.length];return {...challenge,templateId:challenge.id,id:`${season.weekId}:${challenge.id}`,weekId:season.weekId,seasonId:season.id,rewardXp:100+i*50,endsAt:season.weekEndsAt};});
}
export function getRunQuests(config = {}) {
  const operator=OPERATORS.find(op=>op.id===config.operator)||OPERATORS[0];
  return [
    {id:'run-hunter',name:'Clear the signal',description:'Defeat 100 enemies this run.',stat:'kills',target:100,reward:'50 season XP'},
    {id:'run-specialist',name:`${operator.name} online`,description:'Use your operator ability three times.',stat:'abilities',target:3,reward:'50 season XP'},
    config.mode==='campaign'?{id:'run-crossing',name:'The next crossing',description:'Complete five encounters.',stat:'encounters',target:5,reward:'75 season XP'}:{id:'run-survivor',name:'Hold the line',description:'Survive for five minutes.',stat:'duration',target:300,reward:'75 season XP'},
  ];
}
export function validateClassSelection(classId='assault',subclass=null,nexus=getNexusDefaults(),mode='campaign') {
  if(mode==='daily')return {classId:'assault',subclass:null};
  if(!CLASS_DEFINITIONS.some(c=>c.id===classId))throw new Error('Unknown class.');
  if(subclass){const sub=SUBCLASSES.find(s=>s.id===subclass);if(!sub||sub.classId!==classId)throw new Error('Subclass does not match this class.');if(normalizeNexus(nexus).xp<2000 && mode!=='training')throw new Error('Subclasses unlock at profile level 5.');}
  return {classId,subclass:subclass||null};
}
function metric(summary,stat) {
  if(stat==='wins')return summary.outcome==='victory'?1:0;
  if(stat==='duration')return count(summary.duration??summary.seconds);
  if(stat==='evolutions')return Array.isArray(summary.evolutions)?summary.evolutions.length:Array.isArray(summary.evolved)?summary.evolved.length:count(summary.evolutions??summary.stats?.evolutions);
  return count(summary[stat]??summary.stats?.[stat]);
}
function trimObject(value,limit){const entries=Object.entries(value);return Object.fromEntries(entries.slice(-limit));}
export function awardNexus(raw,summary) {
  const nexus=normalizeNexus(raw);
  if(!object(summary))throw new Error('Invalid run summary.');
  const id=clean(summary.id||summary.runId||'');
  if(!id)throw new Error('Run ID required to award Nexus progress.');
  if(nexus.awardedRuns.includes(id)||summary.mode==='training')return nexus;
  nexus.awardedRuns=[...nexus.awardedRuns,id].slice(-2000);
  const date=summary.date||summary.endedAt||Date.now(),season=getSeason(date);
  const xp=Math.min(2000,25+Math.floor(metric(summary,'kills')/10)+metric(summary,'bosses')*30+metric(summary,'encounters')*15+(summary.outcome==='victory'?100:0));
  nexus.xp+=xp;
  const seasonProgress=nexus.seasons[season.id]||{xp:0,runs:0,wins:0,bestScore:0};
  seasonProgress.xp+=xp;seasonProgress.runs++;seasonProgress.wins+=metric(summary,'wins');seasonProgress.bestScore=Math.max(seasonProgress.bestScore,count(summary.score));
  const weekly=nexus.weekly[season.weekId]||{progress:{},claimed:[]};
  for(const challenge of getWeeklyChallenges(date)){
    const key=challenge.templateId;weekly.progress[key]=Math.min(challenge.target,(weekly.progress[key]||0)+metric(summary,challenge.stat));
    if(weekly.progress[key]>=challenge.target&&!weekly.claimed.includes(key)){weekly.claimed.push(key);seasonProgress.xp+=challenge.rewardXp;}
  }
  for(const quest of getRunQuests(summary))if(metric(summary,quest.stat)>=quest.target)seasonProgress.xp+=parseInt(quest.reward,10);
  nexus.seasons[season.id]=seasonProgress;nexus.weekly[season.weekId]=weekly;
  nexus.seasons=trimObject(nexus.seasons,24);nexus.weekly=trimObject(nexus.weekly,96);
  const merge=(key,list,definitions)=>{nexus.discoveries[key]=[...new Set([...nexus.discoveries[key],...list.filter(id=>definitions.some(d=>d.id===id))])];};
  merge('weapons',keys(summary.weapons),WEAPONS);merge('passives',keys(summary.passives),PASSIVES);merge('relics',summary.relics||[],RELICS);
  merge('biomes',summary.visitedBiomes||summary.biomes||(summary.biome?[summary.biome]:[]),BIOMES);
  merge('bosses',summary.bossIds||[],BIOMES.map(b=>b.boss));merge('evolutions',Array.isArray(summary.evolutions)?summary.evolutions:summary.evolved||[],WEAPONS);
  for(const [weapon,damage] of Object.entries(summary.damageByWeapon||{}))if(WEAPONS.some(w=>w.id===weapon)){nexus.weaponMastery[weapon]=(nexus.weaponMastery[weapon]||0)+Math.min(500,Math.floor(count(damage)/100)+5);if(nexus.weaponMastery[weapon]>=500)nexus.cosmetics.unlocked.push(`weapon-${weapon}`);}
  const achievements={'first-signal':true,hundred:metric(summary,'kills')>=100,'boss-breaker':metric(summary,'bosses')>0,evolved:metric(summary,'evolutions')>0,'full-build':keys(summary.weapons).length>=6,riftwalker:summary.mode==='campaign'&&summary.outcome==='victory',unbroken:metric(summary,'encounters')>=3&&metric(summary,'damageTaken')===0,cartographer:nexus.discoveries.biomes.length===8,collector:nexus.discoveries.relics.length>=12,veteran:nexus.awardedRuns.length>=20,'weapon-adept':Object.values(nexus.weaponMastery).some(xp=>xp>=500),'nexus-icon':nexus.xp>=10000};
  nexus.achievements=[...new Set([...nexus.achievements,...Object.keys(achievements).filter(id=>achievements[id])])];
  const acts=count(summary.completedActs??summary.actCompleted??summary.completedAct);
  nexus.lore=[...new Set([...nexus.lore,'signal',...(acts>=1?['roots']:[]),...(acts>=2?['choir']:[]),...(achievements.riftwalker?['sovereign']:[])])];
  if(nexus.xp>=500)nexus.cosmetics.unlocked.push('trail-mint');if(nexus.xp>=2000)nexus.cosmetics.unlocked.push('trail-violet');if(nexus.xp>=10000)nexus.cosmetics.unlocked.push('trail-gold');
  for(let tier=1;tier<=Math.min(10,Math.floor(seasonProgress.xp/500));tier++)nexus.cosmetics.unlocked.push(`season-${season.index}-${tier}`);
  nexus.cosmetics.unlocked=[...new Set(nexus.cosmetics.unlocked)];
  return normalizeNexus(nexus);
}
export function favoriteBuild(raw,summary) {
  const nexus=normalizeNexus(raw),id=clean(summary.id||summary.runId||'');
  if(!id)throw new Error('Run ID required.');if(nexus.favoriteBuilds.some(b=>b.id===id))return nexus;
  if(nexus.favoriteBuilds.length>=8)throw new Error('Eight builds are saved. Remove one before adding another.');
  nexus.favoriteBuilds.push(validateBuild({...summary,id,name:summary.name||`${nameOf(OPERATORS,summary.operator)} · ${nice(summary.score)} points`}));return nexus;
}
export function removeFavorite(raw,id){const nexus=normalizeNexus(raw);nexus.favoriteBuilds=nexus.favoriteBuilds.filter(build=>build.id!==id);return nexus;}

export function recordGhostSample(samples,run) {
  const output=Array.isArray(samples)?samples.map(sample=>({...sample})):[];
  const sample={time:count(run.time),score:Math.round(count(run.score)),kills:Math.round(count(run.kills))};
  if(output.length&&sample.time-output.at(-1).time<10)return output;
  if(output.length>=120){const decimated=output.filter((_,i)=>i%2===0);return [...decimated,sample];}
  return [...output,sample];
}
function validateGhost(raw) {
  if(!object(raw)||raw.version!==1)throw new Error('Unsupported ghost code.');
  const ghost={version:1,id:clean(raw.id),name:clean(raw.name||'Rift ghost',80),mode:clean(raw.mode,40),difficulty:clean(raw.difficulty||'standard',40),balanceVersion:clean(raw.balanceVersion||BALANCE_VERSION,40),operator:ids([raw.operator||'nova'],OPERATORS,1)[0],duration:number(raw.duration,86400),score:number(raw.score),kills:number(raw.kills),samples:[]};
  if(!['campaign','endless','expedition','daily','ascension','training','coop'].includes(ghost.mode))throw new Error('Unknown ghost mode.');
  if(!Array.isArray(raw.samples)||raw.samples.length>120||!raw.samples.length)throw new Error('Ghost requires 1–120 samples.');
  let lastTime=-1,lastScore=-1,lastKills=-1;
  for(const point of raw.samples){if(!object(point))throw new Error('Invalid ghost sample.');const sample={time:number(point.time,86400),score:number(point.score),kills:number(point.kills)};if(sample.time<=lastTime||sample.time>ghost.duration||sample.score<lastScore||sample.kills<lastKills||sample.score>ghost.score||sample.kills>ghost.kills)throw new Error('Ghost samples are not ordered.');ghost.samples.push(sample);lastTime=sample.time;lastScore=sample.score;lastKills=sample.kills;}
  return ghost;
}
export function encodeGhost(summary) {
  const duration=count(summary.duration??summary.seconds??summary.time),score=count(summary.score),kills=count(summary.kills);
  let samples=[summary.ghostSamples,summary.replaySnapshots,summary.samples].find(value=>Array.isArray(value)&&value.length)||[];
  if(!samples.length)samples=duration>0?[{time:0,score:0,kills:0},{time:duration,score,kills}]:[{time:0,score,kills}];
  const ghost=validateGhost({version:1,id:summary.id||summary.runId||'local-ghost',name:summary.name||`${nameOf(OPERATORS,summary.operator)} · ${nice(score)}`,operator:summary.operator||'nova',mode:summary.mode||'campaign',difficulty:summary.difficulty||'standard',balanceVersion:summary.balanceVersion||BALANCE_VERSION,duration,score,kills,samples});
  const bytes=new TextEncoder().encode(JSON.stringify(ghost));let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
  return 'NRG1.'+btoa(binary).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
export function decodeGhost(text) {
  if(typeof text!=='string'||text.length>40000||!/^NRG1\.[A-Za-z0-9_-]+$/.test(text.trim()))throw new Error('Paste a valid Rift ghost code under 40 KB.');
  try{const binary=atob(text.trim().slice(5).replaceAll('-','+').replaceAll('_','/'));const bytes=Uint8Array.from(binary,char=>char.charCodeAt(0));return validateGhost(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));}catch(error){throw new Error(`Invalid ghost: ${error.message}`);}
}
export function benchmarkGhost(raw,time) {
  const ghost=validateGhost(raw),t=Math.max(0,Math.min(count(time),ghost.duration));
  let previous={time:0,score:0,kills:0};
  for(const next of ghost.samples){if(next.time>=t){const ratio=next.time===previous.time?1:(t-previous.time)/(next.time-previous.time);return {time:t,score:Math.round(previous.score+(next.score-previous.score)*ratio),kills:Math.round(previous.kills+(next.kills-previous.kills)*ratio),finished:time>=ghost.duration};}previous=next;}
  const ratio=ghost.duration===previous.time?1:(t-previous.time)/(ghost.duration-previous.time);
  return {time:t,score:Math.round(previous.score+(ghost.score-previous.score)*ratio),kills:Math.round(previous.kills+(ghost.kills-previous.kills)*ratio),finished:time>=ghost.duration};
}
export function getProfileView(save) {
  const nexus=normalizeNexus(save?.nexus),level=Math.min(100,1+Math.floor(nexus.xp/500));
  return {nexus,level,xp:nexus.xp,nextLevelXp:level>=100?null:level*500,levelProgress:level>=100?1:(nexus.xp%500)/500,title:level>=21?'Nexus Icon':level>=10?'Rift Veteran':level>=5?'Pathfinder':'Signal Runner',subclassesUnlocked:nexus.xp>=2000,achievementCount:nexus.achievements.length,discoveryCount:Object.values(nexus.discoveries).reduce((sum,list)=>sum+list.length,0),weaponMastery:WEAPONS.map(weapon=>({...weapon,xp:nexus.weaponMastery[weapon.id]||0,level:Math.min(10,1+Math.floor((nexus.weaponMastery[weapon.id]||0)/100)),cosmeticUnlocked:(nexus.weaponMastery[weapon.id]||0)>=500})),stats:save?.stats||{}};
}

const action = (id,label,value='',extra='') => `<button data-nexus-action="${id}"${value?` data-id="${escapeHTML(value)}"`:''} ${extra}>${label}</button>`;
const metricCard=(label,value)=>`<div class="stat"><b>${escapeHTML(value)}</b><small>${escapeHTML(label)}</small></div>`;
const progressBar=(value,max)=>`<div class="bar"><i style="width:${Math.max(0,Math.min(100,count(value)/Math.max(1,max)*100))}%"></i></div>`;
function buildHTML(run) {
  return `<div class="nexus-build"><h3>${escapeHTML(nameOf(OPERATORS,run.operator))} <small>${escapeHTML(run.classId||'assault')}${run.subclass?' / '+escapeHTML(run.subclass):''}</small></h3>${[['Weapons',WEAPONS,run.weapons],['Passives',PASSIVES,run.passives],['Relics',RELICS,run.relics]].map(([label,defs,value])=>`<p><b>${label}</b><br>${keys(value).map(id=>escapeHTML(nameOf(defs,id))+(object(value)?` · Lv ${escapeHTML(value[id])}`:'')).join(' · ')||'None'}</p>`).join('')}<p><b>Evolutions</b><br>${keys(run.evolutions||run.evolved||[]).map(id=>escapeHTML(WEAPONS.find(w=>w.id===id)?.evolution?.name||nameOf(WEAPONS,id))).join(' · ')||'None'}</p></div>`;
}
/** HTML fragments use the app's existing panel/grid styles. All user text is escaped. */
export function renderNexusPage(page,save,options={}) {
  const profile=getProfileView(save),nexus=profile.nexus,now=options.now??Date.now();
  if(page==='lore')return `<section class="panel"><div class="eyebrow">ARCHIVED TRANSMISSIONS</div><h2>The other side is calling.</h2><p class="muted">${nexus.lore.length} of ${LORE.length} story signals recovered. Progress through the campaign to hear the whole transmission.</p><div class="settings-grid">${LORE.map(lore=>`<article class="panel"><small>${nexus.lore.includes(lore.id)?'SIGNAL RECOVERED':escapeHTML(lore.requirement).toUpperCase()}</small><h3>${escapeHTML(lore.name)}</h3><p class="${nexus.lore.includes(lore.id)?'':'muted'}">${nexus.lore.includes(lore.id)?escapeHTML(lore.text):'The signal is fragmented. Keep crossing.'}</p></article>`).join('')}</div></section>`;
  if(page==='tutorial')return `<section class="panel"><div class="eyebrow">FIELD MANUAL / FIRST CONTACT</div><h2>${nexus.tutorial.complete?'You are ready for the rift.':'Every survivor starts here.'}</h2><p class="muted">Learn one system at a time. Your field training also advances as you play.</p>${progressBar(nexus.tutorial.step,TUTORIAL_STEPS.length)}<div class="settings-grid">${TUTORIAL_STEPS.map((step,index)=>`<article class="panel ${index<nexus.tutorial.step?'compatible':''}"><small>${index<nexus.tutorial.step?'✓ COMPLETE':String(index+1).padStart(2,'0')}</small><h3>${escapeHTML(step.title)}</h3><p>${escapeHTML(step.text)}</p></article>`).join('')}</div><div class="controls">${nexus.tutorial.complete?'':action('tutorial-next',`Mark step ${Math.min(6,nexus.tutorial.step+1)} as read`)}${action('tutorial-reset','Restart field manual')}</div></section>`;
  if(page==='profile')return `<section class="panel"><div class="eyebrow">YOUR LOCAL NEXUS PROFILE</div><h2>${escapeHTML(profile.title)} <small>Level ${profile.level}</small></h2><p class="muted">${nice(profile.xp)} profile XP · ${profile.subclassesUnlocked?'All class specializations unlocked':'Subclasses unlock at level 5 / 2,000 XP'}</p>${progressBar(profile.xp%500,500)}<div class="summary-grid">${metricCard('Runs',nice(save.stats?.runs))}${metricCard('Best score',nice(save.stats?.bestScore))}${metricCard('Discoveries',profile.discoveryCount)}${metricCard('Achievements',`${profile.achievementCount} / ${ACHIEVEMENTS.length}`)}</div></section><section class="panel"><h3>Weapon mastery</h3><p class="muted">Damage earns mastery. Level six unlocks a weapon signature; mastery adds no combat power.</p><div class="settings-grid">${profile.weaponMastery.map(w=>`<div><b>${escapeHTML(w.name)}</b><small> · Lv ${w.level} · ${nice(w.xp)} XP ${w.cosmeticUnlocked?'✦ Signature unlocked':''}</small>${progressBar(w.xp%100,100)}</div>`).join('')}</div></section><section class="panel"><h3>Your signatures</h3><div class="tabs">${nexus.cosmetics.unlocked.map(id=>action('equip-cosmetic',escapeHTML(id.replaceAll('-',' ')),id,nexus.cosmetics.equipped===id?'class="active" aria-pressed="true"':'aria-pressed="false"')).join('')}</div></section><section class="panel"><h3>Favorite builds · ${nexus.favoriteBuilds.length}/8</h3>${nexus.favoriteBuilds.length?`<div class="settings-grid">${nexus.favoriteBuilds.map(build=>`<article>${buildHTML(build)}<div class="controls">${action('use-favorite','Open in Build Lab',build.id)}${action('remove-favorite','Remove',build.id)}</div></article>`).join('')}</div>`:'<p class="muted">Save a completed run from History to keep its build here.</p>'}</section><section class="panel"><h3>Signals from beyond</h3>${LORE.map(lore=>`<details ${nexus.lore.includes(lore.id)?'':'class="muted"'}><summary>${escapeHTML(lore.name)} · ${nexus.lore.includes(lore.id)?'Recovered':escapeHTML(lore.requirement)}</summary><p>${nexus.lore.includes(lore.id)?escapeHTML(lore.text):'This signal has not been recovered.'}</p></details>`).join('')}</section>`;
  if(page==='seasons'){
    const season=getSeason(now),progress=nexus.seasons[season.id]||{xp:0,runs:0,wins:0,bestScore:0},weekly=nexus.weekly[season.weekId]||{progress:{},claimed:[]};
    return `<section class="panel"><div class="eyebrow">EIGHT WEEKS / ONE NEW SIGNAL</div><h2>${escapeHTML(season.name)}</h2><p class="muted">Week ${season.week} of 8 · Ends ${season.endsAt.slice(0,10)} UTC · Local progress, cosmetic rewards</p><div class="summary-grid">${metricCard('Season XP',nice(progress.xp))}${metricCard('Runs',nice(progress.runs))}${metricCard('Victories',nice(progress.wins))}${metricCard('Best score',nice(progress.bestScore))}</div></section><section class="panel"><h3>Weekly challenges</h3><p class="muted">Resets ${season.weekEndsAt.slice(0,10)} at 00:00 UTC. Training does not award progress.</p><div class="choice-grid">${getWeeklyChallenges(now).map(q=>`<article class="choice"><small>${weekly.claimed.includes(q.templateId)?'COMPLETED':`+${q.rewardXp} SEASON XP`}</small><h3>${escapeHTML(q.name)}</h3><p>${escapeHTML(q.description)}</p>${progressBar(weekly.progress[q.templateId]||0,q.target)}<small>${nice(weekly.progress[q.templateId])} / ${nice(q.target)}</small></article>`).join('')}</div></section><section class="panel"><h3>Free cosmetic reward track</h3><div class="choice-grid">${Array.from({length:10},(_,i)=>`<article class="choice"><small>TIER ${i+1} · ${(i+1)*500} XP</small><h3>${['Signal','Circuit','Afterglow','Fracture','Spectrum','Aurora','Pulsar','Eclipse','Zenith','Nexus'][i]} signature</h3><p>${progress.xp>=(i+1)*500?'Unlocked in your profile':'Earn season XP to unlock'}</p></article>`).join('')}</div></section>`;
  }
  if(page==='achievements')return `<section class="panel"><h2>Prove you were here.</h2><p class="muted">${profile.achievementCount} of ${ACHIEVEMENTS.length} achievements · Persistent across seasons</p><div class="choice-grid">${ACHIEVEMENTS.map(a=>`<article class="choice ${nexus.achievements.includes(a.id)?'compatible':'muted'}"><small>${nexus.achievements.includes(a.id)?'✦ UNLOCKED':'LOCKED'}</small><h3>${escapeHTML(a.name)}</h3><p>${escapeHTML(a.description)}</p></article>`).join('')}</div></section><section class="panel"><h3>Discovery archive</h3>${Object.entries(nexus.discoveries).map(([key,list])=>`<p><b>${escapeHTML(key)}</b> · ${list.length}<br><span class="muted">${list.map(id=>escapeHTML(nameOf([...WEAPONS,...PASSIVES,...RELICS,...BIOMES,...BIOMES.map(b=>b.boss)],id))).join(' · ')||'Undiscovered'}</span></p>`).join('')}</section>`;
  const history=save.history||[],selected=(options.selectedIds||options.selected||[]).slice(0,2),runs=selected.map(id=>history.find(r=>(r.id||r.runId)===id)).filter(Boolean),ghost=options.ghost||nexus.ghosts[0];
  let comparison='';
  if(runs.length)comparison=`<section class="panel"><div class="panel-head"><h3>${runs.length===2?'Compare your builds':'Run detail'}</h3>${action('clear-comparison','Clear')}</div><div class="settings-grid">${runs.map(run=>`<article><p class="record">${nice(run.score)} points · ${fmt(run.duration||run.seconds)}</p><p class="muted">${escapeHTML(run.outcome)} · ${escapeHTML(run.mode)} · ${escapeHTML(run.difficulty)} · Balance ${escapeHTML(run.balanceVersion)}</p>${buildHTML(run)}<p>${nice(run.kills)} kills · ${nice(run.bosses)} bosses · ${nice(run.damageTaken)} HP damage</p><h4>Weapon contribution</h4>${Object.entries(run.damageByWeapon||{}).sort((a,b)=>b[1]-a[1]).map(([id,value])=>`<p>${escapeHTML(nameOf(WEAPONS,id))} · ${nice(value)}${progressBar(value,run.damageDealt||Object.values(run.damageByWeapon||{}).reduce((a,b)=>a+b,0))}</p>`).join('')}<div class="controls">${action('favorite-build','☆ Save build',run.id||run.runId)}${action('export-ghost','Copy ghost benchmark',run.id||run.runId)}</div></article>`).join('')}</div>${runs.length===2?`<p class="muted">Score difference: ${nice(Math.abs(count(runs[0].score)-count(runs[1].score)))} · Results are grouped by mode, difficulty, and balance version. Different groups are not directly comparable.</p>`:''}</section>`;
  let ghostHTML='';if(ghost){const valid=validateGhost(ghost),t=count(options.benchmarkTime??valid.duration/2),pace=benchmarkGhost(valid,t);ghostHTML=`<section class="panel"><h3>Ghost benchmark · ${escapeHTML(valid.name)}</h3><p class="muted">${escapeHTML(valid.mode)} / ${escapeHTML(valid.difficulty)} / ${escapeHTML(valid.balanceVersion)} · Recorded score pace, not live multiplayer or a verified leaderboard result</p><p>At ${fmt(t)}: ${nice(pace.score)} points · ${nice(pace.kills)} kills</p><label>Compare at time <input data-nexus-time type="range" min="0" max="${valid.duration}" value="${t}" step="1"></label><div class="controls">${action('clear-ghost','Remove benchmark')}</div></section>`;}
  return `<section class="panel"><div class="panel-head"><h2>Your run archive</h2>${action('import-ghost','Import ghost benchmark')}</div><p class="muted">Select up to two runs to compare complete builds and damage contribution. Shared ghosts contain score samples only.</p><div style="overflow-x:auto"><table class="records-table"><thead><tr><th>RUN</th><th>SCORE</th><th>TIME</th><th>RESULT</th><th>COMPARE</th></tr></thead><tbody>${history.length?history.map(run=>`<tr><td>${escapeHTML(nameOf(OPERATORS,run.operator))}<small> · ${escapeHTML(run.mode)} / ${escapeHTML(run.difficulty)} / ${escapeHTML(run.balanceVersion||'V4')}</small></td><td>${nice(run.score)}</td><td>${fmt(run.duration||run.seconds)}</td><td>${escapeHTML(run.outcome)}</td><td>${action('history-select',selected.includes(run.id||run.runId)?'Selected ✓':'Select',run.id||run.runId)}</td></tr>`).join(''):'<tr><td colspan="5">Complete a run to begin your archive.</td></tr>'}</tbody></table></div></section>${comparison}${ghostHTML}`;
}
