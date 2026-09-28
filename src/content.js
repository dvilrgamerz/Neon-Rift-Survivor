/** V5's complete, data-driven catalogue. IDs deliberately preserve the V4 save vocabulary. */
export const VERSION = '5.0.0';
export const BALANCE_VERSION = '5.0.1';
export const LIMITS = Object.freeze({ weapons: 6, passives: 6, relics: 3 });

export const OPERATORS = [
  { id:'nova', name:'Nova', icon:'✦', color:'#49eaff', role:'Precision', description:'+10% damage and +4% critical chance.', cooldown:24, ability:'Precision Burst', abilityDescription:'Six seconds of heightened critical chance and projectile speed.', bonuses:{ damage:1.1, crit:.04 }, unlock:'Available from the start' },
  { id:'titan', name:'Titan', icon:'⬢', color:'#ffa45c', role:'Bulwark', description:'+25 maximum HP, +8% armor, and +15 shield.', cooldown:28, ability:'Iron Barrier', abilityDescription:'A four-second barrier absorbs incoming damage before HP.', bonuses:{ maxHp:25, armor:.08, shield:15 }, unlock:'Available from the start' },
  { id:'volt', name:'Volt', icon:'ϟ', color:'#ffe187', role:'Conductor', description:'Starts with Arc Conductor and 4% faster skills.', cooldown:22, ability:'Chain Discharge', abilityDescription:'Shock nearby enemies and briefly stun them.', bonuses:{ cooldown:.96, startWeapon:'arc' }, unlock:'Available from the start' },
  { id:'ghost', name:'Ghost', icon:'◈', color:'#b99aff', role:'Infiltrator', description:'+15% movement speed and +8% dodge chance.', cooldown:26, ability:'Phase Walk', abilityDescription:'Become invulnerable for two seconds. Weapons stop firing while phased.', bonuses:{ speed:1.15, dodge:.08 }, unlock:'Available from the start' },
  { id:'forge', name:'Forge', icon:'◆', color:'#ff796b', role:'Demolition', description:'Starts with Rift Mine and +10% area.', cooldown:28, ability:'Sentry Turret', abilityDescription:'Deploy an autonomous turret for eight seconds.', bonuses:{ area:1.1, startWeapon:'mine' }, unlock:'Available from the start' },
  { id:'nyx', name:'Nyx', icon:'◉', color:'#c492ff', role:'Gravity', description:'Bend the battlefield around a crushing singularity.', cooldown:26, ability:'Gravity Well', abilityDescription:'Pull ordinary enemies into a damaging well. Bosses resist displacement.', bonuses:{}, unlock:'Complete campaign act one' },
  { id:'echo', name:'Echo', icon:'⌘', color:'#80f8c5', role:'Commander', description:'Synchronize an array of relentless companions.', cooldown:24, ability:'Drone Overdrive', abilityDescription:'Deploy overdrive drones and boost companion attacks for eight seconds.', bonuses:{}, unlock:'Complete campaign act two' },
  { id:'cryo', name:'Cryo', icon:'❄', color:'#9de9ff', role:'Cryomancer', description:'Control the advance with concentrated frost.', cooldown:24, ability:'Frost Pulse', abilityDescription:'An expanding pulse freezes ordinary enemies and slows bosses.', bonuses:{}, unlock:'Win a campaign expedition' },
].map(operator => ({ ...operator, quests:[
  { id:`${operator.id}-encounters`, name:'First Contact', description:'Complete 5 encounters with this operator.', stat:'encounters', target:5 },
  { id:`${operator.id}-bosses`, name:'Breaker', description:'Defeat 3 bosses with this operator.', stat:'bosses', target:3 },
  { id:`${operator.id}-victory`, name:'Riftwalker', description:'Win a campaign with this operator.', stat:'wins', target:1 },
] }));

