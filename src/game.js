const c=document.querySelector('#game'),x=c.getContext('2d');
let W,H,dpr;
function resize(){dpr=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;c.width=W*dpr;c.height=H*dpr;x.setTransform(dpr,0,0,dpr,0,0)}
addEventListener('resize',resize);resize();

const ui={
  hp:document.querySelector('#hp'),xp:document.querySelector('#xp'),lv:document.querySelector('#lv'),
  kills:document.querySelector('#kills'),time:document.querySelector('#time'),best:document.querySelector('#best'),
  start:document.querySelector('#start'),level:document.querySelector('#level'),over:document.querySelector('#over'),
  choices:document.querySelector('#choices'),score:document.querySelector('#score')
};

let keys={},running=false,paused=false,last=0,t=0,kills=0,level=1,xp=0,need=10;
let enemies=[],bullets=[],gems=[],particles=[],spawn=0,shot=0,bossAt=60;
let skillTimers={lightning:0,flame:0,rocket:0};
let owned={},evolved={},evoBanner='',evoBannerTime=0;
let best=+localStorage.neonBest||0;ui.best.textContent=best;

let p={
  x:W/2,y:H/2,r:14,hp:100,max:100,speed:250,damage:18,rate:.48,bulletSpeed:600,
  multi:1,pierce:0,magnet:90,orbit:0,orbitDamage:1,orbitSpeed:2.4,
  lightningTargets:0,lightningRate:2.2,flameRadius:0,flameDamage:0,
  rockets:0,rocketRadius:55,rocketDamage:1
};

addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=1;if(e.key==='Escape')paused=!paused});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=0);

let touch=null;
c.addEventListener('pointerdown',e=>touch={sx:e.clientX,sy:e.clientY,x:e.clientX,y:e.clientY});
c.addEventListener('pointermove',e=>{if(touch){touch.x=e.clientX;touch.y=e.clientY}});
c.addEventListener('pointerup',()=>touch=null);
c.addEventListener('pointercancel',()=>touch=null);

function reset(){
  t=0;kills=0;level=1;xp=0;need=10;enemies=[];bullets=[];gems=[];particles=[];spawn=0;shot=0;bossAt=60;
  skillTimers={lightning:0,flame:0,rocket:0};
  owned={pulse:true};evolved={};evoBanner='';evoBannerTime=0;
  p={x:W/2,y:H/2,r:14,hp:100,max:100,speed:250,damage:18,rate:.48,bulletSpeed:600,multi:1,pierce:0,magnet:90,orbit:0,orbitDamage:1,orbitSpeed:2.4,lightningTargets:0,lightningRate:2.2,flameRadius:0,flameDamage:0,rockets:0,rocketRadius:55,rocketDamage:1};
  running=true;paused=false;ui.over.classList.add('hide');ui.start.classList.add('hide')
}

document.querySelector('#play').onclick=reset;
document.querySelector('#again').onclick=reset;

const upgrades=[
  {id:'overcharge',kind:'Passive',name:'Overcharge Core',desc:'+35% projectile damage',apply:()=>p.damage*=1.35},
  {id:'ammo',kind:'Passive',name:'Ammo Thruster',desc:'Fire 18% faster',apply:()=>p.rate*=.82},
  {id:'twin',kind:'Passive',name:'Twin Matrix',desc:'+1 projectile',apply:()=>p.multi=Math.min(5,p.multi+1)},
  {id:'pierce',kind:'Passive',name:'Phase Pierce',desc:'Projectiles pierce +1 enemy',apply:()=>p.pierce++},
  {id:'shoes',kind:'Passive',name:'Vector Boots',desc:'Move 15% faster',apply:()=>p.speed*=1.15},
  {id:'vital',kind:'Passive',name:'Vital Matrix',desc:'+30 max HP and heal',apply:()=>{p.max+=30;p.hp=Math.min(p.max,p.hp+30)}},
  {id:'magnet',kind:'Passive',name:'Flux Magnet',desc:'Pickup range +45%',apply:()=>p.magnet*=1.45},
  {id:'fuel',kind:'Passive',name:'Reactor Fuel',desc:'Area effects become stronger',apply:()=>{p.flameRadius*=1.15;p.rocketRadius*=1.15}},
  {id:'cube',kind:'Passive',name:'Energy Cube',desc:'Skill cooldowns become faster',apply:()=>{p.lightningRate*=.82}},
  {id:'bracer',kind:'Passive',name:'Exo Bracer',desc:'Orbit weapons spin faster',apply:()=>p.orbitSpeed*=1.22},
  {id:'repair',kind:'Passive',name:'Repair Nanites',desc:'Restore 45 HP',apply:()=>p.hp=Math.min(p.max,p.hp+45)},

  {id:'orbit',kind:'Active',name:'Orbit Blade',desc:'Adds a rotating energy blade',apply:()=>p.orbit=Math.min(6,p.orbit+1)},
  {id:'lightning',kind:'Active',name:'Arc Coil',desc:'Periodically shocks nearby enemies',apply:()=>p.lightningTargets=Math.min(6,p.lightningTargets+1)},
  {id:'flame',kind:'Active',name:'Nova Flask',desc:'Creates a damaging energy field around you',apply:()=>{p.flameRadius=Math.max(80,p.flameRadius+18);p.flameDamage=Math.max(7,p.flameDamage+3)}},
  {id:'rocket',kind:'Active',name:'Rocket Pod',desc:'Launches explosive seeker rockets',apply:()=>p.rockets=Math.min(4,p.rockets+1)}
];

