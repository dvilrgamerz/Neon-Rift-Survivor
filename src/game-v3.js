const c = document.querySelector('#game');
const x = c.getContext('2d');

let W = 0, H = 0, dpr = 1;
function resize(){
  dpr = Math.min(devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  c.width = W * dpr; c.height = H * dpr;
  x.setTransform(dpr,0,0,dpr,0,0);
}
addEventListener('resize', resize); resize();

const ui = {
  hp: document.querySelector('#hp'), xp: document.querySelector('#xp'), lv: document.querySelector('#lv'),
  kills: document.querySelector('#kills'), time: document.querySelector('#time'), best: document.querySelector('#best'),
  start: document.querySelector('#start'), level: document.querySelector('#level'), over: document.querySelector('#over'),
  choices: document.querySelector('#choices'), score: document.querySelector('#score'),
  modeLabel: document.querySelector('#modeLabel'), modeDesc: document.querySelector('#modeDesc'),
  customSettings: document.querySelector('#customSettings'), hudMode: document.querySelector('#hudMode'),
  loadout: document.querySelector('#loadout'), pauseBadge: document.querySelector('#pauseBadge')
};

const STATES = Object.freeze({ MENU:'menu', PLAYING:'playing', PAUSED:'paused', LEVEL:'level', GAMEOVER:'gameover' });
let state = STATES.MENU;
let keys = {}, touch = null, last = 0, t = 0, kills = 0, level = 1, xp = 0, need = 10;
let enemies = [], bullets = [], gems = [], particles = [], zones = [], mines = [];
let spawn = 0, shot = 0, bossAt = 60, enemyId = 1;
let owned = {}, levels = {}, evolved = {}, evoBanner = '', evoBannerTime = 0;
let timers = {};
let difficulty;

const MAX_ENEMIES = 260;
const MAX_GEMS = 420;
const MAX_PARTICLES = 650;
const MAX_BULLETS = 420;

function storageGet(key, fallback=null){
  try { const v = localStorage.getItem(key); return v === null ? fallback : v; } catch { return fallback; }
}
function storageSet(key, value){ try { localStorage.setItem(key, value); } catch {} }
function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }

const difficultyPresets = {
  easy:{label:'EASY',short:'EASY',desc:'Relaxed survival: weaker, slower enemies and more XP.',enemyHp:.72,enemySpeed:.86,spawnRate:.80,bossPower:.75,playerDamage:1.20,xpGain:1.25,startHp:140,doubleBosses:false},
  standard:{label:'STANDARD',short:'STD',desc:'Balanced enemy strength, spawn rate, XP, and bosses.',enemyHp:1,enemySpeed:1,spawnRate:1,bossPower:1,playerDamage:1,xpGain:1,startHp:100,doubleBosses:false},
  nightmare:{label:'NIGHTMARE',short:'NIGHT',desc:'Tougher enemies, denser waves and stronger bosses.',enemyHp:1.70,enemySpeed:1.20,spawnRate:1.35,bossPower:1.70,playerDamage:.95,xpGain:1.20,startHp:90,doubleBosses:false},
  impossible:{label:'IMPOSSIBLE',short:'IMP',desc:'Extreme scaling, fast swarms and double bosses.',enemyHp:2.50,enemySpeed:1.40,spawnRate:1.75,bossPower:2.40,playerDamage:.85,xpGain:1.35,startHp:80,doubleBosses:true}
};
const customDefaults = {enemyHp:1,enemySpeed:1,spawnRate:1,bossPower:1,playerDamage:1,xpGain:1,startHp:100,doubleBosses:false};
const customRanges = {
  enemyHp:[.5,4], enemySpeed:[.6,2.5], spawnRate:[.5,3], bossPower:[.5,4],
  playerDamage:[.5,2.5], xpGain:[.5,3], startHp:[50,300]
};

let selectedMode = storageGet('neonMode','standard');
if(!['easy','standard','nightmare','impossible','custom'].includes(selectedMode)) selectedMode = 'standard';
let savedCustom = null;
try { savedCustom = JSON.parse(storageGet('neonCustomDifficulty','null')); } catch {}
let customDifficulty = {...customDefaults, ...(savedCustom && typeof savedCustom === 'object' ? savedCustom : {})};
for(const [k,[min,max]] of Object.entries(customRanges)) customDifficulty[k] = clamp(Number(customDifficulty[k]) || customDefaults[k], min, max);
customDifficulty.doubleBosses = !!customDifficulty.doubleBosses;

function getDifficulty(){
  return selectedMode === 'custom'
    ? {label:'CUSTOM',short:'CUSTOM',desc:'Your custom balance settings.',...customDifficulty}
    : (difficultyPresets[selectedMode] || difficultyPresets.standard);
}
function bestKey(){ return `neonBest_${selectedMode}`; }
function readBest(){ return Number(storageGet(bestKey(),0)) || 0; }
function syncBest(){ if(ui.best) ui.best.textContent = readBest(); }