export const BIOMES = [
  { id:'neon-city', name:'Neon City', icon:'▦', color:'#49eaff', description:'A rain-slick neon grid threaded with crossing energy lanes.', hazard:'surge', geometry:'grid', ambient:110, score:1, enemyMix:['runner','brute','shooter'], boss:{id:'grid-tyrant',name:'Grid Tyrant',description:'Crossing energy lanes give way to narrow escape corridors.'} },
  { id:'overgrown-circuit', name:'Overgrown Circuit', icon:'⌁', color:'#90ed87', description:'The abandoned network is alive. Break growth anchors before they spread.', hazard:'growth', geometry:'vines', ambient:146.83, score:1.04, enemyMix:['swarm','brute','runner'], boss:{id:'rootmind',name:'Rootmind',description:'Destructible growth anchors seed expanding thickets.'} },
  { id:'void-factory', name:'Void Factory', icon:'⚙', color:'#b577ff', description:'Machinery sweeps industrial lanes while assembly drones close in.', hazard:'laser', geometry:'machinery', ambient:82.41, score:1.08, enemyMix:['brute','shooter','drone'], boss:{id:'assembler-prime',name:'Assembler Prime',description:'Destroy emitters and drones between machinery sweeps.'} },
  { id:'frozen-rift', name:'Frozen Rift', icon:'❄', color:'#71ccff', description:'Crystalline ice walls and spreading frost reshape the battlefield.', hazard:'frost', geometry:'crystals', ambient:164.81, score:1.12, enemyMix:['runner','shooter','brute'], boss:{id:'cryo-colossus',name:'Cryo Colossus',description:'Ice walls divide the arena while frost fans spread outward.'} },
  { id:'magma-core', name:'Magma Core', icon:'▲', color:'#ff7c52', description:'Read marked vents and slip between expanding heat rings.', hazard:'magma', geometry:'fractures', ambient:65.41, score:1.18, enemyMix:['brute','swarm','shooter'], boss:{id:'inferno-engine',name:'Inferno Engine',description:'Vents ignite before expanding heat rings cross the arena.'} },
  { id:'storm-spire', name:'Storm Spire', icon:'ϟ', color:'#ffe187', description:'Lightning lanes light the spire. Strike during its recovery windows.', hazard:'lightning', geometry:'spires', ambient:196, score:1.20, enemyMix:['runner','drone','shooter'], boss:{id:'tempest-engine',name:'Tempest Engine',description:'Alternating lightning patterns precede vulnerable recovery periods.'} },
  { id:'void-cathedral', name:'Void Cathedral', icon:'♜', color:'#aa9aff', description:'Rotating formations conceal shifting safe ground and silence fields.', hazard:'silence', geometry:'arches', ambient:73.42, score:1.24, enemyMix:['drone','shooter','brute'], boss:{id:'null-choir',name:'Null Choir',description:'Rotating formations and silence zones challenge movement and ability timing.'} },
  { id:'final-rift', name:'Final Rift', icon:'✹', color:'#ff409a', description:'Every fracture converges here. Survive the Sovereign’s final phases.', hazard:'anomaly', geometry:'rift', ambient:55, score:1.30, enemyMix:['runner','brute','shooter','drone'], boss:{id:'rift-sovereign',name:'Rift Sovereign',description:'Three distinct phases combine the rift’s earlier threats.'} },
];