const evolutions=[
  {active:'pulse',passive:'ammo',id:'hyper',name:'Hyper Barrage',apply:()=>{p.multi=Math.min(7,p.multi+2);p.rate*=.72;p.damage*=1.15}},
  {active:'orbit',passive:'bracer',id:'aegis',name:'Aegis Ring',apply:()=>{p.orbit=Math.max(3,p.orbit+1);p.orbitDamage*=1.85;p.orbitSpeed*=1.3}},
  {active:'lightning',passive:'cube',id:'supercell',name:'Supercell Core',apply:()=>{p.lightningTargets=Math.max(4,p.lightningTargets+2);p.lightningRate*=.58;p.damage*=1.12}},
  {active:'flame',passive:'fuel',id:'inferno',name:'Inferno Core',apply:()=>{p.flameRadius=Math.max(135,p.flameRadius*1.55);p.flameDamage=Math.max(16,p.flameDamage*2)}},
  {active:'rocket',passive:'fuel',id:'abyss',name:'Abyss Missile',apply:()=>{p.rockets=Math.max(2,p.rockets+1);p.rocketRadius*=1.7;p.rocketDamage*=1.9}},
  {active:'orbit',passive:'magnet',id:'rebound',name:'Rebound Halo',apply:()=>{p.orbit=Math.max(4,p.orbit+2);p.orbitDamage*=1.35;p.magnet*=1.3}}
];

function checkEvolutions(){
  evolutions.forEach(e=>{
    if(owned[e.active]&&owned[e.passive]&&!evolved[e.id]){
      evolved[e.id]=true;e.apply();
      evoBanner='EVO UNLOCKED: '+e.name;evoBannerTime=3.2;
      burst(p.x,p.y,40)
    }
  })
}

function chooseUpgrade(u){
  owned[u.id]=true;u.apply();checkEvolutions();
  ui.level.classList.add('hide');paused=false
}

function levelUp(){
  paused=true;ui.level.classList.remove('hide');ui.choices.innerHTML='';
  [...upgrades].sort(()=>Math.random()-.5).slice(0,3).forEach(u=>{
    let b=document.createElement('button');b.className='choice';
    const ownedTag=owned[u.id]?' • UPGRADE':'';
    b.innerHTML='<b>'+u.kind+' — '+u.name+ownedTag+'</b>'+u.desc;
    b.onclick=()=>chooseUpgrade(u);ui.choices.appendChild(b)
  })
}

function spawnEnemy(boss=false){
  let a=Math.random()*Math.PI*2,d=Math.max(W,H)*.65+80;
  let type=boss?3:(t>40&&Math.random()<.16?2:t>15&&Math.random()<.3?1:0);
  let hp=[30,65,45,700][type]*(1+t/180);
  enemies.push({x:p.x+Math.cos(a)*d,y:p.y+Math.sin(a)*d,r:[12,18,10,40][type],hp,max:hp,speed:[85,55,125,45][type]*(1+Math.min(t/400,.6)),type,hit:0})
}

function nearestEnemy(){
  if(!enemies.length)return null;
  return enemies.reduce((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)<Math.hypot(b.x-p.x,b.y-p.y)?a:b)
}

function fire(){
  const e=nearestEnemy();if(!e)return;
  let a=Math.atan2(e.y-p.y,e.x-p.x);
  for(let i=0;i<p.multi;i++){
    let off=(i-(p.multi-1)/2)*.13,aa=a+off;
    bullets.push({type:'pulse',x:p.x,y:p.y,vx:Math.cos(aa)*p.bulletSpeed,vy:Math.sin(aa)*p.bulletSpeed,r:5,life:1.8,pierce:p.pierce,damage:p.damage})
  }
}