let p = {};
function basePlayer(){
  difficulty = {...getDifficulty()};
  return {
    x:W/2,y:H/2,r:14,hp:difficulty.startHp,max:difficulty.startHp,
    speed:250,damage:18*difficulty.playerDamage,rate:.48,bulletSpeed:600,
    multi:1,pierce:0,magnet:90,orbitSpeed:2.4,area:1,duration:1,
    regen:0,armor:0,crit:0,critDamage:1.75,cooldownMult:1
  };
}
p = basePlayer();

function setState(next){
  state = next;
  if(ui.pauseBadge) ui.pauseBadge.classList.toggle('hide', next !== STATES.PAUSED);
}

addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = 1;
  if(e.key === 'Escape'){
    if(state === STATES.PLAYING) setState(STATES.PAUSED);
    else if(state === STATES.PAUSED) setState(STATES.PLAYING);
  }
});
addEventListener('keyup', e => keys[e.key.toLowerCase()] = 0);

c.addEventListener('pointerdown', e => {
  if(state !== STATES.PLAYING) return;
  touch = {sx:e.clientX,sy:e.clientY,x:e.clientX,y:e.clientY};
  try { c.setPointerCapture(e.pointerId); } catch {}
});
c.addEventListener('pointermove', e => { if(touch){ touch.x=e.clientX; touch.y=e.clientY; } });
c.addEventListener('pointerup', () => touch = null);
c.addEventListener('pointercancel', () => touch = null);

const timerNames = ['disc','brick','drill','core','laser','arc','mine','plasma','slash','missile','orb'];
function resetTimers(){ timers = Object.fromEntries(timerNames.map(k=>[k,0])); }

function reset(){
  t=0;kills=0;level=1;xp=0;need=10;enemyId=1;
  enemies=[];bullets=[];gems=[];particles=[];zones=[];mines=[];
  spawn=0;shot=0;bossAt=60;touch=null;
  owned={pulse:true};levels={pulse:1};evolved={};evoBanner='';evoBannerTime=0;resetTimers();
  p=basePlayer();
  ui.over.classList.add('hide'); ui.start.classList.add('hide'); ui.level.classList.add('hide');
  syncModeUI(); updateLoadout(); setState(STATES.PLAYING);
}

document.querySelector('#play').onclick = reset;
document.querySelector('#again').onclick = reset;

function syncModeUI(){
  difficulty = {...getDifficulty()};
  if(ui.modeLabel) ui.modeLabel.textContent = 'SELECTED: '+difficulty.label;
  if(ui.modeDesc) ui.modeDesc.textContent = selectedMode === 'custom'
    ? `Custom active • Enemy HP ${difficulty.enemyHp}x • Speed ${difficulty.enemySpeed}x • Spawn ${difficulty.spawnRate}x • Boss ${difficulty.bossPower}x • Damage ${difficulty.playerDamage}x • XP ${difficulty.xpGain}x • HP ${difficulty.startHp}`
    : difficulty.desc;
  if(ui.hudMode) ui.hudMode.textContent = difficulty.short;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === selectedMode));
  if(ui.customSettings) ui.customSettings.classList.toggle('hide', selectedMode !== 'custom');
  syncBest();
}
function selectMode(mode){
  if(!['easy','standard','nightmare','impossible','custom'].includes(mode)) return;
  selectedMode=mode; storageSet('neonMode',mode); syncModeUI();
}
const modeGrid = document.querySelector('.mode-grid');
if(modeGrid) modeGrid.addEventListener('click', ev => {
  const b = ev.target.closest('.mode-btn');
  if(b){ ev.preventDefault(); selectMode(b.dataset.mode); }
});

const customFields = [
  ['enemyHp','enemyHpVal','x'],['enemySpeed','enemySpeedVal','x'],['spawnRate','spawnRateVal','x'],
  ['bossPower','bossPowerVal','x'],['playerDamage','playerDamageVal','x'],['xpGain','xpGainVal','x'],['startHp','startHpVal','']
];
customFields.forEach(([id,val,suffix]) => {
  const el=document.querySelector('#'+id), out=document.querySelector('#'+val); if(!el||!out) return;
  el.value=customDifficulty[id]; out.textContent=customDifficulty[id]+suffix;
  el.addEventListener('input',()=>{
    const [min,max]=customRanges[id]; customDifficulty[id]=clamp(Number(el.value),min,max);
    out.textContent=customDifficulty[id]+suffix;
    storageSet('neonCustomDifficulty',JSON.stringify(customDifficulty));
    if(selectedMode==='custom') syncModeUI();
  });
});
const dbl=document.querySelector('#doubleBosses');
if(dbl){
  dbl.checked=customDifficulty.doubleBosses;
  dbl.addEventListener('change',()=>{
    customDifficulty.doubleBosses=!!dbl.checked;
    storageSet('neonCustomDifficulty',JSON.stringify(customDifficulty));
    if(selectedMode==='custom') syncModeUI();
  });
}
const resetCustom=document.querySelector('#resetCustom');
if(resetCustom) resetCustom.onclick=()=>{
  customDifficulty={...customDefaults}; storageSet('neonCustomDifficulty',JSON.stringify(customDifficulty));
  customFields.forEach(([id,val,suffix])=>{
    const el=document.querySelector('#'+id),out=document.querySelector('#'+val);
    if(el&&out){el.value=customDifficulty[id];out.textContent=customDifficulty[id]+suffix;}
  });
  if(dbl) dbl.checked=false; syncModeUI();
};
const changeMode=document.querySelector('#changeMode');
if(changeMode) changeMode.onclick=()=>{
  ui.over.classList.add('hide'); ui.start.classList.remove('hide'); setState(STATES.MENU); syncModeUI();
};