function weapon(id,name,type,color,description,base,evolution,extra={}) {
  const levels = Array.from({length:5}, (_,i) => ({
    damage:Math.round(base.damage*(1+i*.24)), cooldown:+(base.cooldown*(1-i*.065)).toFixed(3),
    speed:base.speed||440, range:(base.range||380)+i*12, pierce:(base.pierce||0)+Math.floor(i/2),
    count:(base.count||1)+(type==='drone'||type==='orbital'?Math.floor(i/2):Math.floor(i/3)),
    radius:(base.radius||12)*(1+i*.08), duration:(base.duration||1.8)*(1+i*.08),
  }));
  return { id,name,type,color,description,icon:extra.icon||'✧',max:5,...base,levels,evolution,...extra };
}
const evo = (id,name,passive,description) => ({id,name,passive,description:description||'An evolved form with increased power and enhanced coverage.'});
export const WEAPONS = [
  weapon('pulse','Pulse Blaster','projectile','#69efff','Automatic precision shots. Your starting weapon counts toward six weapon slots.',{damage:18,cooldown:.48,speed:600,range:600},null,{icon:'⌖'}),
  weapon('disc','Rift Disc','orbital','#74f2ff','Energy discs cut through nearby enemies.',{damage:19,cooldown:.4,range:85,count:2},evo('singularity-disc','Singularity Disc','magnet'),{icon:'◉'}),
  weapon('brick','Gravity Brick','projectile','#ffba80','Heavy piercing kinetic blocks.',{damage:42,cooldown:1.5,speed:300,pierce:3,radius:17},evo('titan-block','Titan Block','vital'),{icon:'▰'}),
  weapon('drill','Ion Drill','projectile','#c1ff80','Fast line-piercing projectiles.',{damage:21,cooldown:.85,speed:720,pierce:4},evo('rail-drill','Rail Drill','ammo'),{icon:'➤'}),
  weapon('core','Spiked Core','projectile','#ff85d2','Long-lived rolling cores pass through crowds.',{damage:30,cooldown:1.8,speed:190,pierce:12,duration:4,radius:22},evo('nova-core','Nova Core','fuel'),{icon:'✹'}),
  weapon('field','Phase Field','field','#9696ff','A continuous close-range damage field.',{damage:12,cooldown:.65,range:90,radius:90,duration:1},evo('aegis-field','Aegis Field','regen'),{icon:'◌'}),
  weapon('guard','Orbit Guard','orbital','#ffdf8b','Rotating protective blades carve out breathing room.',{damage:29,cooldown:.5,range:110,count:2},evo('rift-sentinel','Rift Sentinel','bracer'),{icon:'✥'}),
  weapon('laser','Prism Lance','beam','#df8eff','A narrow, high-speed piercing beam.',{damage:50,cooldown:1.4,range:600,pierce:20},evo('event-horizon','Event Horizon Lance','cube'),{icon:'╱'}),
  weapon('arc','Arc Conductor','chain','#ffec77','Lightning jumps between nearby targets.',{damage:28,cooldown:1.5,range:320,count:3},evo('riftstorm','Riftstorm','cube'),{icon:'ϟ'}),
  weapon('mine','Rift Mine','mine','#ff9b72','Proximity mines burst into expanding explosions.',{damage:72,cooldown:2.8,range:160,radius:95,duration:8},evo('sun-mine','Sun Mine','catalyst'),{icon:'✳'}),
  weapon('plasma','Plasma Pool','field','#ff7dca','Burning pools appear beneath nearby targets.',{damage:19,cooldown:2.2,range:330,radius:78,duration:3},evo('starfire-pool','Starfire Pool','catalyst'),{icon:'≈'}),
  weapon('slash','Crescent Wave','field','#afffdf','A wide close-range shockwave sweeps the crowd.',{damage:46,cooldown:1.4,range:150,radius:150,duration:.4},evo('eclipse-wave','Eclipse Wave','armor'),{icon:'☽'}),
  weapon('missile','Void Missile','projectile','#ff778e','Homing missiles explode on impact.',{damage:48,cooldown:1.7,speed:330,range:600,radius:70},evo('nova-warhead','Nova Warhead','fuel'),{homing:true,explosive:true,icon:'↗'}),
  weapon('orb','Kinetic Orb','projectile','#acffa1','Resilient multi-hit energy orbs.',{damage:24,cooldown:.9,speed:410,pierce:5,duration:3,radius:16},evo('quantum-orb','Quantum Orb','boots'),{bouncing:true,icon:'●'}),
  weapon('gravity-needle','Gravity Needle','projectile','#c292ff','Piercing needles pull ordinary enemies toward their impact.',{damage:25,cooldown:.8,speed:560,pierce:3},evo('needle-event-horizon','Event Horizon','magnet','Needles form stronger singularities that draw surrounding enemies inward.'),{pull:110,new:true,icon:'⌁'}),
  weapon('tesla-rail','Tesla Rail','beam','#fff094','A visible charge precedes a devastating narrow beam.',{damage:95,cooldown:2.2,range:760,pierce:30},evo('thunderline','Thunderline','cube','The rail fires a branching lightning line through enemies.'),{telegraph:.3,new:true,icon:'ϟ'}),
  weapon('cryo-shards','Cryo Shards','projectile','#9fefff','A fan of frost shards slows enemies.',{damage:19,cooldown:1.05,speed:430,count:3,pierce:1},evo('absolute-zero','Absolute Zero','bracer','A wider frost fan freezes ordinary enemies.'),{slow:.48,spread:.22,new:true,icon:'❄'}),
  weapon('sentinel-drones','Sentinel Drones','drone','#9affd8','Two autonomous companions orbit and fire at nearby enemies.',{damage:17,cooldown:.8,speed:500,range:460,count:2},evo('seraph-array','Seraph Array','ammo','An expanded drone array peppers the entire arena.'),{new:true,icon:'⌘'}),
  weapon('rift-boomerang','Rift Boomerang','boomerang','#ffabec','Returning arcs can strike once outbound and once returning.',{damage:32,cooldown:1.4,speed:350,range:280,pierce:8,duration:1.8},evo('eclipse-loop','Eclipse Loop','boots','Paired arcs trace a wider loop with stronger returning strikes.'),{new:true,icon:'↶'}),
  weapon('solar-brand','Solar Brand','brand','#ffc779','Repeated marks detonate in a concentrated solar blast.',{damage:30,cooldown:1,range:430,radius:95,count:2},evo('starfall','Starfall','fuel','Solar marks cascade into explosions across nearby enemies.'),{marks:3,new:true,icon:'☀'}),
];

