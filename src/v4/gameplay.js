/* Neon Rift Survivor V4 — Rift Expedition gameplay/meta progression layer */
(() => {
  const V4=window.NeonV4;if(!V4)return;
  const R=V4.runtime,S=()=>V4.save;
  let run=null,eliteSeen=new Set(),bossSeen=new Set(),lastState=state,gpPrev=[],missionComplete=false;

  function selected(){return S().selected;}
  function operator(){return V4.operators[selected().operator]||V4.operators.nova;}
  function arena(){return V4.arenas[selected().arena]||V4.arenas['neon-city'];}
  function runMode(){return V4.runModes[selected().runMode]||V4.runModes.endless;}
  function pLevel(id){return Number(S().progression[id]||0);}
  function difficultyMult(){return ({easy:.8,standard:1,nightmare:1.5,impossible:2.25,custom:1}[selectedMode]||1);}

  function applyProgression(){
    p.damage*=1+pLevel('damage')*.02;
    p.max+=pLevel('health')*5;p.hp+=pLevel('health')*5;
    p.speed*=1+pLevel('speed')*.015;
    p.v4Shield=(p.v4Shield||0)+pLevel('shield')*5;
    p.v4ShieldMax=p.v4Shield;
    p.v4Lifesteal=pLevel('lifesteal')*.0035;
    p.v4Dodge=(p.v4Dodge||0)+pLevel('dodge')*.015;
    window.NeonV4Luck=pLevel('luck');
    window.NeonV4ExtraRerolls=pLevel('reroll');
  }

  function applyArenaStart(){
    const a=arena();
    if(a.hazard==='frost')p.speed*=.98;
    if(a.hazard==='magma')p.damage*=1.03;
    if(a.hazard==='anomaly'){p.damage*=1.05;p.max=Math.max(60,p.max-8);p.hp=Math.min(p.hp,p.max);}
  }

  function dailySelection(){
    const key=V4.dailyKey(),seed=V4.hash('neon-v4-'+key),rng=V4.rng(seed);
    const ops=Object.keys(V4.operators),ars=Object.keys(V4.arenas);
    return {operator:ops[Math.floor(rng()*ops.length)],arena:ars[Math.floor(rng()*ars.length)],seed,key};
  }

  function restoreRandom(){if(Math.random!==R.nativeRandom)Math.random=R.nativeRandom;}
  function prepareRandom(){
    restoreRandom();
    if(selected().runMode!=='daily')return;
    const d=dailySelection();selected().operator=d.operator;selected().arena=d.arena;V4.persist();
    Math.random=V4.rng(d.seed);
  }

  function applyOperator(){operator().apply(p);updateLoadout();}

  function startRun(){
    run={started:Date.now(),bosses:0,ascension:0,elites:0,statusHits:0,arena:selected().arena,operator:selected().operator,runMode:selected().runMode,daily:V4.dailyKey(),result:'active'};
    R.run=run;R.mythicPicks=0;R.ultimate=new Set();R.hazards=[];R.hostile=[];R.floaters=[];
    eliteSeen=new Set();bossSeen=new Set();missionComplete=false;lastState=STATES.PLAYING;
    V4.startAmbient?.();V4.meta?.sync?.();
  }

  const resetBeforeV4=reset;
  reset=function(){
    window.NeonV4Luck=pLevel('luck');window.NeonV4ExtraRerolls=pLevel('reroll');prepareRandom();
    const result=resetBeforeV4();
    applyProgression();applyOperator();applyArenaStart();startRun();
    if(selected().runMode==='daily')V4.meta?.renderSelections?.();
    return result;
  };
  const play=document.querySelector('#play'),again=document.querySelector('#again');if(play)play.onclick=reset;if(again)again.onclick=reset;

  function eliteModifier(){const types=['swift','fortified','explosive','berserk','vampiric'];return types[(Math.random()*types.length)|0];}
  function tagV4Enemy(e){
    if(!e||eliteSeen.has(e.id))return;eliteSeen.add(e.id);
    if(e.archetype==='rift-warden'){
      const a=arena();e.v4Boss=a.boss;e.v4Arena=selected().arena;e.max*=1.18;e.hp=e.max;e.aiSpeed*=1.06;e.v4Attack=1.2;bossSeen.add(e.id);V4.sfx?.boss();
      return;
    }
    if(t>40&&Math.random()<.085){
      e.v4Elite=eliteModifier();run.elites++;
      if(e.v4Elite==='swift')e.aiSpeed=(e.aiSpeed||e.speed)*1.35;
      if(e.v4Elite==='fortified'){e.max*=1.8;e.hp=e.max;e.r*=1.12;}
      if(e.v4Elite==='berserk'){e.aiSpeed=(e.aiSpeed||e.speed)*1.18;e.v4Damage=1.35;}
      if(e.v4Elite==='vampiric')e.v4Damage=1.12;
      if(e.v4Elite==='explosive')e.r*=1.08;
      if(e.v4Elite==='vampiric')e.v4Regen=.004;
    }
  }

  const spawnBefore=spawnEnemy;
  spawnEnemy=function(boss=false){const n=enemies.length;const v=spawnBefore(boss);for(let i=n;i<enemies.length;i++)tagV4Enemy(enemies[i]);return v;};

  function spawnHazard(kind){
    const px=40+Math.random()*Math.max(1,W-80),py=80+Math.random()*Math.max(1,H-140);
    if(kind==='laser')R.hazards.push({kind:'laser',axis:Math.random()<.5?'x':'y',pos:Math.random()*(Math.random()<.5?W:H),warn:1.1,active:.55,life:1.65});
    else R.hazards.push({kind,x:px,y:py,r:kind==='magma'?72:kind==='anomaly'?88:68,warn:1.0,active:1.8,life:2.8});
  }

  function updateHazards(dt){
    const a=arena(),rm=selected().runMode;
    run.hazardCd=(run.hazardCd||8)-dt;
    if(run.hazardCd<=0){
      const kind=a.hazard==='surge'?(Math.random()<.5?'anomaly':'frost'):a.hazard;
      spawnHazard(kind);run.hazardCd=rm==='ascension'?Math.max(3.8,8-run.ascension*.5):7.5+Math.random()*4;
    }
    for(const h of R.hazards){h.life-=dt;h.warn=Math.max(0,h.warn-dt);if(h.warn<=0)h.active=Math.max(0,h.active-dt);
      if(h.warn>0||h.active<=0)continue;
      let hit=false;
      if(h.kind==='laser'){const d=h.axis==='x'?Math.abs(p.x-h.pos):Math.abs(p.y-h.pos);hit=d<18;}
      else hit=Math.hypot(p.x-h.x,p.y-h.y)<h.r+p.r;
      if(hit){
        if(h.kind==='frost'){if(!p.v4FrostBase)p.v4FrostBase=p.speed;p.v4Frost=.25;p.v4FrostTime=.45;p.speed=p.v4FrostBase*.75;}
        else if(h.kind==='anomaly'){p.hp-=5*dt;}
        else p.hp-=(h.kind==='magma'?12:9)*dt;
      }
    }
    R.hazards=R.hazards.filter(h=>h.life>0);
    if(p.v4FrostTime>0){p.v4FrostTime-=dt;}else{p.v4Frost=0;if(p.v4FrostBase){p.speed=p.v4FrostBase;p.v4FrostBase=0;}}
  }

  function addBossAttack(e,dt){
    if(!e?.v4Boss)return;e.v4Attack-=dt;
    if(e.v4Attack>0)return;
    const a=arena();
    if(a.hazard==='magma')for(let i=0;i<3;i++)R.hazards.push({kind:'magma',x:p.x+(Math.random()-.5)*180,y:p.y+(Math.random()-.5)*180,r:54,warn:.75,active:1.4,life:2.15});
    else if(a.hazard==='frost')for(let i=0;i<5;i++){const an=Math.random()*Math.PI*2;R.hostile.push({x:e.x,y:e.y,vx:Math.cos(an)*190,vy:Math.sin(an)*190,r:7,life:3,damage:8,kind:'cryo'});}
    else if(a.hazard==='laser')spawnHazard('laser');
    else if(a.hazard==='anomaly')for(let i=0;i<2;i++)spawnHazard('anomaly');
    else for(let i=0;i<6;i++){const an=i*Math.PI/3+t;R.hostile.push({x:e.x,y:e.y,vx:Math.cos(an)*210,vy:Math.sin(an)*210,r:6,life:3,damage:7,kind:'grid'});}
    e.v4Attack=Math.max(.7,2.4-(e.bossPhase||1)*.35-run.ascension*.08);
  }

  function updateHostile(dt){
    for(const s of R.hostile){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;if(s.life>0&&Math.hypot(s.x-p.x,s.y-p.y)<s.r+p.r){damagePlayer(s.damage);s.life=-1;}}
    R.hostile=R.hostile.filter(s=>s.life>0&&s.x>-80&&s.x<W+80&&s.y>-80&&s.y<H+80);
  }

  function damagePlayer(amount){
    if(Math.random()<Math.min(.45,p.v4Dodge||0)){V4.fx?.text(p.x,p.y,'DODGE','#9ef');return;}
    let left=amount;
    if((p.v4Shield||0)>0){const block=Math.min(p.v4Shield,left);p.v4Shield-=block;left-=block;V4.fx?.text(p.x,p.y,`-${Math.ceil(block)} SHIELD`,'#76f4ff');}
    if(left>0){p.hp-=left*(1-p.armor);V4.sfx?.damage();}
  }

  function updateShield(dt){
    if(!p.v4ShieldMax)return;p.v4ShieldDelay=(p.v4ShieldDelay||0)-dt;
    if(p.v4ShieldDelay<=0&&p.v4Shield<p.v4ShieldMax)p.v4Shield=Math.min(p.v4ShieldMax,p.v4Shield+2.2*dt);
  }

  function mitigateBaseDamage(before){
    if(before==null||p.hp>=before)return;
    const lost=before-p.hp;
    p.v4ShieldDelay=2.2;
    if(Math.random()<Math.min(.45,p.v4Dodge||0)){p.hp=before;V4.fx?.text(p.x,p.y,'DODGE','#9ef');return;}
    if((p.v4Shield||0)>0){const block=Math.min(p.v4Shield,lost);p.v4Shield-=block;p.hp=Math.min(p.max,p.hp+block);if(block>0)V4.fx?.text(p.x,p.y,`-${Math.ceil(block)} SHIELD`,'#76f4ff');}
  }

  function statusSystem(dt,beforeHp){
    let dealt=0;
    for(const e of enemies){
      const old=beforeHp.get(e.id);if(old!=null&&e.hp<old){const d=old-e.hp;dealt+=d;if((p.v4Knockback||0)>0){const an=Math.atan2(e.y-p.y,e.x-p.x);e.x+=Math.cos(an)*p.v4Knockback*d*.02;e.y+=Math.sin(an)*p.v4Knockback*d*.02;}}
      e.v4Statuses=e.v4Statuses||{};
      if(owned.plasma&&zones.some(z=>Math.hypot(e.x-z.x,e.y-z.y)<z.r+e.r)){e.v4Statuses.burn=.55;}
      if(owned.arc&&Math.random()<dt*.28){e.v4Statuses.shock=.35;}
      if(owned.field){const radius=(62+12*levelOf('field'))*p.area;if(Math.hypot(e.x-p.x,e.y-p.y)<radius+e.r)e.v4Statuses.slow=.25;}
      if(e.v4Statuses.burn>0){e.v4Statuses.burn-=dt;e.hp-=p.damage*.055*dt*(R.ultimate.has('supernova-grid')?1.6:1);}
      if(e.v4Statuses.shock>0){e.v4Statuses.shock-=dt;e.hp-=p.damage*.04*dt*(R.ultimate.has('supernova-grid')?1.7:1);}
      if(e.v4Statuses.slow>0){e.v4Statuses.slow-=dt;if(!e.v4BaseAi)e.v4BaseAi=e.aiSpeed||e.speed;if(e.aiSpeed)e.aiSpeed=e.v4BaseAi*.78;}
      else if(e.v4BaseAi&&e.aiSpeed)e.aiSpeed=e.v4BaseAi;
    }
    if(dealt>0&&(p.v4Lifesteal||0)>0)p.hp=Math.min(p.max,p.hp+Math.min(4,dealt*p.v4Lifesteal));
    if(p.hp<beforeHp.player)p.v4ShieldDelay=2.2;
  }

  function updateUltimateSynergies(){
    for(const def of V4.ultimateSynergies){if(R.ultimate.has(def.id))continue;if(def.requires.every(id=>levelOf(id)>0)){R.ultimate.add(def.id);V4.sfx?.synergy();evoBanner=`ULTIMATE SYNERGY: ${def.name}`;evoBannerTime=3.2;V4.fx?.ring(p.x,p.y,'#ff7cff',20,170,.75,5);
      if(def.id==='supernova-grid')p.damage*=1.14;
      if(def.id==='kinetic-tempest'){p.speed*=1.10;p.damage*=1.05;}
      if(def.id==='fortress-prime'){p.armor=Math.min(.68,p.armor+.08);p.v4Shield=(p.v4Shield||0)+20;p.v4ShieldMax=(p.v4ShieldMax||0)+20;}
      if(def.id==='nova-barrage')p.area*=1.10;
    }}
    V4.meta?.syncSynergies?.();
  }

  function removedEnemies(snapshot){
    const alive=new Set(enemies.map(e=>e.id));
    for(const [id,e] of snapshot){if(alive.has(id))continue;
      if(e.v4Elite==='explosive'&&Math.hypot(e.x-p.x,e.y-p.y)<115)damagePlayer(13);
      if(e.archetype==='rift-warden'||e.v4Boss){run.bosses++;V4.sfx?.chest();if(selected().runMode==='ascension')ascend();queueChest();}
    }
  }

  function ascend(){run.ascension++;difficulty.enemyHp*=1.13;difficulty.enemySpeed*=1.035;difficulty.spawnRate*=1.06;difficulty.bossPower*=1.12;evoBanner=`ASCENSION ${run.ascension} — RIFT INTENSIFIES`;evoBannerTime=3;}

  function chestGrade(){const r=Math.random()*100;return r<4?'LEGENDARY':r<24?'EPIC':'RARE';}
  function queueChest(){if(state!==STATES.PLAYING||document.querySelector('#v4Chest:not(.hide)'))return;const grade=chestGrade();setState(STATES.PAUSED);V4.meta?.showChest?.(grade,[
    {name:'Overdrive Core',desc:'+12% damage',apply:()=>p.damage*=1.12},
    {name:'Vital Cache',desc:'+30 max HP and heal 30',apply:()=>{p.max+=30;p.hp=Math.min(p.max,p.hp+30)}},
    {name:'Phase Capacitor',desc:'+20 shield and +3% dodge',apply:()=>{p.v4Shield=(p.v4Shield||0)+20;p.v4ShieldMax=(p.v4ShieldMax||0)+20;p.v4Dodge=(p.v4Dodge||0)+.03}}
  ]);}
  V4.takeChest=function(reward){try{reward.apply();}catch{}document.querySelector('#v4Chest')?.classList.add('hide');setState(STATES.PLAYING);V4.sfx?.chest();};

  function missionProgress(){
    const mode=selected().runMode;
    if(mode==='expedition')return Math.min(1,Math.min(t/360,run.bosses/2));
    if(mode==='daily')return Math.min(1,Math.min(t/300,run.bosses/1));
    return 0;
  }
  function checkMission(){if(missionComplete)return;const mode=selected().runMode;if(!['expedition','daily'].includes(mode))return;if(missionProgress()>=1){missionComplete=true;finishRun('victory');}}

  function scoreRun(){
    const evoCount=Object.values(evolved).filter(Boolean).length;
    const base=kills*110+Math.floor(t)*14+run.bosses*1600+evoCount*600+R.ultimate.size*900+run.elites*180;
    const mult=difficultyMult()*arena().score*runMode().score*(1+run.ascension*.12);
    return {score:Math.round(base*mult),mult,evoCount};
  }
  function leaderboardKey(){return selected().runMode==='daily'?`daily:${V4.dailyKey()}`:`${selected().runMode}:${selected().arena}:${selectedMode}`;}
  function addLeaderboard(entry){const k=leaderboardKey(),board=Array.isArray(S().leaderboards[k])?S().leaderboards[k]:[];board.push(entry);board.sort((a,b)=>b.score-a.score||b.seconds-a.seconds);S().leaderboards[k]=board.slice(0,10);}
  function updateAchievements(entry){S().lastRun=entry;for(const a of V4.achievements){if(!S().achievements[a.id]&&a.test(S()))S().achievements[a.id]={at:Date.now()};}}

  function finishRun(result='defeat'){
    if(!run||run.finished)return;run.finished=true;document.querySelector('#v4Chest')?.classList.add('hide');run.result=result;const q=scoreRun();const cores=Math.max(2,Math.floor(q.score/6500)+run.bosses*3+(result==='victory'?8:0));
    const entry={score:q.score,seconds:Math.floor(t),kills,bosses:run.bosses,evos:q.evoCount,ultimates:R.ultimate.size,operator:selected().operator,className:V4.getClassName(),arena:selected().arena,runMode:selected().runMode,difficulty:selectedMode,mult:q.mult,result,cores,date:Date.now(),mythics:R.mythicPicks};
    S().cores+=cores;S().stats.runs++;S().stats.kills+=kills;S().stats.bosses+=run.bosses;S().stats.seconds+=entry.seconds;S().stats.evos+=entry.evos;S().stats.mythics+=R.mythicPicks;S().stats.coresEarned+=cores;S().stats.bestScore=Math.max(S().stats.bestScore,q.score);S().history.unshift(entry);S().history=S().history.slice(0,30);S().lastRun=entry;addLeaderboard(entry);updateAchievements(entry);V4.persist();restoreRandom();V4.stopAmbient?.();
    ui.score.textContent=`${result==='victory'?'EXPEDITION COMPLETE':'RIFT COLLAPSED'} • ${q.score.toLocaleString()}`;ui.over.classList.remove('hide');setState(STATES.GAMEOVER);V4.meta?.renderRunResult?.(entry);V4.meta?.sync?.();
  }
  V4.finishRun=finishRun;

  function pollGamepad(){
    if(!S().settings.controller||!navigator.getGamepads)return;const gp=[...navigator.getGamepads()].find(Boolean);if(!gp)return;const ax=gp.axes?.[0]||0,ay=gp.axes?.[1]||0;
    keys.arrowleft=ax<-.25;keys.arrowright=ax>.25;keys.arrowup=ay<-.25;keys.arrowdown=ay>.25;
    const pressed=gp.buttons.map(b=>b.pressed);if(state===STATES.LEVEL){if(pressed[0]&&!gpPrev[0])document.querySelector('[data-choice="1"]')?.click();if(pressed[1]&&!gpPrev[1])document.querySelector('#rerollUpgrade')?.click();}
    if((pressed[9]&&!gpPrev[9])||((pressed[7]&&pressed[6])&&!(gpPrev[7]&&gpPrev[6]))){if(state===STATES.PLAYING)setState(STATES.PAUSED);else if(state===STATES.PAUSED)setState(STATES.PLAYING);}gpPrev=pressed;
  }

  c.addEventListener('pointerdown',()=>{if(S().settings.fixedJoystick&&touch){touch.sx=90;touch.sy=H-100;}},{passive:true});

  const updateBefore=update;
  update=function(dt){
    const was=state,beforeEnemy=new Map(enemies.map(e=>[e.id,{id:e.id,x:e.x,y:e.y,hp:e.hp,archetype:e.archetype,v4Elite:e.v4Elite,v4Boss:e.v4Boss}]));const hpBefore=new Map(enemies.map(e=>[e.id,e.hp]));hpBefore.player=p.hp;
    pollGamepad();const v=updateBefore(dt);
    if(was===STATES.PLAYING&&state!==STATES.GAMEOVER)mitigateBaseDamage(hpBefore.player);
    if(was===STATES.PLAYING&&state===STATES.GAMEOVER&&!run?.finished){finishRun('defeat');return v;}
    if(state!==STATES.PLAYING){lastState=state;return v;}
    for(const e of enemies){tagV4Enemy(e);if(e.v4Boss)addBossAttack(e,dt);if(e.v4Regen)e.hp=Math.min(e.max,e.hp+e.max*e.v4Regen*dt);}
    const bossNow=enemies.filter(e=>e.v4Boss&&e.hp>0);const bossName=document.querySelector('#bossName');if(bossName&&bossNow.length)bossName.textContent=bossNow.length>1?`${arena().boss} ×${bossNow.length}`:arena().boss;
    removedEnemies(beforeEnemy);updateHazards(dt);updateHostile(dt);updateShield(dt);statusSystem(dt,hpBefore);updateUltimateSynergies();V4.fx?.update(dt);checkMission();
    if((p.v4Frost||0)>0){p.x+=(Math.random()-.5)*.05;}
    V4.meta?.updateHud?.(missionProgress());lastState=state;return v;
  };

  const drawBefore=draw;
  draw=function(){drawBefore();const a=arena();x.save();x.fillStyle=`rgba(${a.tint},.025)`;x.fillRect(0,0,W,H);x.restore();
    for(const h of R.hazards){x.save();const warn=h.warn>0;const alpha=warn?.20:.38;x.globalAlpha=alpha;
      if(h.kind==='laser'){x.strokeStyle=warn?'#ffe66d':'#ff4778';x.lineWidth=warn?6:18;x.beginPath();if(h.axis==='x'){x.moveTo(h.pos,0);x.lineTo(h.pos,H);}else{x.moveTo(0,h.pos);x.lineTo(W,h.pos);}x.stroke();}
      else{x.fillStyle=h.kind==='frost'?'#78d9ff':h.kind==='magma'?'#ff6b32':h.kind==='anomaly'?'#d261ff':'#6ffff1';x.beginPath();x.arc(h.x,h.y,h.r,0,Math.PI*2);x.fill();}x.restore();}
    for(const s of R.hostile){x.save();x.fillStyle=s.kind==='cryo'?'#9fe8ff':s.kind==='grid'?'#5ffff1':'#ff5d9f';x.shadowBlur=14;x.shadowColor=x.fillStyle;x.beginPath();x.arc(s.x,s.y,s.r,0,Math.PI*2);x.fill();x.restore();}
    for(const e of enemies){if(!e.v4Elite&&!e.v4Boss)continue;x.save();x.strokeStyle=e.v4Boss?'#fff':e.v4Elite==='swift'?'#5fffe7':e.v4Elite==='fortified'?'#ffe56e':e.v4Elite==='explosive'?'#ff6b46':e.v4Elite==='vampiric'?'#ff5db7':'#ff4b6e';x.lineWidth=e.v4Boss?5:2;x.beginPath();x.arc(e.x,e.y,e.r+(e.v4Boss?14:5),0,Math.PI*2);x.stroke();x.restore();}
    V4.fx?.draw(x);
  };

  window.addEventListener('beforeunload',restoreRandom);
})();