const passives = [
  {id:'magnet',name:'Flux Magnet',max:5,desc:'Pickup range +28%',apply:()=>p.magnet*=1.28},
  {id:'vital',name:'Vital Matrix',max:5,desc:'+22 max HP and heal',apply:()=>{p.max+=22;p.hp=Math.min(p.max,p.hp+22)}},
  {id:'ammo',name:'Ammo Thruster',max:5,desc:'+18% projectile speed',apply:()=>p.bulletSpeed*=1.18},
  {id:'fuel',name:'Reactor Fuel',max:5,desc:'+16% area size',apply:()=>p.area*=1.16},
  {id:'regen',name:'Nano Regen',max:5,desc:'+0.55 HP/sec regeneration',apply:()=>p.regen+=.55},
  {id:'bracer',name:'Exo Bracer',max:5,desc:'+16% duration and orbit speed',apply:()=>{p.duration*=1.16;p.orbitSpeed*=1.16}},
  {id:'cube',name:'Energy Cube',max:5,desc:'Skill cooldowns 12% faster',apply:()=>p.cooldownMult*=.88},
  {id:'catalyst',name:'Plasma Catalyst',max:5,desc:'+20% zone duration',apply:()=>p.duration*=1.20},
  {id:'armor',name:'Phase Armor',max:5,desc:'Take 9% less damage',apply:()=>p.armor=Math.min(.55,p.armor+.09)},
  {id:'boots',name:'Vector Boots',max:5,desc:'+12% movement speed',apply:()=>p.speed*=1.12},
  {id:'power',name:'Overcharge Core',max:5,desc:'+22% all damage',apply:()=>p.damage*=1.22},
  {id:'rate',name:'Attack Booster',max:5,desc:'Pulse Blaster fires 12% faster',apply:()=>p.rate*=.88},
  {id:'crit',name:'Critical Module',max:5,desc:'+7% critical chance',apply:()=>p.crit=Math.min(.45,p.crit+.07)},
  {id:'repair',name:'Repair Nanites',max:99,desc:'Restore 36 HP',utility:true,apply:()=>p.hp=Math.min(p.max,p.hp+36)}
].map(v=>({...v,kind:'Passive'}));

const actives = [
  {id:'disc',name:'Rift Disc',max:5,desc:'Orbit-cutting energy discs'},
  {id:'brick',name:'Gravity Brick',max:5,desc:'Heavy kinetic blocks with piercing'},
  {id:'drill',name:'Ion Drill',max:5,desc:'Fast line-piercing projectiles'},
  {id:'core',name:'Spiked Core',max:5,desc:'Long-lived rolling energy core'},
  {id:'field',name:'Phase Field',max:5,desc:'Continuous close-range damage field'},
  {id:'guard',name:'Orbit Guard',max:5,desc:'Rotating blades that protect your space'},
  {id:'laser',name:'Prism Lance',max:5,desc:'High-speed piercing beams'},
  {id:'arc',name:'Arc Conductor',max:5,desc:'Chain strikes nearby targets'},
  {id:'mine',name:'Rift Mine',max:5,desc:'Proximity mines with expanding blast radius'},
  {id:'plasma',name:'Plasma Pool',max:5,desc:'Burning zones placed under enemies'},
  {id:'slash',name:'Crescent Wave',max:5,desc:'Periodic close-range shockwave'},
  {id:'missile',name:'Void Missile',max:5,desc:'Homing explosive missiles'},
  {id:'orb',name:'Kinetic Orb',max:5,desc:'Fast multi-hit bouncing-style projectiles'}
].map(v=>({...v,kind:'Active'}));

const activeById = Object.fromEntries(actives.map(v=>[v.id,v]));
const upgrades = [...actives,...passives];