export const PASSIVES = [
  ['magnet','Flux Magnet','Pickup range +28% each level.','◉','#74f2ff','magnet',.28],
  ['vital','Vital Matrix','+22 maximum HP and heal 22 HP each level.','♥','#ff93a4','maxHp',22],
  ['ammo','Ammo Thruster','Projectile speed +18% each level.','➤','#c1ff80','projectileSpeed',.18],
  ['fuel','Reactor Fuel','Area size +16% each level.','✹','#ffb58a','area',.16],
  ['regen','Nano Regen','Regenerate +0.55 HP per second each level.','✚','#8fffc5','regen',.55],
  ['bracer','Exo Bracer','Duration and orbit speed +16% each level.','⌁','#a8ddff','duration',.16],
  ['cube','Energy Cube','Skill cooldowns 12% faster each level.','◇','#e6a7ff','cooldown',.12],
  ['catalyst','Plasma Catalyst','Zone duration +20% each level.','≈','#ffa0e1','duration',.2],
  ['armor','Phase Armor','Take 9% less damage per level, up to the armor cap.','⬢','#b4c3ff','armor',.09],
  ['boots','Vector Boots','Movement speed +12% each level.','»','#abffce','speed',.12],
  ['power','Overcharge Core','All weapon damage +22% each level.','✦','#ffb08e','damage',.22],
  ['rate','Attack Booster','Pulse Blaster fires 12% faster each level.','⋙','#ffee9b','rate',.12],
  ['crit','Critical Module','Critical chance +7% each level, up to the critical cap.','✧','#ffa9d9','crit',.07],
].map(([id,name,description,icon,color,stat,value]) => ({id,name,description,icon,color,stat,value,max:5,levels:Array.from({length:5},(_,i)=>({level:i+1,value:+(value*(i+1)).toFixed(3)}))}));

export const RELICS = [
  ['glass-reactor','Glass Reactor','+30% damage; −20% maximum HP.','◇','#ff91c4',{damage:1.3,maxHp:.8}],
  ['heavy-plating','Heavy Plating','+25% maximum HP; −10% movement speed.','⬢','#b4c5ff',{maxHp:1.25,speed:.9}],
  ['phase-battery','Phase Battery','One extra dash charge.','ϟ','#aabaff',{dashCharges:1}],
  ['blood-circuit','Blood Circuit','Restore 1 HP for every ten kills.','♥','#ff839a',{healPerTenKills:1}],
  ['static-heart','Static Heart','Dashing releases a small shock pulse.','✧','#fff29b',{dashShock:1}],
  ['orbit-lens','Orbit Lens','+25% orbital radius.','◉','#a8ffff',{orbitRadius:1.25}],
  ['lucky-fault','Lucky Fault','One additional reward choice.','✦','#ffd4a0',{rewardChoices:1}],
  ['emergency-seal','Emergency Seal','Prevent one lethal hit, then consume this relic.','✚','#b5ffd1',{revives:1}],
  ['cold-capacitor','Cold Capacitor','Slow effects last 25% longer.','❄','#a6eaff',{slowDuration:1.25}],
  ['hunters-mark','Hunter’s Mark','+20% damage against elites and bosses.','⌖','#ffb0a5',{eliteDamage:1.2}],
  ['volatile-core','Volatile Core','Defeated elites explode and damage nearby enemies.','✹','#ffbc78',{eliteExplosion:1}],
  ['salvage-beacon','Salvage Beacon','+25% Scrap earned during the run.','◆','#a9ffc2',{scrap:1.25}],
  ['double-shot','Split Prism','Double aimed projectiles, each dealing 60% damage.','⋈','#bca8ff',{projectileCount:2,projectileDamage:.6}],
  ['shield-to-crit','Prismatic Shield','Convert 50% of maximum shield into +15% critical chance.','⬡','#a8ffec',{shield:.5,crit:.15}],
].map(([id,name,description,icon,color,modifiers])=>({id,name,description,icon,color,modifiers}));

