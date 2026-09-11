const c=document.querySelector('#game'),x=c.getContext('2d');
let W,H,dpr;
function resize(){dpr=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;c.width=W*dpr;c.height=H*dpr;x.setTransform(dpr,0,0,dpr,0,0)}
addEventListener('resize',resize);resize();

const ui={
  hp:document.querySelector('#hp'),xp:document.querySelector('#xp'),lv:document.querySelector('#lv'),
  kills:document.querySelector('#kills'),time:document.querySelector('#time'),best:document.querySelector('#best'),
  start:document.querySelector('#start'),level:document.querySelector('#level'),over:document.querySelector('#over'),
  choices:document.querySelector('#choices'),score:document.querySelector('#score'),
  modeLabel:document.querySelector('#modeLabel'),modeDesc:document.querySelector('#modeDesc'),
  customSettings:document.querySelector('#customSettings'),hudMode:document.querySelector('#hudMode')
};

let keys={},running=false,paused=false,last=0,t=0,kills=0,level=1,xp=0,need=10;
let enemies=[],bullets=[],gems=[],particles=[],zones=[],mines=[],spawn=0,shot=0,bossAt=60;
let owned={},levels={},evolved={},evoBanner='',evoBannerTime=0;
let timers={boomerang:0,brick:0,drill:0,durian:0,laser:0,lightning:0,mine:0,molotov:0,slash:0,rpg:0,soccer:0};
let best=+localStorage.neonBest||0;ui.best.textContent=best;

const difficultyPresets={
  easy:{label:'EASY',short:'EASY',desc:'Relaxed survival: weaker, slower enemies and more XP.',enemyHp:.72,enemySpeed:.86,spawnRate:.8,bossPower:.75,playerDamage:1.2,xpGain:1.25,startHp:140,doubleBosses:false},
  standard:{label:'STANDARD',short:'STD',desc:'Balanced enemy strength, spawn rate, XP, and bosses.',enemyHp:1,enemySpeed:1,spawnRate:1,bossPower:1,playerDamage:1,xpGain:1,startHp:100,doubleBosses:false},
  nightmare:{label:'NIGHTMARE',short:'NIGHT',desc:'Much tougher enemies, faster spawns, stronger bosses, better XP.',enemyHp:1.7,enemySpeed:1.2,spawnRate:1.35,bossPower:1.7,playerDamage:.95,xpGain:1.2,startHp:90,doubleBosses:false},
  impossible:{label:'IMPOSSIBLE',short:'IMP',desc:'Extreme mode: brutal scaling, fast swarms, and double bosses.',enemyHp:2.5,enemySpeed:1.4,spawnRate:1.75,bossPower:2.4,playerDamage:.85,xpGain:1.35,startHp:80,doubleBosses:true}
};
let selectedMode=localStorage.neonMode||'standard';
let customDifficulty=JSON.parse(localStorage.neonCustomDifficulty||'null')||{enemyHp:1,enemySpeed:1,spawnRate:1,bossPower:1,playerDamage:1,xpGain:1,startHp:100,doubleBosses:false};
let difficulty={...difficultyPresets.standard};

let p={};
function getDifficulty(){
  if(selectedMode==='custom') return {label:'CUSTOM',short:'CUSTOM',desc:'Your custom balance settings.',...customDifficulty};
  return difficultyPresets[selectedMode]||difficultyPresets.standard;
}
function basePlayer(){
  difficulty=getDifficulty();
  return {
    x:W/2,y:H/2,r:14,hp:difficulty.startHp,max:difficulty.startHp,speed:250,damage:18*difficulty.playerDamage,rate:.48,bulletSpeed:600,
    multi:1,pierce:0,magnet:90,orbit:0,orbitDamage:1,orbitSpeed:2.4,
    area:1,duration:1,regen:0,armor:0,crit:0,critDamage:1.75
  };
}
p=basePlayer();

addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=1;if(e.key==='Escape')paused=!paused});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=0);

let touch=null;
c.addEventListener('pointerdown',e=>touch={sx:e.clientX,sy:e.clientY,x:e.clientX,y:e.clientY});
c.addEventListener('pointermove',e=>{if(touch){touch.x=e.clientX;touch.y=e.clientY}});
c.addEventListener('pointerup',()=>touch=null);
c.addEventListener('pointercancel',()=>touch=null);

function reset(){
  t=0;kills=0;level=1;xp=0;need=10;enemies=[];bullets=[];gems=[];particles=[];zones=[];mines=[];
  spawn=0;shot=0;bossAt=60;owned={pulse:true};levels={pulse:1};evolved={};evoBanner='';evoBannerTime=0;
  timers={boomerang:0,brick:0,drill:0,durian:0,laser:0,lightning:0,mine:0,molotov:0,slash:0,rpg:0,soccer:0};
  p=basePlayer();running=true;paused=false;ui.over.classList.add('hide');ui.start.classList.add('hide');syncModeUI()
}

document.querySelector('#play').onclick=reset;
document.querySelector('#again').onclick=reset;

function syncModeUI(){
  difficulty=getDifficulty();
  if(ui.modeLabel)ui.modeLabel.textContent=difficulty.label;
  if(ui.modeDesc)ui.modeDesc.textContent=difficulty.desc;
  if(ui.hudMode)ui.hudMode.textContent=difficulty.short;
  document.querySelectorAll('.mode-btn').forEach(b=>b.classList.toggle('active',b.dataset.mode===selectedMode));
  if(ui.customSettings)ui.customSettings.classList.toggle('hide',selectedMode!=='custom');
}
function selectMode(mode){
  selectedMode=mode;localStorage.neonMode=mode;syncModeUI()
}
document.querySelectorAll('.mode-btn').forEach(b=>b.addEventListener('click',()=>selectMode(b.dataset.mode)));
const customFields=[
  ['enemyHp','enemyHpVal','x'],['enemySpeed','enemySpeedVal','x'],['spawnRate','spawnRateVal','x'],
  ['bossPower','bossPowerVal','x'],['playerDamage','playerDamageVal','x'],['xpGain','xpGainVal','x'],['startHp','startHpVal','']
];
customFields.forEach(([id,val,suffix])=>{
  const el=document.querySelector('#'+id),out=document.querySelector('#'+val);
  if(!el||!out)return;
  el.value=customDifficulty[id];
  out.textContent=customDifficulty[id]+suffix;
  el.addEventListener('input',()=>{
    customDifficulty[id]=+el.value;out.textContent=el.value+suffix;
    localStorage.neonCustomDifficulty=JSON.stringify(customDifficulty);
    if(selectedMode==='custom')syncModeUI()
  })
});
const dbl=document.querySelector('#doubleBosses');
if(dbl){dbl.checked=!!customDifficulty.doubleBosses;dbl.addEventListener('change',()=>{customDifficulty.doubleBosses=dbl.checked;localStorage.neonCustomDifficulty=JSON.stringify(customDifficulty)})}
const changeMode=document.querySelector('#changeMode');
if(changeMode)changeMode.onclick=()=>{ui.over.classList.add('hide');ui.start.classList.remove('hide');running=false;paused=false};
syncModeUI();