const evolutions = [
  {active:'disc',passive:'magnet',id:'singularity-disc',name:'Singularity Disc'},
  {active:'brick',passive:'vital',id:'titan-block',name:'Titan Block'},
  {active:'drill',passive:'ammo',id:'rail-drill',name:'Rail Drill'},
  {active:'core',passive:'fuel',id:'nova-core',name:'Nova Core'},
  {active:'field',passive:'regen',id:'aegis-field',name:'Aegis Field'},
  {active:'guard',passive:'bracer',id:'rift-sentinel',name:'Rift Sentinel'},
  {active:'laser',passive:'cube',id:'event-horizon',name:'Event Horizon Lance'},
  {active:'arc',passive:'cube',id:'riftstorm',name:'Riftstorm'},
  {active:'mine',passive:'catalyst',id:'sun-mine',name:'Sun Mine'},
  {active:'plasma',passive:'catalyst',id:'starfire-pool',name:'Starfire Pool'},
  {active:'slash',passive:'armor',id:'eclipse-wave',name:'Eclipse Wave'},
  {active:'missile',passive:'fuel',id:'nova-warhead',name:'Nova Warhead'},
  {active:'orb',passive:'boots',id:'quantum-orb',name:'Quantum Orb'}
];
const evoByActive = Object.fromEntries(evolutions.map(e=>[e.active,e]));
function isEvolved(active){ const e=evoByActive[active]; return !!(e && evolved[e.id]); }
function checkEvolutions(){
  for(const e of evolutions){
    if((levels[e.active]||0) >= (activeById[e.active]?.max||5) && (levels[e.passive]||0) > 0 && !evolved[e.id]){
      evolved[e.id]=true; evoBanner='EVO UNLOCKED: '+e.name; evoBannerTime=3.4; burst(p.x,p.y,46); updateLoadout();
    }
  }
}

function levelOf(id){ return levels[id]||0; }
function canOffer(u){
  if(u.utility) return p.hp < p.max*.82;
  return levelOf(u.id) < u.max;
}
function chooseUpgrade(u){
  levels[u.id]=(levels[u.id]||0)+1; owned[u.id]=true;
  if(u.kind==='Passive') u.apply();
  checkEvolutions(); updateLoadout(); ui.level.classList.add('hide'); setState(STATES.PLAYING);
}
function levelUp(){
  setState(STATES.LEVEL); ui.level.classList.remove('hide'); ui.choices.innerHTML='';
  const pool=upgrades.filter(canOffer).sort(()=>Math.random()-.5).slice(0,3);
  if(pool.length===0){
    p.damage*=1.08; p.max+=8; p.hp=Math.min(p.max,p.hp+8); ui.level.classList.add('hide'); setState(STATES.PLAYING); return;
  }
  pool.forEach(u=>{
    const b=document.createElement('button'); b.className='choice';
    const lv=levelOf(u.id), next=Math.min(u.max,lv+1); const evo=evoByActive[u.id];
    const evoHint=evo && next===u.max && levelOf(evo.passive)>0 ? '<small> • EVO READY</small>' : '';
    b.innerHTML=`<b>${u.kind} — ${u.name} Lv.${next}/${u.max}${evoHint}</b>${u.desc}`;
    b.onclick=()=>chooseUpgrade(u); ui.choices.appendChild(b);
  });
}

function updateLoadout(){
  if(!ui.loadout) return;
  const rows=[];
  for(const a of actives){ if(levelOf(a.id)){ const e=evoByActive[a.id]; rows.push(`${e&&evolved[e.id]?'★ ':''}${e&&evolved[e.id]?e.name:a.name} Lv.${levelOf(a.id)}`); } }
  for(const s of passives){ if(levelOf(s.id)&&!s.utility) rows.push(`${s.name} Lv.${levelOf(s.id)}`); }
  ui.loadout.innerHTML=rows.slice(0,8).map(v=>`<span>${v}</span>`).join('');
}

function spawnEnemy(boss=false){
  if(enemies.length>=MAX_ENEMIES) return;
  const a=Math.random()*Math.PI*2, d=Math.max(W,H)*.65+80;
  const type=boss?3:(t>40&&Math.random()<.16?2:t>15&&Math.random()<.30?1:0);
  const bossMult=type===3?difficulty.bossPower:1;
  const hp=[30,65,45,700][type]*(1+t/180)*difficulty.enemyHp*bossMult;
  const speed=[85,55,125,45][type]*(1+Math.min(t/400,.6))*difficulty.enemySpeed*(type===3?Math.max(.9,difficulty.bossPower*.65):1);
  enemies.push({id:enemyId++,x:p.x+Math.cos(a)*d,y:p.y+Math.sin(a)*d,r:[12,18,10,40][type],hp,max:hp,speed,type,contactCd:0,orbitCd:0});
}
function nearestEnemy(){
  let best=null, bd=Infinity;
  for(const e of enemies){ const d=(e.x-p.x)**2+(e.y-p.y)**2; if(d<bd){bd=d;best=e;} }
  return best;
}
function hitDamage(mult=1){ return p.damage*mult*(Math.random()<p.crit?p.critDamage:1); }
function makeBullet(o){
  if(bullets.length>=MAX_BULLETS) return;
  bullets.push({...o,hitIds:new Set()});
}
function fire(){
  const e=nearestEnemy(); if(!e) return;
  const a=Math.atan2(e.y-p.y,e.x-p.x);
  for(let i=0;i<p.multi;i++){
    const aa=a+(i-(p.multi-1)/2)*.13;
    makeBullet({type:'pulse',x:p.x,y:p.y,vx:Math.cos(aa)*p.bulletSpeed,vy:Math.sin(aa)*p.bulletSpeed,r:5,life:1.8,pierce:p.pierce,damage:hitDamage(1)});
  }
}
function radialShot(type,count,speed,damage,life=2,r=6,pierce=0){
  for(let i=0;i<count;i++){
    const a=i*Math.PI*2/count+t*.7;
    makeBullet({type,x:p.x,y:p.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r,life,pierce,damage});
  }
}
function targetedShot(type,speed,damage,pierce=0,spread=0,r=6){
  const e=nearestEnemy(); if(!e) return;
  const a=Math.atan2(e.y-p.y,e.x-p.x)+(Math.random()-.5)*spread;
  makeBullet({type,x:p.x,y:p.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r,life:3,pierce,damage,target:e});
}
function cooldown(base){ return Math.max(.18,base*p.cooldownMult); }