function fireRocket(){
  if(!p.rockets)return;
  for(let i=0;i<p.rockets;i++){
    const e=enemies.length?enemies[Math.floor(Math.random()*enemies.length)]:null;if(!e)continue;
    let a=Math.atan2(e.y-p.y,e.x-p.x);
    bullets.push({type:'rocket',x:p.x,y:p.y,vx:Math.cos(a)*340,vy:Math.sin(a)*340,r:7,life:3,pierce:0,damage:p.damage*1.5,target:e})
  }
}

function chainLightning(){
  if(!p.lightningTargets||!enemies.length)return;
  const sorted=[...enemies].sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y)).slice(0,p.lightningTargets);
  sorted.forEach(e=>{e.hp-=p.damage*1.35;burst(e.x,e.y,8)});
  if(sorted.length)burst(p.x,p.y,12)
}

function explode(px,py,r,damage){
  enemies.forEach(e=>{if(Math.hypot(e.x-px,e.y-py)<r+e.r)e.hp-=damage});
  burst(px,py,18)
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

  let dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);
  let dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
  if(touch){dx=(touch.x-touch.sx)/50;dy=(touch.y-touch.sy)/50}
  let m=Math.hypot(dx,dy)||1;
  if(Math.hypot(dx,dy)>0){p.x+=dx/m*p.speed*dt;p.y+=dy/m*p.speed*dt}
  p.x=Math.max(20,Math.min(W-20,p.x));p.y=Math.max(20,Math.min(H-20,p.y));

  spawn-=dt;
  let interval=Math.max(.12,.72-t*.0025);
  if(spawn<=0){spawn=interval;spawnEnemy();if(t>90&&Math.random()<.12)spawnEnemy()}
  if(t>=bossAt){spawnEnemy(true);bossAt+=60}

  shot-=dt;if(shot<=0){shot=p.rate;fire()}

  skillTimers.lightning-=dt;
  if(p.lightningTargets&&skillTimers.lightning<=0){skillTimers.lightning=p.lightningRate;chainLightning()}

  skillTimers.rocket-=dt;
  if(p.rockets&&skillTimers.rocket<=0){skillTimers.rocket=evolved.abyss?1.5:2.7;fireRocket()}

  if(p.flameRadius){
    enemies.forEach(e=>{
      if(Math.hypot(e.x-p.x,e.y-p.y)<p.flameRadius+e.r)e.hp-=p.flameDamage*dt
    })
  }

  bullets.forEach(b=>{
    if(b.type==='rocket'&&b.target&&b.target.hp>0){
      const a=Math.atan2(b.target.y-b.y,b.target.x-b.x),s=Math.hypot(b.vx,b.vy);
      b.vx=b.vx*.92+Math.cos(a)*s*.08;b.vy=b.vy*.92+Math.sin(a)*s*.08
    }
    b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt
  });

  enemies.forEach(e=>{
    let a=Math.atan2(p.y-e.y,p.x-e.x);e.x+=Math.cos(a)*e.speed*dt;e.y+=Math.sin(a)*e.speed*dt;e.hit-=dt;
    if(Math.hypot(e.x-p.x,e.y-p.y)<e.r+p.r&&e.hit<=0){p.hp-=e.type===3?24:10;e.hit=.55;burst(p.x,p.y,10)}
  });

  if(p.orbit){
    for(let j=0;j<p.orbit;j++){
      let a=t*p.orbitSpeed+j*6.28/p.orbit,ox=p.x+Math.cos(a)*58,oy=p.y+Math.sin(a)*58;
      enemies.forEach(e=>{
        if(Math.hypot(e.x-ox,e.y-oy)<e.r+8&&e.hit<=0){e.hp-=p.damage*.65*p.orbitDamage;e.hit=.16;burst(e.x,e.y,3)}
      })
    }
  }

  bullets.forEach(b=>enemies.forEach(e=>{
    if(b.life>0&&Math.hypot(b.x-e.x,b.y-e.y)<b.r+e.r){
      e.hp-=b.damage;
      if(b.type==='rocket'){explode(b.x,b.y,p.rocketRadius,p.damage*p.rocketDamage);b.life=-1}
      else{b.life=b.pierce>0?(b.pierce--,b.life):-1;burst(b.x,b.y,3)}
    }
  }));

  for(let i=enemies.length-1;i>=0;i--){
    let e=enemies[i];
    if(e.hp<=0){
      kills++;let count=e.type===3?18:1;
      for(let z=0;z<count;z++)gems.push({x:e.x+(Math.random()-.5)*30,y:e.y+(Math.random()-.5)*30,v:e.type===3?3:1});
      burst(e.x,e.y,e.type===3?30:8);enemies.splice(i,1)
    }
  }

  gems.forEach(g=>{
    let d=Math.hypot(g.x-p.x,g.y-p.y);
    if(d<p.magnet){let a=Math.atan2(p.y-g.y,p.x-g.x),s=200+(p.magnet-d)*4;g.x+=Math.cos(a)*s*dt;g.y+=Math.sin(a)*s*dt}
    if(d<22){xp+=g.v;g.dead=1}
  });
  gems=gems.filter(g=>!g.dead);

  if(xp>=need){xp-=need;level++;need=Math.floor(need*1.28+4);levelUp()}
  particles.forEach(q=>{q.x+=q.vx*dt;q.y+=q.vy*dt;q.l-=dt});
  particles=particles.filter(q=>q.l>0);bullets=bullets.filter(b=>b.life>0);

  if(p.hp<=0){
    running=false;best=Math.max(best,kills);localStorage.neonBest=best;ui.best.textContent=best;
    ui.score.textContent='Kills: '+kills+' • Survived: '+fmt(t);ui.over.classList.remove('hide')
  }

  ui.hp.style.width=Math.max(0,p.hp/p.max*100)+'%';
  ui.xp.style.width=xp/need*100+'%';
  ui.lv.textContent=level;ui.kills.textContent=kills;ui.time.textContent=fmt(t)
}