const passives=[
  {id:'magnet',kind:'Passive',name:'Hi-Power Magnet',desc:'Pickup range +40%',apply:()=>p.magnet*=1.4},
  {id:'fitness',kind:'Passive',name:'Fitness Guide',desc:'+25 max HP and heal',apply:()=>{p.max+=25;p.hp=Math.min(p.max,p.hp+25)}},
  {id:'ammo',kind:'Passive',name:'Ammo Thruster',desc:'+22% projectile speed',apply:()=>p.bulletSpeed*=1.22},
  {id:'fuel',kind:'Passive',name:'HE Fuel',desc:'+20% area size',apply:()=>p.area*=1.2},
  {id:'drink',kind:'Passive',name:'Energy Drink',desc:'Regenerate HP over time',apply:()=>p.regen+=.7},
  {id:'bracer',kind:'Passive',name:'Exo-Bracer',desc:'+20% skill duration / orbit speed',apply:()=>{p.duration*=1.2;p.orbitSpeed*=1.2}},
  {id:'cube',kind:'Passive',name:'Energy Cube',desc:'Skills activate 16% faster',apply:()=>Object.keys(timers).forEach(k=>timers[k]*=.84)},
  {id:'oil',kind:'Passive',name:'Oil Bond',desc:'+30% burn damage and duration',apply:()=>p.duration*=1.3},
  {id:'ronin',kind:'Passive',name:'Ronin Oyoroi',desc:'Take 12% less damage',apply:()=>p.armor=Math.min(.6,p.armor+.12)},
  {id:'shoes',kind:'Passive',name:'Sports Shoes',desc:'+15% movement speed',apply:()=>p.speed*=1.15},
  {id:'power',kind:'Passive',name:'Hi-Power Bullet',desc:'+30% all damage',apply:()=>p.damage*=1.3},
  {id:'rate',kind:'Passive',name:'Attack Booster',desc:'Fire 16% faster',apply:()=>p.rate*=.84},
  {id:'crit',kind:'Passive',name:'Critical Module',desc:'+8% critical hit chance',apply:()=>p.crit=Math.min(.5,p.crit+.08)},
  {id:'repair',kind:'Passive',name:'Repair Nanites',desc:'Restore 40 HP',apply:()=>p.hp=Math.min(p.max,p.hp+40)}
];

const actives=[
  {id:'boomerang',kind:'Active',name:'Boomerang',desc:'Throws returning energy blades'},
  {id:'brick',kind:'Active',name:'Brick',desc:'Drops heavy kinetic blocks'},
  {id:'drill',kind:'Active',name:'Drill Shot',desc:'Launches fast piercing drills'},
  {id:'durian',kind:'Active',name:'Durian',desc:'A spiked orb rolls through enemies'},
  {id:'forcefield',kind:'Active',name:'Forcefield',desc:'Damages enemies close to you'},
  {id:'guardian',kind:'Active',name:'Guardian',desc:'Adds rotating defensive blades'},
  {id:'laser',kind:'Active',name:'Laser Launcher',desc:'Fires beams through enemy lines'},
  {id:'lightning',kind:'Active',name:'Lightning Emitter',desc:'Strikes several nearby enemies'},
  {id:'mine',kind:'Active',name:'Modular Mine',desc:'Drops explosive mines'},
  {id:'molotov',kind:'Active',name:'Molotov',desc:'Creates burning damage zones'},
  {id:'slash',kind:'Active',name:'Moonshade Slash',desc:'Wide crescent melee slash'},
  {id:'rpg',kind:'Active',name:'RPG',desc:'Launches explosive seeker rockets'},
  {id:'soccer',kind:'Active',name:'Soccer Ball',desc:'Bouncing kinetic projectile'}
];

const upgrades=[
  ...actives.map(a=>({...a,apply:()=>levels[a.id]=(levels[a.id]||0)+1})),
  ...passives
];

