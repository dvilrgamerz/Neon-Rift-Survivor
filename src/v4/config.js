/* Neon Rift Survivor V4 — shared configuration, saves, progression and content data */
(() => {
  const V4 = window.NeonV4 = window.NeonV4 || {};
  V4.version = '4.0.0';
  V4.saveKey = 'neonRiftV4Save';

  V4.operators = {
    nova: {name:'NOVA', icon:'✦', role:'Precision / Crit', desc:'+10% damage, +4% crit chance.', apply(p){p.damage*=1.10;p.crit=Math.min(.55,p.crit+.04);}},
    titan:{name:'TITAN',icon:'⬢',role:'Defense / Shield',desc:'+25 max HP, +8% armor, +15 shield.',apply(p){p.max+=25;p.hp+=25;p.armor=Math.min(.65,p.armor+.08);p.v4Shield=(p.v4Shield||0)+15;p.v4ShieldMax=(p.v4ShieldMax||0)+15;}},
    volt:{name:'VOLT',icon:'ϟ',role:'Chain / Cooldown',desc:'Starts with Arc Conductor Lv.1 and 4% faster skills.',apply(p){owned.arc=true;levels.arc=Math.max(1,levels.arc||0);p.cooldownMult*=.96;}},
    ghost:{name:'GHOST',icon:'◈',role:'Speed / Dodge',desc:'+15% movement speed and +8% dodge.',apply(p){p.speed*=1.15;p.v4Dodge=(p.v4Dodge||0)+.08;}},
    forge:{name:'FORGE',icon:'◆',role:'Explosive / Area',desc:'Starts with Rift Mine Lv.1 and +10% area.',apply(p){owned.mine=true;levels.mine=Math.max(1,levels.mine||0);p.area*=1.10;}}
  };

  V4.arenas = {
    'neon-city':{name:'NEON CITY',icon:'▦',desc:'Balanced city grid with energy surge hazards.',boss:'GRID TYRANT',tint:'74,234,255',hazard:'surge',score:1.00},
    'void-factory':{name:'VOID FACTORY',icon:'⚙',desc:'Industrial lanes with rotating laser sweeps.',boss:'ASSEMBLER PRIME',tint:'181,87,255',hazard:'laser',score:1.08},
    'frozen-rift':{name:'FROZEN RIFT',icon:'❄',desc:'Cryo storms periodically slow movement.',boss:'CRYO COLOSSUS',tint:'113,204,255',hazard:'frost',score:1.12},
    'magma-core':{name:'MAGMA CORE',icon:'▲',desc:'Magma vents create dangerous ground zones.',boss:'INFERNO ENGINE',tint:'255,106,61',hazard:'magma',score:1.18},
    'final-rift':{name:'FINAL RIFT',icon:'✹',desc:'Unstable anomaly field with mixed hazards.',boss:'RIFT SOVEREIGN',tint:'255,64,154',hazard:'anomaly',score:1.30}
  };

  V4.runModes = {
    endless:{name:'ENDLESS',desc:'Classic survival. Push score and time as far as possible.',score:1.00},
    expedition:{name:'EXPEDITION',desc:'Complete a 6-minute mission and defeat 2 bosses.',score:1.15},
    daily:{name:'DAILY CHALLENGE',desc:'Daily seeded run with a locked Operator and Arena.',score:1.25},
    ascension:{name:'RIFT ASCENSION',desc:'Every defeated boss permanently raises run difficulty.',score:1.35}
  };

  V4.progressionNodes = [
    {id:'damage',name:'Overdrive',icon:'✦',max:10,cost:l=>8+l*5,desc:'+2% starting damage / level'},
    {id:'health',name:'Core Plating',icon:'♥',max:10,cost:l=>8+l*5,desc:'+5 starting HP / level'},
    {id:'speed',name:'Vector Drive',icon:'➤',max:8,cost:l=>10+l*6,desc:'+1.5% movement speed / level'},
    {id:'luck',name:'Rift Luck',icon:'✧',max:10,cost:l=>12+l*7,desc:'Improves high-rarity upgrade rates'},
    {id:'reroll',name:'Tactical Reroll',icon:'↻',max:3,cost:l=>20+l*20,desc:'+1 level-up reroll / level'},
    {id:'shield',name:'Flux Shield',icon:'⬡',max:8,cost:l=>10+l*8,desc:'+5 starting shield / level'},
    {id:'lifesteal',name:'Siphon Matrix',icon:'✚',max:5,cost:l=>18+l*12,desc:'+0.35% damage lifesteal / level'},
    {id:'dodge',name:'Phase Step',icon:'◇',max:5,cost:l=>18+l*12,desc:'+1.5% dodge chance / level'}
  ];

  V4.ultimateSynergies = [
    {id:'supernova-grid',name:'SUPERNOVA GRID',requires:['arc','plasma','cube'],desc:'Arc + Plasma + Energy Cube: +14% damage and stronger shock/burn effects.'},
    {id:'kinetic-tempest',name:'KINETIC TEMPEST',requires:['disc','orb','boots'],desc:'Rift Disc + Kinetic Orb + Vector Boots: +10% speed and projectile pressure.'},
    {id:'fortress-prime',name:'FORTRESS PRIME',requires:['field','guard','armor'],desc:'Phase Field + Orbit Guard + Phase Armor: stronger shield and mitigation.'},
    {id:'nova-barrage',name:'NOVA BARRAGE',requires:['missile','mine','fuel'],desc:'Void Missile + Rift Mine + Reactor Fuel: larger explosions and +10% area.'}
  ];

  V4.achievements = [
    {id:'first-run',name:'First Expedition',desc:'Complete any V4 run.',test:r=>r.stats.runs>=1},
    {id:'boss-hunter',name:'Boss Hunter',desc:'Defeat 10 bosses total.',test:r=>r.stats.bosses>=10},
    {id:'ten-minute',name:'Rift Marathon',desc:'Survive at least 10 minutes.',test:r=>r.lastRun?.seconds>=600},
    {id:'evo-master',name:'EVO Master',desc:'Finish a run with 3 or more EVOs.',test:r=>r.lastRun?.evos>=3},
    {id:'mythic',name:'Mythic Contact',desc:'Select a Mythic upgrade.',test:r=>r.stats.mythics>=1},
    {id:'ascended',name:'Ascended',desc:'Defeat 3 bosses in Rift Ascension.',test:r=>r.lastRun?.runMode==='ascension'&&r.lastRun?.bosses>=3},
    {id:'final-rift',name:'Into the Final Rift',desc:'Finish a run in Final Rift.',test:r=>r.lastRun?.arena==='final-rift'},
    {id:'million',name:'One Million',desc:'Earn a run score of 1,000,000.',test:r=>r.lastRun?.score>=1000000}
  ];

  const defaultSave = () => ({
    version:4,
    cores:0,
    selected:{operator:'nova',arena:'neon-city',runMode:'endless'},
    progression:{damage:0,health:0,speed:0,luck:0,reroll:0,shield:0,lifesteal:0,dodge:0},
    settings:{sfx:.7,music:.22,vfx:1,reducedMotion:false,damageNumbers:true,screenShake:true,controller:true,fixedJoystick:false,performance:false},
    achievements:{},
    stats:{runs:0,kills:0,bosses:0,seconds:0,bestScore:0,mythics:0,evos:0,coresEarned:0},
    history:[],
    leaderboards:{},
    lastRun:null
  });

  function migrate(raw){
    const d=defaultSave();
    const s=raw&&typeof raw==='object'?raw:{};
    return {
      ...d,...s,version:4,
      selected:{...d.selected,...(s.selected||{})},
      progression:{...d.progression,...(s.progression||{})},
      settings:{...d.settings,...(s.settings||{})},
      achievements:{...(s.achievements||{})},
      stats:{...d.stats,...(s.stats||{})},
      history:Array.isArray(s.history)?s.history:[],
      leaderboards:s.leaderboards&&typeof s.leaderboards==='object'?s.leaderboards:{}
    };
  }

  V4.load = function(){
    try{return migrate(JSON.parse(localStorage.getItem(V4.saveKey)||'null'));}catch{return defaultSave();}
  };
  V4.save = V4.load();
  window.NeonV4Luck=Number(V4.save.progression.luck||0);
  window.NeonV4ExtraRerolls=Number(V4.save.progression.reroll||0);
  V4.persist = function(){try{localStorage.setItem(V4.saveKey,JSON.stringify(V4.save));}catch{}};
  V4.resetSave = function(){V4.save=defaultSave();V4.persist();};
  V4.dailyKey = function(){return new Date().toISOString().slice(0,10);};
  V4.hash = function(str){let h=2166136261>>>0;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
  V4.rng = function(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};};
  V4.getClassName = function(){return document.querySelector('#classHud')?.textContent?.trim()||'ASSAULT';};
  V4.escape = function(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));};
  V4.runtime = {run:null,mythicPicks:0,ultimate:new Set(),hazards:[],hostile:[],floaters:[],nativeRandom:Math.random};
})();