function activateSkills(dt){
  const L=id=>levelOf(id);
  if(owned.disc&&(timers.disc-=dt)<=0){
    timers.disc=cooldown(isEvolved('disc')?1.35:2.1);
    radialShot('disc',Math.min(1+L('disc')+(isEvolved('disc')?2:0),9),isEvolved('disc')?340:260,hitDamage(isEvolved('disc')?1.45:.85+.08*L('disc')),2.7,isEvolved('disc')?9:7,isEvolved('disc')?3:1);
  }
  if(owned.brick&&(timers.brick-=dt)<=0){
    timers.brick=cooldown(isEvolved('brick')?1.15:1.8);
    for(let i=0;i<Math.min(L('brick')+(isEvolved('brick')?2:0),7);i++) targetedShot('brick',isEvolved('brick')?260:190,hitDamage(isEvolved('brick')?2.15:1.15+.1*L('brick')),isEvolved('brick')?4:1,.5,isEvolved('brick')?10:7);
  }
  if(owned.drill&&(timers.drill-=dt)<=0){
    timers.drill=cooldown(isEvolved('drill')?.72:1.25);
    for(let i=0;i<Math.min(1+L('drill')+(isEvolved('drill')?2:0),8);i++) targetedShot('drill',p.bulletSpeed*(isEvolved('drill')?1.8:1.3),hitDamage(isEvolved('drill')?1.05:.58+.07*L('drill')),isEvolved('drill')?12:6,.3,isEvolved('drill')?7:6);
  }
  if(owned.core&&(timers.core-=dt)<=0){
    timers.core=cooldown(isEvolved('core')?1.45:2.6);
    radialShot('core',isEvolved('core')?2:1,isEvolved('core')?260:210,hitDamage(isEvolved('core')?2.3:1.25+.12*L('core')),4.5+.35*L('core'),10+L('core')*1.5,isEvolved('core')?10:6);
  }
  if(owned.laser&&(timers.laser-=dt)<=0){
    timers.laser=cooldown(isEvolved('laser')?.65:1.7);
    for(let i=0;i<Math.min(L('laser')+(isEvolved('laser')?3:0),8);i++) targetedShot('laser',isEvolved('laser')?1150:900,hitDamage(isEvolved('laser')?1.9:1+.1*L('laser')),isEvolved('laser')?14:7,.35,isEvolved('laser')?7:5);
  }
  if(owned.arc&&(timers.arc-=dt)<=0){
    timers.arc=cooldown(isEvolved('arc')?1.0:2.2);
    const n=Math.min(2+L('arc')+(isEvolved('arc')?4:0),12);
    [...enemies].sort((a,b)=>((a.x-p.x)**2+(a.y-p.y)**2)-((b.x-p.x)**2+(b.y-p.y)**2)).slice(0,n)
      .forEach(e=>{e.hp-=hitDamage(isEvolved('arc')?1.8:1+.07*L('arc'));burst(e.x,e.y,7);});
  }
  if(owned.mine&&(timers.mine-=dt)<=0){
    timers.mine=cooldown(isEvolved('mine')?1.2:2.4);
    const count=isEvolved('mine')?2:1;
    for(let i=0;i<count;i++) mines.push({x:p.x+(Math.random()-.5)*80,y:p.y+(Math.random()-.5)*80,r:9+L('mine'),life:6,damage:hitDamage(isEvolved('mine')?3:1.3+.12*L('mine')),radius:(45+9*L('mine'))*p.area*(isEvolved('mine')?1.35:1)});
  }
  if(owned.plasma&&(timers.plasma-=dt)<=0){
    timers.plasma=cooldown(isEvolved('plasma')?1.3:2.8);
    const e=nearestEnemy(); if(e) zones.push({x:e.x,y:e.y,r:(50+6*L('plasma'))*p.area*(isEvolved('plasma')?1.35:1),life:(2.4+.35*L('plasma'))*p.duration,damage:hitDamage(isEvolved('plasma')?.62:.24+.035*L('plasma')),kind:'fire'});
  }
  if(owned.slash&&(timers.slash-=dt)<=0){
    timers.slash=cooldown(isEvolved('slash')?.8:1.9);
    const radius=(95+10*L('slash'))*p.area*(isEvolved('slash')?1.35:1);
    enemies.forEach(e=>{if(Math.hypot(e.x-p.x,e.y-p.y)<radius+e.r)e.hp-=hitDamage(isEvolved('slash')?2.4:1.05+.1*L('slash'));}); burst(p.x,p.y,isEvolved('slash')?32:20);
  }
  if(owned.missile&&(timers.missile-=dt)<=0){
    timers.missile=cooldown(isEvolved('missile')?1.05:2.5);
    const n=Math.min(L('missile')+(isEvolved('missile')?2:0),7);
    for(let i=0;i<n;i++) targetedShot('missile',isEvolved('missile')?440:350,hitDamage(isEvolved('missile')?2.5:1.3+.1*L('missile')),0,.35,isEvolved('missile')?10:8);
  }
  if(owned.orb&&(timers.orb-=dt)<=0){
    timers.orb=cooldown(isEvolved('orb')?1.0:2.1);
    radialShot('orb',Math.min(L('orb')+(isEvolved('orb')?3:0),8),isEvolved('orb')?430:330,hitDamage(isEvolved('orb')?1.65:.85+.06*L('orb')),4.2,7+L('orb'),isEvolved('orb')?7:3);
  }
}