const evolutions=[
  {active:'boomerang',passive:'magnet',id:'magnetic-rebounder',name:'Magnetic Rebounder',apply:()=>levels.boomerang=(levels.boomerang||1)+2},
  {active:'brick',passive:'fitness',id:'one-ton-iron',name:'1-ton Iron',apply:()=>levels.brick=(levels.brick||1)+2},
  {active:'drill',passive:'ammo',id:'whistling-arrow',name:'Whistling Arrow',apply:()=>levels.drill=(levels.drill||1)+2},
  {active:'durian',passive:'fuel',id:'caltrops',name:'Caltrops',apply:()=>levels.durian=(levels.durian||1)+2},
  {active:'forcefield',passive:'drink',id:'force-barrier',name:'Force Barrier',apply:()=>levels.forcefield=(levels.forcefield||1)+2},
  {active:'guardian',passive:'bracer',id:'defender',name:'Defender',apply:()=>levels.guardian=(levels.guardian||1)+2},
  {active:'laser',passive:'cube',id:'death-ray',name:'Death Ray',apply:()=>levels.laser=(levels.laser||1)+2},
  {active:'lightning',passive:'cube',id:'supercell',name:'Supercell',apply:()=>levels.lightning=(levels.lightning||1)+2},
  {active:'mine',passive:'molotov',id:'inferno-bomb',name:'Inferno Bomb',apply:()=>levels.mine=(levels.mine||1)+2},
  {active:'mine',passive:'lightning',id:'thunderbolt-bomb',name:'Thunderbolt Bomb',apply:()=>levels.mine=(levels.mine||1)+2},
  {active:'molotov',passive:'oil',id:'fuel-barrel',name:'Fuel Barrel',apply:()=>levels.molotov=(levels.molotov||1)+2},
  {active:'slash',passive:'ronin',id:'moonhalo-slash',name:'Moonhalo Slash',apply:()=>levels.slash=(levels.slash||1)+2},
  {active:'rpg',passive:'fuel',id:'sharkmaw-gun',name:'Sharkmaw Gun',apply:()=>levels.rpg=(levels.rpg||1)+2},
  {active:'soccer',passive:'shoes',id:'quantum-ball',name:'Quantum Ball',apply:()=>levels.soccer=(levels.soccer||1)+2}
];

function checkEvolutions(){
  evolutions.forEach(e=>{
    const activeReady=owned[e.active];
    const passiveReady=e.passive==='molotov'||e.passive==='lightning' ? owned[e.passive] : owned[e.passive];
    if(activeReady&&passiveReady&&!evolved[e.id]){
      evolved[e.id]=true;e.apply();evoBanner='EVO UNLOCKED: '+e.name;evoBannerTime=3.2;burst(p.x,p.y,42)
    }
  })
}

function chooseUpgrade(u){
  owned[u.id]=true;
  if(u.kind==='Active') levels[u.id]=(levels[u.id]||0)+1;
  else u.apply();
  checkEvolutions();ui.level.classList.add('hide');paused=false
}

function levelUp(){
  paused=true;ui.level.classList.remove('hide');ui.choices.innerHTML='';
  const pool=[...upgrades].sort(()=>Math.random()-.5).slice(0,3);
  pool.forEach(u=>{
    let b=document.createElement('button');b.className='choice';
    const lv=u.kind==='Active'?' Lv.'+(levels[u.id]||0):'';
    const ownedTag=owned[u.id]?' • OWNED':'';
    b.innerHTML='<b>'+u.kind+' — '+u.name+lv+ownedTag+'</b>'+u.desc;
    b.onclick=()=>chooseUpgrade(u);ui.choices.appendChild(b)
  })
}

function spawnEnemy(boss=false){
  let a=Math.random()*Math.PI*2,d=Math.max(W,H)*.65+80;
  let type=boss?3:(t>40&&Math.random()<.16?2:t>15&&Math.random()<.3?1:0);
  const bossMult=type===3?difficulty.bossPower:1;
  let hp=[30,65,45,700][type]*(1+t/180)*difficulty.enemyHp*bossMult;
  const speed=[85,55,125,45][type]*(1+Math.min(t/400,.6))*difficulty.enemySpeed*(type===3?Math.max(.9,difficulty.bossPower*.65):1);
  enemies.push({x:p.x+Math.cos(a)*d,y:p.y+Math.sin(a)*d,r:[12,18,10,40][type],hp,max:hp,speed,type,hit:0})
}