export const DIFFICULTIES = [
  {id:'easy',name:'Easy',description:'A gentler expedition with more health and XP.',enemyHp:.72,enemySpeed:.86,spawnRate:.8,bossPower:.75,playerDamage:1.2,xpGain:1.25,startHp:140,score:.75,doubleBosses:false},
  {id:'standard',name:'Standard',description:'The intended balance of survival and discovery.',enemyHp:1,enemySpeed:1,spawnRate:1,bossPower:1,playerDamage:1,xpGain:1,startHp:100,score:1,doubleBosses:false},
  {id:'nightmare',name:'Nightmare',description:'Dense swarms, resilient enemies, and formidable bosses.',enemyHp:1.7,enemySpeed:1.2,spawnRate:1.35,bossPower:1.7,playerDamage:.95,xpGain:1.2,startHp:90,score:1.6,doubleBosses:false},
  {id:'impossible',name:'Impossible',description:'Extreme scaling and double bosses.',enemyHp:2.5,enemySpeed:1.4,spawnRate:1.75,bossPower:2.4,playerDamage:.85,xpGain:1.35,startHp:80,score:2.3,doubleBosses:true},
  {id:'custom',name:'Custom',description:'Your own tuning. Records are kept separately.',enemyHp:1,enemySpeed:1,spawnRate:1,bossPower:1,playerDamage:1,xpGain:1,startHp:100,score:1,doubleBosses:false},
];
export const CUSTOM_RANGES = {enemyHp:[.5,4],enemySpeed:[.6,2.5],spawnRate:[.5,3],bossPower:[.5,4],playerDamage:[.5,2.5],xpGain:[.5,3],startHp:[50,300]};
export const MODES = [
  {id:'campaign',name:'Campaign',icon:'⌁',description:'Three acts. Fifteen encounters. One final rift.',duration:'20–30 MIN',score:1.2},
  {id:'endless',name:'Endless',icon:'∞',description:'Survive escalating waves for as long as you can.',duration:'NO LIMIT',score:1},
  {id:'expedition',name:'Classic Expedition',icon:'◎',description:'Survive six minutes and defeat two bosses.',duration:'6 MIN',score:1.15},
  {id:'daily',name:'Daily Challenge',icon:'☀',description:'A UTC-seeded challenge with a fixed loadout and no Core Grid bonuses.',duration:'6 MIN',score:1.25},
  {id:'ascension',name:'Ascension',icon:'▲',description:'Every defeated boss raises the pressure.',duration:'NO LIMIT',score:1.35},
  {id:'training',name:'Training',icon:'⌖',description:'Explore every operator and weapon. No records or permanent rewards.',duration:'SANDBOX',score:0},
];
export const CORE_NODES = [
  ['damage','Overdrive','✦',10,8,5,'+2% starting damage per level.'],['health','Core Plating','♥',10,8,5,'+5 starting HP per level.'],
  ['speed','Vector Drive','➤',8,10,6,'+1.5% movement speed per level.'],['luck','Rift Luck','✧',10,12,7,'Improve high-rarity upgrade chances.'],
  ['reroll','Tactical Reroll','↻',3,20,20,'+1 reward reroll per level.'],['shield','Flux Shield','⬡',8,10,8,'+5 starting shield per level.'],
  ['lifesteal','Siphon Matrix','✚',5,18,12,'+0.35% damage lifesteal per level.'],['dodge','Phase Step','◇',5,18,12,'+1.5% dodge chance per level.'],
].map(([id,name,icon,max,baseCost,costStep,description])=>({id,name,icon,max,baseCost,costStep,description,cost:level=>baseCost+level*costStep}));

export const ENEMIES = [
  {id:'runner',name:'Rift Runner',description:'Fast and fragile. Keep moving to avoid contact.'},
  {id:'brute',name:'Iron Brute',description:'Slow, durable, and punishing at close range.'},
  {id:'shooter',name:'Prism Shooter',description:'Fires aimed bolts. Its shot gives away its position.'},
  {id:'swarm',name:'Circuit Swarm',description:'Weak individually; dangerous when allowed to surround you.'},
  {id:'drone',name:'Void Drone',description:'Mobile ranged pressure from the arena edge.'},
  {id:'elite',name:'Marked Elite',description:'An empowered enemy carrying extra Scrap and objective credit.'},
];
export const EVENTS = [
  {id:'blood-pact',name:'Blood Pact',description:'Trade 25% of maximum HP for a relic. The trade cannot kill you.'},
  {id:'elite-contract',name:'Elite Contract',description:'Add a marked elite to the next encounter for bonus Scrap.'},
  {id:'repair',name:'Quiet Repair',description:'Restore 35% of maximum HP.'},
  {id:'exchange',name:'Relic Exchange',description:'Replace one equipped relic with a new discovery.'},
  {id:'risk',name:'Fault Line',description:'Choose safe Scrap or empower the next encounter for a larger reward.'},
];
export const byId = (list,id) => list.find(item=>item.id===id);