function explode(px,py,r,damage){ enemies.forEach(e=>{if(Math.hypot(e.x-px,e.y-py)<r+e.r)e.hp-=damage;}); burst(px,py,18); }
function burst(px,py,n=7){
  const room=Math.max(0,MAX_PARTICLES-particles.length); n=Math.min(n,room);
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2,s=30+Math.random()*130;
    particles.push({x:px,y:py,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:.45});
  }
}
function addGem(g){
  if(gems.length<MAX_GEMS){ gems.push(g); return; }
  let nearest=gems[0],bd=Infinity;
  for(let i=0;i<Math.min(40,gems.length);i++){
    const candidate=gems[(Math.random()*gems.length)|0]; const d=(candidate.x-g.x)**2+(candidate.y-g.y)**2;
    if(d<bd){bd=d;nearest=candidate;}
  }
  if(nearest) nearest.v+=g.v;
}

function update(dt){
  if(state!==STATES.PLAYING) return;
  t+=dt; if(evoBannerTime>0)evoBannerTime-=dt;
  if(p.regen>0)p.hp=Math.min(p.max,p.hp+p.regen*dt);

  let dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);
  let dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
  if(touch){dx=clamp((touch.x-touch.sx)/50,-1,1);dy=clamp((touch.y-touch.sy)/50,-1,1);}
  const m=Math.hypot(dx,dy)||1;
  if(Math.hypot(dx,dy)>0){p.x+=dx/m*p.speed*dt;p.y+=dy/m*p.speed*dt;}
  p.x=clamp(p.x,20,W-20); p.y=clamp(p.y,20,H-20);

  spawn-=dt;
  const interval=Math.max(.09,(.72-t*.0025)/difficulty.spawnRate);
  if(spawn<=0){
    spawn=interval; spawnEnemy();
    if(t>90&&Math.random()<Math.min(.32,.1*difficulty.spawnRate)) spawnEnemy();
  }
  if(t>=bossAt){ spawnEnemy(true); if(difficulty.doubleBosses)spawnEnemy(true); bossAt+=60; }

  shot-=dt; if(shot<=0){shot=p.rate;fire();}
  activateSkills(dt);

  if(owned.field){
    const L=levelOf('field'); const evolvedField=isEvolved('field');
    const radius=(62+12*L)*p.area*(evolvedField?1.35:1);
    enemies.forEach(e=>{if(Math.hypot(e.x-p.x,e.y-p.y)<radius+e.r)e.hp-=hitDamage(evolvedField?.28:.10+.018*L)*dt*8;});
    if(evolvedField) p.hp=Math.min(p.max,p.hp+.15*dt*L);
  }

  const orbitCount=owned.guard?Math.min(1+levelOf('guard')+(isEvolved('guard')?2:0),8):0;
  if(orbitCount){
    const radius=isEvolved('guard')?72:62;
    for(let j=0;j<orbitCount;j++){
      const a=t*p.orbitSpeed+j*Math.PI*2/orbitCount,ox=p.x+Math.cos(a)*radius,oy=p.y+Math.sin(a)*radius;
      enemies.forEach(e=>{if(Math.hypot(e.x-ox,e.y-oy)<e.r+8&&e.orbitCd<=0){e.hp-=hitDamage(isEvolved('guard')?1.1:.5+.05*levelOf('guard'));e.orbitCd=isEvolved('guard')?.08:.14;burst(e.x,e.y,3);}});
    }
  }

  bullets.forEach(b=>{
    if(b.type==='missile'&&b.target&&b.target.hp>0){
      const a=Math.atan2(b.target.y-b.y,b.target.x-b.x),s=Math.hypot(b.vx,b.vy);
      b.vx=b.vx*.91+Math.cos(a)*s*.09;b.vy=b.vy*.91+Math.sin(a)*s*.09;
    }
    b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
  });

  zones.forEach(z=>{z.life-=dt;enemies.forEach(e=>{if(Math.hypot(e.x-z.x,e.y-z.y)<z.r+e.r)e.hp-=z.damage*dt;});});
  zones=zones.filter(z=>z.life>0);

  mines.forEach(m=>{
    m.life-=dt; const hit=enemies.find(e=>Math.hypot(e.x-m.x,e.y-m.y)<m.r+e.r+8);
    if(hit||m.life<=0){explode(m.x,m.y,m.radius,m.damage);m.dead=1;}
  });
  mines=mines.filter(m=>!m.dead);

  enemies.forEach(e=>{
    const a=Math.atan2(p.y-e.y,p.x-e.x); e.x+=Math.cos(a)*e.speed*dt;e.y+=Math.sin(a)*e.speed*dt;
    e.contactCd=Math.max(0,e.contactCd-dt); e.orbitCd=Math.max(0,e.orbitCd-dt);
    if(Math.hypot(e.x-p.x,e.y-p.y)<e.r+p.r&&e.contactCd<=0){
      p.hp-=((e.type===3?24:10)*(1-p.armor));e.contactCd=.55;burst(p.x,p.y,10);
    }
  });

  for(const b of bullets){
    if(b.life<=0) continue;
    for(const e of enemies){
      if(b.life<=0) break;
      if(b.hitIds.has(e.id)) continue;
      if(Math.hypot(b.x-e.x,b.y-e.y)<b.r+e.r){
        b.hitIds.add(e.id); e.hp-=b.damage;
        if(b.type==='missile'){
          const evo=isEvolved('missile'); explode(b.x,b.y,(50+10*levelOf('missile'))*p.area*(evo?1.45:1),hitDamage(evo?1.35:.72)); b.life=-1;
        } else if(b.pierce>0) b.pierce--; else b.life=-1;
        burst(b.x,b.y,3);
      }
    }
  }

  for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i]; if(e.hp>0) continue;
    kills++; const count=e.type===3?18:1; const value=(e.type===3?4.5:1.5)*difficulty.xpGain;
    for(let z=0;z<count;z++) addGem({x:e.x+(Math.random()-.5)*30,y:e.y+(Math.random()-.5)*30,v:value});
    burst(e.x,e.y,e.type===3?30:8); enemies.splice(i,1);
  }

  gems.forEach(g=>{
    const d=Math.hypot(g.x-p.x,g.y-p.y);
    if(d<p.magnet){const a=Math.atan2(p.y-g.y,p.x-g.x),s=200+(p.magnet-d)*4;g.x+=Math.cos(a)*s*dt;g.y+=Math.sin(a)*s*dt;}
    if(d<22){xp+=g.v;g.dead=1;}
  });
  gems=gems.filter(g=>!g.dead);

  if(xp>=need){xp-=need;level++;need=Math.floor(need*1.28+4);levelUp();}

  particles.forEach(q=>{q.x+=q.vx*dt;q.y+=q.vy*dt;q.l-=dt;});
  particles=particles.filter(q=>q.l>0); bullets=bullets.filter(b=>b.life>0);

  if(p.hp<=0){
    p.hp=0; setState(STATES.GAMEOVER);
    const old=readBest(); if(kills>old)storageSet(bestKey(),kills); syncBest();
    ui.score.textContent=`Mode: ${difficulty.label} • Kills: ${kills} • Survived: ${fmt(t)}`; ui.over.classList.remove('hide');
  }

  ui.hp.style.width=Math.max(0,p.hp/p.max*100)+'%'; ui.xp.style.width=Math.min(100,xp/need*100)+'%';
  ui.lv.textContent=level;ui.kills.textContent=kills;ui.time.textContent=fmt(t);
}