function nearestEnemy(){
  if(!enemies.length)return null;
  return enemies.reduce((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)<Math.hypot(b.x-p.x,b.y-p.y)?a:b)
}
function hitDamage(mult=1){return p.damage*mult*(Math.random()<p.crit?p.critDamage:1)}

function fire(){
  const e=nearestEnemy();if(!e)return;
  let a=Math.atan2(e.y-p.y,e.x-p.x);
  for(let i=0;i<p.multi;i++){
    let off=(i-(p.multi-1)/2)*.13,aa=a+off;
    bullets.push({type:'pulse',x:p.x,y:p.y,vx:Math.cos(aa)*p.bulletSpeed,vy:Math.sin(aa)*p.bulletSpeed,r:5,life:1.8,pierce:p.pierce,damage:hitDamage(1)})
  }
}

function radialShot(type,count,speed,damage,life=2,r=6,pierce=0){
  for(let i=0;i<count;i++){
    const a=i*Math.PI*2/count+t*.7;
    bullets.push({type,x:p.x,y:p.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r,life,pierce,damage})
  }
}

function targetedShot(type,speed,damage,pierce=0,spread=0){
  const e=nearestEnemy();if(!e)return;
  let a=Math.atan2(e.y-p.y,e.x-p.x)+(Math.random()-.5)*spread;
  bullets.push({type,x:p.x,y:p.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:type==='rpg'?8:6,life:3,pierce,damage,target:e})
}

function activateSkills(dt){
  const cd=(base)=>Math.max(.18,base*(owned.cube?.84:1));

  if(owned.boomerang&&(timers.boomerang-=dt)<=0){
    timers.boomerang=cd(2.1);radialShot('boomerang',Math.min(2+(levels.boomerang||1),7),260,hitDamage(.9),2.6,7,1)
  }
  if(owned.brick&&(timers.brick-=dt)<=0){
    timers.brick=cd(1.8);for(let i=0;i<Math.min(levels.brick||1,5);i++) targetedShot('brick',190,hitDamage(1.45),1,.5)
  }
  if(owned.drill&&(timers.drill-=dt)<=0){
    timers.drill=cd(1.25);for(let i=0;i<Math.min(1+(levels.drill||1),6);i++) targetedShot('drill',p.bulletSpeed*1.3,hitDamage(.75),99,.3)
  }
  if(owned.durian&&(timers.durian-=dt)<=0){
    timers.durian=cd(2.6);radialShot('durian',1,210,hitDamage(1.6),5,12,99)
  }
  if(owned.laser&&(timers.laser-=dt)<=0){
    timers.laser=cd(1.7);for(let i=0;i<Math.min(levels.laser||1,5);i++) targetedShot('laser',900,hitDamage(1.25),99,.42)
  }
  if(owned.lightning&&(timers.lightning-=dt)<=0){
    timers.lightning=cd(2.2);
    [...enemies].sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))
      .slice(0,Math.min(2+(levels.lightning||1),8)).forEach(e=>{e.hp-=hitDamage(1.2);burst(e.x,e.y,7)})
  }
  if(owned.mine&&(timers.mine-=dt)<=0){
    timers.mine=cd(2.4);mines.push({x:p.x+(Math.random()-.5)*80,y:p.y+(Math.random()-.5)*80,r:10,life:6,damage:hitDamage(1.8),radius:55*p.area})
  }
  if(owned.molotov&&(timers.molotov-=dt)<=0){
    timers.molotov=cd(2.8);const e=nearestEnemy();if(e)zones.push({x:e.x,y:e.y,r:65*p.area,life:3*p.duration,damage:hitDamage(.35),kind:'fire'})
  }
  if(owned.slash&&(timers.slash-=dt)<=0){
    timers.slash=cd(1.9);enemies.forEach(e=>{if(Math.hypot(e.x-p.x,e.y-p.y)<125*p.area)e.hp-=hitDamage(1.4)});burst(p.x,p.y,20)
  }
  if(owned.rpg&&(timers.rpg-=dt)<=0){
    timers.rpg=cd(2.5);for(let i=0;i<Math.min(levels.rpg||1,4);i++) targetedShot('rpg',350,hitDamage(1.7),0,.35)
  }
  if(owned.soccer&&(timers.soccer-=dt)<=0){
    timers.soccer=cd(2.1);radialShot('soccer',Math.min(levels.soccer||1,5),330,hitDamage(1.05),4,8,4)
  }
}