function fmt(v){return Math.floor(v/60)+':'+String(Math.floor(v%60)).padStart(2,'0')}

function draw(){
  x.fillStyle='#050712';x.fillRect(0,0,W,H);
  x.strokeStyle='#17213d';x.lineWidth=1;
  let s=48,ox=(-p.x*.12)%s,oy=(-p.y*.12)%s;
  for(let i=ox;i<W;i+=s){x.beginPath();x.moveTo(i,0);x.lineTo(i,H);x.stroke()}
  for(let i=oy;i<H;i+=s){x.beginPath();x.moveTo(0,i);x.lineTo(W,i);x.stroke()}

  if(p.flameRadius){
    const grad=x.createRadialGradient(p.x,p.y,10,p.x,p.y,p.flameRadius);
    grad.addColorStop(0,'rgba(255,110,40,.12)');grad.addColorStop(1,'rgba(255,60,120,0)');
    x.fillStyle=grad;x.beginPath();x.arc(p.x,p.y,p.flameRadius,0,7);x.fill()
  }

  gems.forEach(g=>{x.fillStyle='#39f6e8';x.shadowBlur=12;x.shadowColor='#39f6e8';x.beginPath();x.arc(g.x,g.y,5,0,7);x.fill()});
  x.shadowBlur=0;

  bullets.forEach(b=>{
    x.fillStyle=b.type==='rocket'?'#ffb347':'#fff';x.shadowBlur=15;x.shadowColor=b.type==='rocket'?'#ff7a32':'#4beaff';
    x.beginPath();x.arc(b.x,b.y,b.r,0,7);x.fill()
  });
  x.shadowBlur=0;

  enemies.forEach(e=>{
    let col=['#ff426d','#b657ff','#ffb347','#ff315f'][e.type];
    x.fillStyle=col;x.shadowBlur=e.type===3?30:12;x.shadowColor=col;x.beginPath();x.arc(e.x,e.y,e.r,0,7);x.fill();x.shadowBlur=0;
    if(e.type===3){x.fillStyle='#25102a';x.fillRect(e.x-35,e.y-e.r-14,70,5);x.fillStyle='#ff426d';x.fillRect(e.x-35,e.y-e.r-14,70*e.hp/e.max,5)}
  });

  if(p.orbit)for(let j=0;j<p.orbit;j++){
    let a=t*p.orbitSpeed+j*6.28/p.orbit;x.save();x.translate(p.x+Math.cos(a)*58,p.y+Math.sin(a)*58);x.rotate(a);
    x.fillStyle=evolved.aegis?'#43e8ff':'#d861ff';x.shadowBlur=18;x.shadowColor=x.fillStyle;x.fillRect(-10,-4,20,8);x.restore()
  }
  x.shadowBlur=0;

  x.fillStyle='#46eaff';x.shadowBlur=24;x.shadowColor='#46eaff';x.beginPath();x.arc(p.x,p.y,p.r,0,7);x.fill();
  x.fillStyle='#07101d';x.beginPath();x.arc(p.x,p.y,6,0,7);x.fill();x.shadowBlur=0;

  particles.forEach(q=>{x.globalAlpha=Math.max(0,q.l/.45);x.fillStyle='#73efff';x.fillRect(q.x,q.y,3,3)});
  x.globalAlpha=1;

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