function fmt(v){return Math.floor(v/60)+':'+String(Math.floor(v%60)).padStart(2,'0');}

function draw(){
  x.fillStyle='#050712';x.fillRect(0,0,W,H);
  x.strokeStyle='#17213d';x.lineWidth=1;
  const s=48,ox=(-p.x*.12)%s,oy=(-p.y*.12)%s;
  for(let i=ox;i<W;i+=s){x.beginPath();x.moveTo(i,0);x.lineTo(i,H);x.stroke();}
  for(let i=oy;i<H;i+=s){x.beginPath();x.moveTo(0,i);x.lineTo(W,i);x.stroke();}

  if(owned.field){
    const radius=(62+12*levelOf('field'))*p.area*(isEvolved('field')?1.35:1);
    const g=x.createRadialGradient(p.x,p.y,10,p.x,p.y,radius);g.addColorStop(0,'rgba(80,255,170,.12)');g.addColorStop(1,'rgba(80,255,170,0)');
    x.fillStyle=g;x.beginPath();x.arc(p.x,p.y,radius,0,Math.PI*2);x.fill();
  }

  zones.forEach(z=>{x.fillStyle=isEvolved('plasma')?'rgba(255,65,190,.22)':'rgba(255,95,35,.18)';x.beginPath();x.arc(z.x,z.y,z.r,0,Math.PI*2);x.fill();});
  mines.forEach(m=>{x.fillStyle='#ffbd2e';x.shadowBlur=12;x.shadowColor='#ff7a00';x.beginPath();x.arc(m.x,m.y,m.r,0,Math.PI*2);x.fill();x.shadowBlur=0;});
  gems.forEach(g=>{x.fillStyle='#39f6e8';x.shadowBlur=12;x.shadowColor='#39f6e8';x.beginPath();x.arc(g.x,g.y,5,0,Math.PI*2);x.fill();});x.shadowBlur=0;

  bullets.forEach(b=>{
    const colors={pulse:'#fff',disc:'#ff526d',brick:'#cb8051',drill:'#ffd44f',core:'#9fe34f',laser:'#ff47e6',missile:'#ff9b42',orb:'#5fe7ff'};
    x.fillStyle=colors[b.type]||'#fff';x.shadowBlur=15;x.shadowColor=x.fillStyle;x.beginPath();x.arc(b.x,b.y,b.r,0,Math.PI*2);x.fill();
  });x.shadowBlur=0;

  enemies.forEach(e=>{
    const col=['#ff426d','#b657ff','#ffb347','#ff315f'][e.type];
    x.fillStyle=col;x.shadowBlur=e.type===3?30:12;x.shadowColor=col;x.beginPath();x.arc(e.x,e.y,e.r,0,Math.PI*2);x.fill();x.shadowBlur=0;
    if(e.type===3){x.fillStyle='#25102a';x.fillRect(e.x-35,e.y-e.r-14,70,5);x.fillStyle='#ff426d';x.fillRect(e.x-35,e.y-e.r-14,70*Math.max(0,e.hp/e.max),5);}
  });

  const orbitCount=owned.guard?Math.min(1+levelOf('guard')+(isEvolved('guard')?2:0),8):0;
  if(orbitCount)for(let j=0;j<orbitCount;j++){
    const a=t*p.orbitSpeed+j*Math.PI*2/orbitCount,rad=isEvolved('guard')?72:62;
    x.save();x.translate(p.x+Math.cos(a)*rad,p.y+Math.sin(a)*rad);x.rotate(a);
    x.fillStyle=isEvolved('guard')?'#43e8ff':'#d861ff';x.shadowBlur=18;x.shadowColor=x.fillStyle;x.fillRect(-10,-4,20,8);x.restore();
  }
  x.shadowBlur=0;

  x.fillStyle='#46eaff';x.shadowBlur=24;x.shadowColor='#46eaff';x.beginPath();x.arc(p.x,p.y,p.r,0,Math.PI*2);x.fill();
  x.fillStyle='#07101d';x.beginPath();x.arc(p.x,p.y,6,0,Math.PI*2);x.fill();x.shadowBlur=0;

  particles.forEach(q=>{x.globalAlpha=Math.max(0,q.l/.45);x.fillStyle='#73efff';x.fillRect(q.x,q.y,3,3);});x.globalAlpha=1;

  if(touch){
    x.strokeStyle='#fff6';x.lineWidth=3;x.beginPath();x.arc(touch.sx,touch.sy,34,0,Math.PI*2);x.stroke();
    const len=Math.max(1,Math.hypot(touch.x-touch.sx,touch.y-touch.sy));
    x.beginPath();x.arc(touch.sx+(touch.x-touch.sx)/len*Math.min(25,len),touch.sy+(touch.y-touch.sy)/len*Math.min(25,len),12,0,Math.PI*2);x.stroke();
  }

  if(evoBannerTime>0){
    x.save();x.textAlign='center';x.font='900 22px system-ui';x.fillStyle='#ffe66d';x.shadowBlur=20;x.shadowColor='#ffca3a';x.fillText(evoBanner,W/2,90);x.restore();
  }
}

function loop(now){
  const dt=Math.min(.033,(now-last)/1000||0);last=now;update(dt);draw();requestAnimationFrame(loop);
}

syncModeUI();updateLoadout();setState(STATES.MENU);requestAnimationFrame(loop);