function explode(px,py,r,damage){
  enemies.forEach(e=>{if(Math.hypot(e.x-px,e.y-py)<r+e.r)e.hp-=damage});burst(px,py,18)
}
function burst(px,py,n=7){
  for(let i=0;i<n;i++){
    let a=Math.random()*6.28,s=30+Math.random()*130;
    particles.push({x:px,y:py,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:.45})
  }
}

function update(dt){
  if(!running||paused)return;
  t+=dt;if(evoBannerTime>0)evoBannerTime-=dt;
  if(p.regen>0)p.hp=Math.min(p.max,p.hp+p.regen*dt);

  let dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);
  let dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
  if(touch){dx=(touch.x-touch.sx)/50;dy=(touch.y-touch.sy)/50}
  let m=Math.hypot(dx,dy)||1;
  if(Math.hypot(dx,dy)>0){p.x+=dx/m*p.speed*dt;p.y+=dy/m*p.speed*dt}
  p.x=Math.max(20,Math.min(W-20,p.x));p.y=Math.max(20,Math.min(H-20,p.y));

  spawn-=dt;
  let interval=Math.max(.08,(.72-t*.0025)/difficulty.spawnRate);
  if(spawn<=0){spawn=interval;spawnEnemy();if(t>90&&Math.random()<Math.min(.35,.12*difficulty.spawnRate))spawnEnemy()}
  if(t>=bossAt){
    spawnEnemy(true);
    if(difficulty.doubleBosses)spawnEnemy(true);
    bossAt+=60
  }

  shot-=dt;if(shot<=0){shot=p.rate;fire()}
  activateSkills(dt);

  if(owned.forcefield){
    const radius=(70+12*(levels.forcefield||1))*p.area;
    enemies.forEach(e=>{if(Math.hypot(e.x-p.x,e.y-p.y)<radius+e.r)e.hp-=hitDamage(.16)*dt*8})
  }

  p.orbit=owned.guardian?Math.min(2+(levels.guardian||1),8):0;
  if(p.orbit){
    for(let j=0;j<p.orbit;j++){
      let a=t*p.orbitSpeed+j*6.28/p.orbit,ox=p.x+Math.cos(a)*62,oy=p.y+Math.sin(a)*62;
      enemies.forEach(e=>{if(Math.hypot(e.x-ox,e.y-oy)<e.r+8&&e.hit<=0){e.hp-=hitDamage(.65);e.hit=.14;burst(e.x,e.y,3)}})
    }
  }

  bullets.forEach(b=>{
    if(b.type==='rpg'&&b.target&&b.target.hp>0){
      const a=Math.atan2(b.target.y-b.y,b.target.x-b.x),s=Math.hypot(b.vx,b.vy);
      b.vx=b.vx*.91+Math.cos(a)*s*.09;b.vy=b.vy*.91+Math.sin(a)*s*.09
    }
    b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt
  });

  zones.forEach(z=>{
    z.life-=dt;
    enemies.forEach(e=>{if(Math.hypot(e.x-z.x,e.y-z.y)<z.r+e.r)e.hp-=z.damage*dt})
  });
  zones=zones.filter(z=>z.life>0);

  mines.forEach(m=>{
    m.life-=dt;
    const hit=enemies.find(e=>Math.hypot(e.x-m.x,e.y-m.y)<m.r+e.r+8);
    if(hit||m.life<=0){explode(m.x,m.y,m.radius,m.damage);m.dead=1}
  });
  mines=mines.filter(m=>!m.dead);

  enemies.forEach(e=>{
    let a=Math.atan2(p.y-e.y,p.x-e.x);e.x+=Math.cos(a)*e.speed*dt;e.y+=Math.sin(a)*e.speed*dt;e.hit-=dt;
    if(Math.hypot(e.x-p.x,e.y-p.y)<e.r+p.r&&e.hit<=0){
      p.hp-=((e.type===3?24:10)*(1-p.armor));e.hit=.55;burst(p.x,p.y,10)
    }
  });

  bullets.forEach(b=>enemies.forEach(e=>{
    if(b.life>0&&Math.hypot(b.x-e.x,b.y-e.y)<b.r+e.r){
      e.hp-=b.damage;
      if(b.type==='rpg'){explode(b.x,b.y,(55+10*(levels.rpg||1))*p.area,hitDamage(.9));b.life=-1}
      else{b.life=b.pierce>0?(b.pierce--,b.life):-1;burst(b.x,b.y,3)}
    }
  }));

  for(let i=enemies.length-1;i>=0;i--){
    let e=enemies[i];
    if(e.hp<=0){
      kills++;
      const count=e.type===3?18:1;
      const value=(e.type===3?4.5:1.5)*difficulty.xpGain; // Base game already uses 1.5x EXP, then difficulty multiplies it.
      for(let z=0;z<count;z++)gems.push({x:e.x+(Math.random()-.5)*30,y:e.y+(Math.random()-.5)*30,v:value});
      burst(e.x,e.y,e.type===3?30:8);enemies.splice(i,1)
    }
  }

  gems.forEach(g=>{
    let d=Math.hypot(g.x-p.x,g.y-p.y);
    if(d<p.magnet){let a=Math.atan2(p.y-g.y,p.x-g.x),s=200+(p.magnet-d)*4;g.x+=Math.cos(a)*s*dt;g.y+=Math.sin(a)*s*dt}
    if(d<22){xp+=g.v;g.dead=1}
  });
  gems=gems.filter(g=>!g.dead);

  while(xp>=need&&!paused){
    xp-=need;level++;need=Math.floor(need*1.28+4);levelUp()
  }

  particles.forEach(q=>{q.x+=q.vx*dt;q.y+=q.vy*dt;q.l-=dt});
  particles=particles.filter(q=>q.l>0);bullets=bullets.filter(b=>b.life>0);

  if(p.hp<=0){
    running=false;best=Math.max(best,kills);localStorage.neonBest=best;ui.best.textContent=best;
    ui.score.textContent='Kills: '+kills+' • Survived: '+fmt(t);ui.over.classList.remove('hide')
  }

  ui.hp.style.width=Math.max(0,p.hp/p.max*100)+'%';
  ui.xp.style.width=Math.min(100,xp/need*100)+'%';
  ui.lv.textContent=level;ui.kills.textContent=kills;ui.time.textContent=fmt(t)
}

function fmt(v){return Math.floor(v/60)+':'+String(Math.floor(v%60)).padStart(2,'0')}

function draw(){
  x.fillStyle='#050712';x.fillRect(0,0,W,H);
  x.strokeStyle='#17213d';x.lineWidth=1;
  let s=48,ox=(-p.x*.12)%s,oy=(-p.y*.12)%s;
  for(let i=ox;i<W;i+=s){x.beginPath();x.moveTo(i,0);x.lineTo(i,H);x.stroke()}
  for(let i=oy;i<H;i+=s){x.beginPath();x.moveTo(0,i);x.lineTo(W,i);x.stroke()}

  if(owned.forcefield){
    const radius=(70+12*(levels.forcefield||1))*p.area;
    const g=x.createRadialGradient(p.x,p.y,10,p.x,p.y,radius);
    g.addColorStop(0,'rgba(80,255,170,.10)');g.addColorStop(1,'rgba(80,255,170,0)');
    x.fillStyle=g;x.beginPath();x.arc(p.x,p.y,radius,0,7);x.fill()
  }

  zones.forEach(z=>{x.fillStyle='rgba(255,95,35,.18)';x.beginPath();x.arc(z.x,z.y,z.r,0,7);x.fill()});
  mines.forEach(m=>{x.fillStyle='#ffbd2e';x.shadowBlur=12;x.shadowColor='#ff7a00';x.beginPath();x.arc(m.x,m.y,m.r,0,7);x.fill();x.shadowBlur=0});
  gems.forEach(g=>{x.fillStyle='#39f6e8';x.shadowBlur=12;x.shadowColor='#39f6e8';x.beginPath();x.arc(g.x,g.y,5,0,7);x.fill()});x.shadowBlur=0;

  bullets.forEach(b=>{
    const colors={pulse:'#fff',boomerang:'#ff526d',brick:'#cb8051',drill:'#ffd44f',durian:'#9fe34f',laser:'#ff47e6',rpg:'#ff9b42',soccer:'#5fe7ff'};
    x.fillStyle=colors[b.type]||'#fff';x.shadowBlur=15;x.shadowColor=x.fillStyle;x.beginPath();x.arc(b.x,b.y,b.r,0,7);x.fill()
  });x.shadowBlur=0;

  enemies.forEach(e=>{
    let col=['#ff426d','#b657ff','#ffb347','#ff315f'][e.type];
    x.fillStyle=col;x.shadowBlur=e.type===3?30:12;x.shadowColor=col;x.beginPath();x.arc(e.x,e.y,e.r,0,7);x.fill();x.shadowBlur=0;
    if(e.type===3){x.fillStyle='#25102a';x.fillRect(e.x-35,e.y-e.r-14,70,5);x.fillStyle='#ff426d';x.fillRect(e.x-35,e.y-e.r-14,70*e.hp/e.max,5)}
  });

  if(p.orbit)for(let j=0;j<p.orbit;j++){
    let a=t*p.orbitSpeed+j*6.28/p.orbit;x.save();x.translate(p.x+Math.cos(a)*62,p.y+Math.sin(a)*62);x.rotate(a);
    x.fillStyle=evolved.defender?'#43e8ff':'#d861ff';x.shadowBlur=18;x.shadowColor=x.fillStyle;x.fillRect(-10,-4,20,8);x.restore()
  }
  x.shadowBlur=0;

  x.fillStyle='#46eaff';x.shadowBlur=24;x.shadowColor='#46eaff';x.beginPath();x.arc(p.x,p.y,p.r,0,7);x.fill();
  x.fillStyle='#07101d';x.beginPath();x.arc(p.x,p.y,6,0,7);x.fill();x.shadowBlur=0;

  particles.forEach(q=>{x.globalAlpha=Math.max(0,q.l/.45);x.fillStyle='#73efff';x.fillRect(q.x,q.y,3,3)});x.globalAlpha=1;

  if(touch){
    x.strokeStyle='#fff6';x.lineWidth=3;x.beginPath();x.arc(touch.sx,touch.sy,34,0,7);x.stroke();
    const len=Math.max(1,Math.hypot(touch.x-touch.sx,touch.y-touch.sy));
    x.beginPath();x.arc(touch.sx+(touch.x-touch.sx)/len*Math.min(25,len),touch.sy+(touch.y-touch.sy)/len*Math.min(25,len),12,0,7);x.stroke()
  }

  if(evoBannerTime>0){
    x.save();x.textAlign='center';x.font='900 22px system-ui';x.fillStyle='#ffe66d';x.shadowBlur=20;x.shadowColor='#ffca3a';
    x.fillText(evoBanner,W/2,90);x.restore()
  }
}

function loop(now){let dt=Math.min(.033,(now-last)/1000||0);last=now;update(dt);draw();requestAnimationFrame(loop)}
requestAnimationFrame(loop);