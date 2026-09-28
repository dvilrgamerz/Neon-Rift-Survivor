import { OPERATORS, BIOMES, WEAPONS, PASSIVES, RELICS, DIFFICULTIES, CUSTOM_RANGES } from './content.js';
import { CLASS_DEFINITIONS, SUBCLASSES } from './nexus.js';

export const WORLD = { width: 1200, height: 760 };
export const BALANCE_VERSION = '5.0.0';
const byId = (items, id) => items.find(item => item.id === id);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const clone = value => JSON.parse(JSON.stringify(value));
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const has = (run, id) => run.relics.includes(id);
const norm = (x, y) => { const length = Math.hypot(x, y) || 1; return { x: x / length, y: y / length }; };
const COOLDOWNS = { nova: 24, titan: 28, volt: 22, ghost: 26, forge: 28, nyx: 26, echo: 24, cryo: 24 };
const CLASS_MODIFIERS = Object.fromEntries(CLASS_DEFINITIONS.map(c=>[c.id,{...c.modifiers,hp:c.modifiers.maxHp}]));
const SUBCLASS_MODIFIERS = Object.fromEntries(SUBCLASSES.map(c=>[c.id,{...c.modifiers,classId:c.classId,hp:c.modifiers.maxHp,dash:c.modifiers.dashCharges}]));
export const ULTIMATE_SYNERGIES = [
  { id:'supernova-grid', name:'Supernova Grid', requires:['arc','plasma','cube'], description:'Arc + Plasma + Energy Cube: +14% damage and stronger shock/burn effects.' },
  { id:'kinetic-tempest', name:'Kinetic Tempest', requires:['disc','orb','boots'], description:'Rift Disc + Kinetic Orb + Vector Boots: +10% speed and projectile pressure.' },
  { id:'fortress-prime', name:'Fortress Prime', requires:['field','guard','armor'], description:'Phase Field + Orbit Guard + Phase Armor: +20 shield and +8% armor.' },
  { id:'nova-barrage', name:'Nova Barrage', requires:['missile','mine','fuel'], description:'Void Missile + Rift Mine + Reactor Fuel: +10% area and +12% explosive damage.' },
];
function difficultyOptions(config) {
  const aliases = { normal:'standard', casual:'easy', hard:'nightmare', extreme:'impossible' };
  const id = config.mode === 'daily' ? 'standard' : aliases[config.difficulty] || config.difficulty || 'standard';
  const result = { ...(byId(DIFFICULTIES, id) || byId(DIFFICULTIES, 'standard')) };
  if (result.id === 'custom') {
    const raw = config.customDifficulty || config.custom || {};
    for (const [key, [min, max]] of Object.entries(CUSTOM_RANGES)) if (Number.isFinite(Number(raw[key]))) result[key] = clamp(Number(raw[key]), min, max);
    result.doubleBosses = raw.doubleBosses === true;
  }
  return result;
}
const COLORS = { pulse: '#64ecff', disc: '#b5ff56', brick: '#ffb864', drill: '#fa71ff', core: '#fff078', field: '#92a0ff', guard: '#84fff0', laser: '#ff69cb', arc: '#aaf5ff', mine: '#ffad58', plasma: '#af91ff', slash: '#fcf7df', missile: '#ff7378', orb: '#64e8ff', 'gravity-needle': '#b79cff', 'tesla-rail': '#72ffff', 'cryo-shards': '#99dfff', 'sentinel-drones': '#97ffbf', 'rift-boomerang': '#ffaa86', 'solar-brand': '#fff17b' };
function hash(value) { let n = 2166136261; for (const c of String(value)) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return n >>> 0; }
function random(run) { let x = run.rngState | 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; run.rngState = x >>> 0; return (x >>> 0) / 4294967296; }
function pick(run, items) { return items[Math.floor(random(run) * items.length)]; }
function event(run, type, data = {}) { const e = { type, time: run.time, ...(run.currentPlayerId ? { playerId: run.currentPlayerId } : {}), ...data }; run.events.push(e); run.recentEvents.push(e); if (run.recentEvents.length > 80) run.recentEvents.shift(); return e; }
function effect(run, type, x, y, extra = {}) { if (run.effects.length >= 180) run.effects.shift(); run.effects.push({ type, x, y, r: 25, color: '#7cffff', life: .4, maxLife: .4, ...extra }); }
function statLevel(run, id) { return run.passives[id] || 0; }
export function getUltimateSynergies(run) { return ULTIMATE_SYNERGIES.filter(s => s.requires.every(id => run.weapons[id] || run.passives[id])); }

export function getStats(run) {
  const p = run.progression || {};
  const op = run.config.operator;
  const bonuses = byId(OPERATORS, op)?.bonuses || {};
  const tuning = run.difficultySettings || difficultyOptions(run.config);
  const classMod = CLASS_MODIFIERS[run.config.classId] || {};
  const subclass = SUBCLASS_MODIFIERS[run.config.subclass] || {};
  const synergies = getUltimateSynergies(run).map(s => s.id);
  const stats = {
    maxHp: tuning.startHp + (p.health || 0) * 5 + (op === 'titan' ? 25 : bonuses.maxHp || 0),
    damage: (1 + (p.damage || 0) * .02 + statLevel(run, 'power') * .22) * (op === 'nova' ? 1.1 : bonuses.damage || 1) * tuning.playerDamage,
    speed: 210 * (1 + (p.speed || 0) * .015 + statLevel(run, 'boots') * .12) * (op === 'ghost' ? 1.15 : bonuses.speed || 1),
    armor: (op === 'titan' ? .08 : 0) + statLevel(run, 'armor') * .09,
    dodge: clamp((p.dodge || 0) * .015 + (op === 'ghost' ? .08 : 0), 0, .45),
    crit: .06 + (op === 'nova' ? .04 : 0) + statLevel(run, 'crit') * .07 + (op === 'nova' && run.player.abilityActive > 0 ? .4 : 0),
    cooldown: Math.max(.35, (op === 'volt' ? .96 : 1) * (1 - statLevel(run, 'cube') * .12)),
    pulseCooldown: Math.max(.35, 1 - statLevel(run, 'rate') * .12),
    area: (op === 'forge' ? 1.1 : 1) * (1 + statLevel(run, 'fuel') * .16),
    projectileSpeed: 1 + statLevel(run, 'ammo') * .18 + (op === 'nova' && run.player.abilityActive > 0 ? .4 : 0),
    duration: 1 + statLevel(run, 'bracer') * .16,
    zoneDuration: 1 + statLevel(run, 'catalyst') * .2,
    orbitSpeed: 1 + statLevel(run, 'bracer') * .16,
    xp: tuning.xpGain,
    pickup: 95 * (1 + statLevel(run, 'magnet') * .28),
    regen: statLevel(run, 'regen') * .55,
    lifesteal: (p.lifesteal || 0) * .0035,
    dashMax: has(run, 'phase-battery') ? 3 : 2,
    shield: (p.shield || 0) * 5 + (op === 'titan' ? 15 : 0),
  };
  stats.maxHp *= (classMod.hp || 1) * (subclass.hp || 1);
  stats.maxHp += statLevel(run,'vital') * 22;
  stats.damage *= classMod.damage || 1;
  stats.speed *= (classMod.speed || 1) * (subclass.speed || 1);
  stats.armor += (classMod.armor || 0) + (subclass.armor || 0);
  stats.crit += subclass.crit || 0;
  stats.area *= subclass.area || 1;
  stats.projectileSpeed *= subclass.projectileSpeed || 1;
  stats.shield += subclass.shield || 0;
  stats.dashMax += subclass.dash || 0;
  stats.lifesteal += subclass.lifesteal || 0;
  if (synergies.includes('supernova-grid')) stats.damage *= 1.14;
  if (synergies.includes('kinetic-tempest')) { stats.speed *= 1.1; stats.projectileSpeed *= 1.15; }
  if (synergies.includes('fortress-prime')) { stats.armor += .08; stats.shield += 20; }
  if (synergies.includes('nova-barrage')) stats.area *= 1.1;
  if (has(run, 'shield-to-crit')) { stats.crit += .15; stats.shield *= .5; }
  stats.armor = clamp(stats.armor, 0, .65); stats.crit = clamp(stats.crit, 0, .85);
  if (has(run, 'glass-reactor')) { stats.damage *= 1.30; stats.maxHp *= .8; }
  if (has(run, 'heavy-plating')) { stats.maxHp *= 1.25; stats.speed *= .9; }
  if (run.mythicBonuses) { stats.damage *= 1 + run.mythicBonuses.damage; stats.maxHp += run.mythicBonuses.health; }
  return stats;
}

export function createRun(config = {}, save = {}) {
  const mode = ['campaign', 'endless', 'expedition', 'daily', 'ascension', 'training'].includes(config.mode) ? config.mode : 'campaign';
  const date = config.date || new Date().toISOString().slice(0, 10);
  const seed = mode === 'daily' ? hash(`riftfall:${date}:${BALANCE_VERSION}`) : hash(config.seed ?? Date.now());
  const operator = mode === 'daily' ? OPERATORS[seed % OPERATORS.length]?.id || 'nova' : byId(OPERATORS, config.operator)?.id || 'nova';
  const biome = mode === 'daily' ? BIOMES[(seed >>> 3) % BIOMES.length]?.id || 'neon-city' : byId(BIOMES, config.biome)?.id || 'neon-city';
  const difficultySettings = difficultyOptions({ ...config, mode });
  const classId = mode === 'daily' ? 'assault' : Object.hasOwn(CLASS_MODIFIERS, config.classId) ? config.classId : 'assault';
  const subclass = mode !== 'daily' && (mode==='training'||(Number(save.nexus?.xp)||0)>=2000) && SUBCLASS_MODIFIERS[config.subclass]?.classId === classId ? config.subclass : null;
  const run = {
    checkpointVersion: 5, balanceVersion: BALANCE_VERSION, id: `run-${seed.toString(16)}-${date}`,
    config: { ...config, mode, operator, biome, classId, subclass, difficulty: difficultySettings.id, customDifficulty: difficultySettings.id === 'custom' ? clone(difficultySettings) : undefined, manualAim: Boolean(config.manualAim), seed, date },
    rngState: seed || 1, nextId: 1, state: mode === 'campaign' ? 'route' : 'playing', resumeState: 'playing',
    player: { x: 600, y: 380, r: 13, hp: 100, maxHp: 100, shield: 0, maxShield: 0, angle: 0, aimX: 1, aimY: 0, dashCharges: 2, dashMax: 2, dashTimer: 0, dashActive: 0, invulnerable: 1, abilityCooldown: 0, abilityActive: 0, contactCooldown: 0 },
    enemies: [], bullets: [], hazards: [], effects: [], pickups: [], companions: [],
    weapons: { pulse: 1 }, passives: {}, relics: [], evolved: [], weaponTimers: {}, damageByWeapon: {},
    progression: mode === 'daily' ? {} : clone(save.progression || {}),
    time: 0, tick: 0, encounterTime: 0, kills: 0, bosses: 0, elites: 0, score: 0, scrap: 0, level: 1, xp: 0, need: 12,
    act: 1, encounter: 1, completedEncounters: 0, biome, objective: 'survive', objectiveTarget: 0, objectiveKills: 0,
    reactor: null, spawnTimer: .1, hazardTimer: 12, bossTimer: 120, rewardQueue: [], rewardChoices: [], rewardTitle: '',
    routeChoices: [], shopItems: [], eventChoices: [], pendingRelic: null, pendingRelicSource: null, pendingCompletion: false,
    stats: { damageDealt: 0, damageTaken: 0, shieldAbsorbed: 0, dodges: 0, dashes: 0, abilities: 0, mythics: 0, evolutions: 0, kills:0, bosses:0, elites:0 },
    events: [], recentEvents: [], unlocks: [], masteryEarned: 0, coresEarned: 0, completedActs: 0, causeOfDeath: '', outcome: null,
    mythicBonuses: { damage: 0, health: 0 }, mythicSelections: [], nextDanger: 0, rewardBoost: false, difficulty: 1, difficultySettings,
    rerolls: mode === 'daily' ? 0 : clamp(Number(save.progression?.reroll) || 0, 0, 3), ultimateSynergies: [],
    visitedBiomes:[biome],bossIds:[],replaySnapshots:[{time:0,score:0,kills:0}],
    worldEvent: null, worldEventTimer: 70, runQuests: [
      { id:'rift-hunter', name:'Rift Hunter', description:'Defeat 30 enemies.', stat:'kills', target:30, progress:0, reward:35, complete:false },
      { id:'guardian-breaker', name:'Guardian Breaker', description:'Defeat a boss.', stat:'bosses', target:1, progress:0, reward:75, complete:false },
      { id:'overclock', name:'Overclock', description:'Use your operator ability 3 times.', stat:'abilities', target:3, progress:0, reward:40, complete:false },
    ],
  };
  if (operator === 'volt') run.weapons.arc = 1;
  if (operator === 'forge') run.weapons.mine = 1;
  if (operator === 'nyx') run.weapons['gravity-needle'] = 1;
  if (operator === 'echo') run.weapons['sentinel-drones'] = 1;
  if (operator === 'cryo') run.weapons['cryo-shards'] = 1;
  if (mode === 'training' && Array.isArray(config.loadout)) { run.weapons = {}; for (const id of config.loadout.slice(0, 6)) if (byId(WEAPONS, id)) run.weapons[id] = 5; if (!Object.keys(run.weapons).length) run.weapons.pulse = 1; }
  if (mode === 'training' && Array.isArray(config.passives)) for (const id of config.passives.slice(0, 6)) if (byId(PASSIVES, id)) run.passives[id] = 5;
  if (mode === 'training' && Array.isArray(config.relics)) run.relics = [...new Set(config.relics.filter(id => byId(RELICS, id)))].slice(0, 3);
  const stats = getStats(run);
  Object.assign(run.player, { hp: stats.maxHp, maxHp: stats.maxHp, shield: stats.shield, maxShield: stats.shield, dashMax: stats.dashMax, dashCharges: stats.dashMax });
  if (mode === 'campaign') prepareRoute(run); else { if (mode === 'training') run.difficulty = .6; event(run, 'checkpoint'); }
  return run;
}

function difficulty(run) { return run.difficulty * (1 + (run.act - 1) * .34 + run.time / 1800 + (run.config.mode === 'ascension' ? run.bosses * .18 : 0) + (run.encounterDanger || 0) * .14); }

// Only these fields belong to one player. The world, clocks, RNG, objectives and
// reward queue remain shared, so co-op advances the simulation exactly once.
export const PLAYER_FIELDS = ['player','config','weapons','passives','relics','evolved','weaponTimers','damageByWeapon','progression','mythicBonuses','mythicSelections','stats','rerolls','ultimateSynergies'];
export function withCoopPlayer(run, playerId, callback) {
  if (!run.coopPlayers?.length) return callback();
  const record = run.coopPlayers.find(p => p.id === playerId);
  if (!record) return undefined;
  const previousId = run.currentPlayerId;
  const previous = Object.fromEntries(PLAYER_FIELDS.map(key => [key, run[key]]));
  for (const key of PLAYER_FIELDS) run[key] = record[key];
  run.currentPlayerId = playerId;
  try { return callback(); }
  finally {
    for (const key of PLAYER_FIELDS) record[key] = run[key];
    for (const key of PLAYER_FIELDS) run[key] = previous[key];
    run.currentPlayerId = previousId;
    const active = run.coopPlayers.find(p => p.id === previousId);
    if (active) for (const key of PLAYER_FIELDS) run[key] = active[key];
  }
}
function livingPlayers(run) { return run.coopPlayers ? run.coopPlayers.filter(p => p.connected !== false && !p.player.downed && p.player.hp > 0) : [{ id:null, player:run.player }]; }
function closestPlayer(run, position) { return livingPlayers(run).sort((a,b) => dist2(a.player,position)-dist2(b.player,position))[0] || { id:null, player:run.player }; }
function prepareRoute(run) {
  const pools = { 1: ['neon-city', 'overgrown-circuit'], 2: ['void-factory', 'frozen-rift', 'magma-core', 'storm-spire'], 3: ['void-cathedral', 'void-cathedral'] };
  const pool = pools[run.act];
  run.routeChoices = [0, 1].map(index => {
    const biome = run.encounter === 5 ? (run.act === 3 ? 'final-rift' : run.biome) : pool[(run.encounter + index + (run.act === 2 ? Math.floor(random(run) * 2) : 0)) % pool.length];
    const type = run.encounter === 5 ? 'boss' : run.encounter === 4 ? (index === 0 ? 'shop' : 'event') : 'combat';
    const objective = type === 'combat' ? ['survive', 'hunt', 'defend'][(run.encounter - 1 + index) % 3] : type;
    const b = byId(BIOMES, biome);
    return { id: `route-${run.act}-${run.encounter}-${index}`, index, biome, type, objective, name: type === 'boss' ? (b?.boss?.name || 'Rift Guardian') : type === 'shop' ? 'Salvage Exchange' : type === 'event' ? 'Rift Anomaly' : b?.name || biome, danger: index + 1, reward: index ? 'Bonus Scrap + relic chance' : 'Scrap + experience', description: objective === 'hunt' ? 'Defeat 3 marked elites before 90 seconds. Failure ends the run.' : objective === 'defend' ? 'Protect the reactor for 90 seconds. Reactor destruction ends the run.' : type === 'boss' ? 'Defeat the guardian. Enrage begins after 3 minutes.' : type === 'shop' ? 'Spend run-only Scrap on healing, upgrades and relics.' : type === 'event' ? 'Choose a revealed risk and reward.' : 'Survive the next 90 seconds.' };
  });
}

export function getRouteChoices(run) { return run.routeChoices || []; }
export function chooseRoute(run, index) {
  if (run.state !== 'route') return false;
  const choice = typeof index === 'string' ? run.routeChoices.find(c => c.id === index) : run.routeChoices[index];
  if (!choice) return false;
  run.biome = choice.biome; run.config.biome = choice.biome; if (run.coopPlayers) for (const member of run.coopPlayers) member.config.biome = choice.biome;
  if(!run.visitedBiomes.includes(choice.biome))run.visitedBiomes.push(choice.biome);
  run.objective = choice.objective; run.encounterTime = 0; run.encounterDanger = choice.danger - 1 + run.nextDanger; run.nextDanger = 0;
  run.enemies = []; run.bullets = []; run.hazards = []; run.pickups = []; run.companions = []; run.reactor = null;
  run.player.x = 600; run.player.y = 380; run.player.invulnerable = 1; run.spawnTimer = .5; run.hazardTimer = 10;
  run.objectiveKills = 0; run.objectiveTarget = choice.objective === 'hunt' ? 3 : 0;
  if (choice.objective === 'defend') run.reactor = { x: 600, y: 380, r: 28, hp: 250 + run.act * 50, maxHp: 250 + run.act * 50 };
  run.state = choice.type === 'shop' ? 'shop' : choice.type === 'event' ? 'event' : 'playing';
  if (choice.type === 'boss') { spawnBoss(run); if (run.difficultySettings.doubleBosses) spawnBoss(run); }
  if (choice.objective === 'hunt') for (let i = 0; i < 3; i++) spawnEnemy(run, 'elite', true);
  if (choice.type === 'shop') makeShop(run);
  if (choice.type === 'event') makeEvent(run);
  event(run, 'encounter-start', { biome: run.biome, objective: run.objective, act: run.act, encounter: run.encounter });
  event(run, 'checkpoint');
  return true;
}

function finishEncounter(run) {
  if (run.pendingCompletion || run.state === 'gameover') return;
  run.pendingCompletion = true;
  run.xp+=run.pickups.reduce((sum,pickup)=>sum+(pickup.xp||0)*getStats(run).xp,0);run.pickups=[];processLevelUps(run);
  run.completedEncounters++; run.masteryEarned += run.objective === 'boss' ? 80 : 25;
  run.scrap += Math.round((35 + run.act * 10) * (has(run, 'salvage-beacon') ? 1.25 : 1) * (run.rewardBoost ? 1.5 : 1));
  run.rewardBoost = false;
  event(run, 'encounter-complete', { act: run.act, encounter: run.encounter });
  if (run.encounter === 5) { run.completedActs = Math.max(run.completedActs,run.act); if (run.act === 1 && !run.unlocks.includes('nyx')) run.unlocks.push('nyx'); if (run.act === 2 && !run.unlocks.includes('echo')) run.unlocks.push('echo'); if (run.act === 3 && !run.unlocks.includes('cryo')) run.unlocks.push('cryo'); }
  run.resumeState = 'route';
  if (run.objective !== 'shop' && run.objective !== 'event' && run.objective !== 'boss') queueReward(run, 'upgrade', 'Encounter cleared');
  completePending(run);
}
function completePending(run) {
  if (run.rewardQueue.length) { showReward(run); return; }
  if (!run.pendingCompletion) { run.state = run.resumeState || 'playing'; return; }
  run.pendingCompletion = false;
  run.enemies = []; run.bullets = []; run.hazards = []; run.pickups = [];
  run.player.hp = Math.min(run.player.maxHp, run.player.hp + run.player.maxHp * .08);
  if (run.encounter === 5 && run.act === 3) { endRun(run, 'victory', 'Rift Sovereign defeated'); return; }
  run.encounter++;
  if (run.encounter > 5) { run.encounter = 1; run.act++; }
  run.state = 'route'; run.resumeState = 'playing'; prepareRoute(run); event(run, 'checkpoint');
}

export function endRun(run, outcome = 'defeat', cause = 'Run abandoned') {
  if (run.state === 'gameover') return;
  run.state = 'gameover'; run.outcome = outcome; run.causeOfDeath = cause;
  run.coresEarned = run.config.mode === 'training' ? 0 : Math.max(0, Math.floor(run.kills / 25 + run.bosses * 8 + run.completedEncounters * 2 + (outcome === 'victory' ? 20 : 0)));
  if (run.config.mode === 'training') run.masteryEarned = 0;
  event(run, 'gameover', { outcome, cause });
}
export function abandonRun(run) { endRun(run, 'defeat', 'Expedition abandoned'); return true; }

export function applyDamage(run, request) {
  if (request.playerId && run.coopPlayers && request.playerId !== run.currentPlayerId) return withCoopPlayer(run, request.playerId, () => applyDamage(run, { ...request, playerId:undefined }));
  if (run.state === 'gameover' || !(request.amount > 0)) return { hp: 0, shield: 0, dodged: false };
  const player = run.player;
  if (player.downed) return { hp:0, shield:0, dodged:false };
  if (player.invulnerable > 0 || (run.config.operator === 'ghost' && player.abilityActive > 0)) return { hp: 0, shield: 0, dodged: true };
  const stats = getStats(run);
  if (!request.unavoidable && random(run) < stats.dodge) { run.stats.dodges++; event(run, 'dodge'); effect(run, 'text', player.x, player.y - 25, { text: 'DODGE', color: '#b5fff8' }); return { hp: 0, shield: 0, dodged: true }; }
  let amount = request.amount * (1 - stats.armor);
  if (run.coopPlayers && amount > player.shield) {
    const partner = run.coopPlayers.find(m => m.id !== run.currentPlayerId && m.connected !== false && !m.player.downed && m.player.shield > 0 && dist2(m.player,player) < 180 ** 2);
    if (partner) { const shared = Math.min(partner.player.shield, amount * .25); partner.player.shield -= shared; amount -= shared; partner.stats.shieldAbsorbed += shared; event(run,'shield-link',{ from:partner.id, amount:shared }); }
  }
  const shield = Math.min(player.shield, amount); player.shield -= shield; amount -= shield;
  run.stats.shieldAbsorbed += shield;
  if (shield > 0 && player.shield <= 0) { event(run, 'shield-break'); effect(run, 'ring', player.x, player.y, { r: 65, color: '#70cfff' }); }
  let hp = Math.min(player.hp, amount);
  if (amount >= player.hp && has(run, 'emergency-seal')) { run.relics = run.relics.filter(id => id !== 'emergency-seal'); hp = Math.max(0, player.hp - 1); player.invulnerable = 2; event(run, 'seal-consumed'); }
  player.hp -= hp; run.stats.damageTaken += hp;
  if (hp > 0 || shield > 0) { player.invulnerable = Math.max(player.invulnerable, .28); event(run, 'player-hit', { damage: hp, shield }); }
  if (player.hp <= 0) {
    if (run.coopPlayers) { player.downed = true; player.reviveProgress = 0; event(run,'player-downed',{cause:request.source||'Rift contact'}); if (!livingPlayers(run).length) endRun(run,'defeat','Both operators are down'); }
    else endRun(run, 'defeat', request.source || 'Rift contact');
  }
  return { hp, shield, dodged: false };
}

export function togglePause(run) { if (run.state === 'playing') { run.state = 'paused'; return true; } if (run.state === 'paused') { run.state = 'playing'; return true; } return false; }
export function dash(run, x = 0, y = 0) {
  const p = run.player;
  if (run.state !== 'playing' || p.dashCharges < 1) return false;
  const direction = Math.hypot(x,y)>.01?{x,y}:Math.hypot(p.moveX||0,p.moveY||0)>.01?{x:p.moveX,y:p.moveY}:{x:p.aimX,y:p.aimY};
  const v = norm(direction.x,direction.y); p.dashX = v.x; p.dashY = v.y; p.dashActive = .18; p.invulnerable = Math.max(p.invulnerable, .18); p.dashCharges--; run.stats.dashes++;
  if (has(run, 'static-heart')) blast(run, p.x, p.y, 105, 22, 'static-heart');
  effect(run, 'ring', p.x, p.y, { r: 45 }); event(run, 'dash'); return true;
}

export function useAbility(run) {
  const p = run.player;
  if (run.state !== 'playing' || p.abilityCooldown > 0 || p.silenced > 0) return false;
  const op = run.config.operator; p.abilityCooldown = (COOLDOWNS[op] || 24) * getStats(run).cooldown; run.stats.abilities++;
  if (op === 'nova') p.abilityActive = 6;
  if (op === 'titan') { p.abilityActive = 4; p.barrierAdded = 70; p.shield += 70; }
  if (op === 'ghost') { p.abilityActive = 2; p.invulnerable = Math.max(p.invulnerable, 2); }
  if (op === 'volt') { for (const e of run.enemies.filter(e => e.hp > 0 && dist2(e, p) < 420 ** 2).slice(0, 24)) { damageEnemy(run, e, 65, 'volt-ability'); e.stun = 1.4; effect(run, 'beam', p.x, p.y, { x2: e.x, y2: e.y, color: '#b5ffff' }); } }
  if (op === 'forge') run.companions.push({ id: run.nextId++, ownerId:run.currentPlayerId, type: 'turret', x: p.x, y: p.y, life: 8, timer: 0 });
  if (op === 'nyx') { p.abilityActive = 5; run.companions.push({ id: run.nextId++, ownerId:run.currentPlayerId, type: 'well', x: p.x + p.aimX * 120, y: p.y + p.aimY * 120, life: 5, timer: 0 }); }
  if (op === 'echo') p.abilityActive = 8;
  if (op === 'cryo') { blast(run, p.x, p.y, 300, 45, 'cryo-ability'); for (const e of run.enemies) if (dist2(e, p) < 300 ** 2) { e.slow = 5; if (e.type !== 'boss') e.stun = 2; } }
  effect(run, 'ring', p.x, p.y, { r: 160, life: .7, maxLife: .7, color: byId(OPERATORS, op)?.color || '#b48dff' }); event(run, 'ability', { operator: op }); return true;
}

function spawnEnemy(run, type = 'chaser', marked = false) {
  if (run.enemies.length >= 240) return null;
  const edge = Math.floor(random(run) * 4), d = difficulty(run);
  const enemy = { id: run.nextId++, type, x: edge < 2 ? (edge ? WORLD.width - 18 : 18) : 18 + random(run) * (WORLD.width - 36), y: edge >= 2 ? (edge === 2 ? 18 : WORLD.height - 18) : 18 + random(run) * (WORLD.height - 36), r: type === 'elite' ? 22 : type === 'tank' ? 19 : 12, hp: (type === 'elite' ? 190 : type === 'tank' ? 100 : type === 'shooter' ? 35 : 27) * d, speed: (type === 'tank' ? 47 : type === 'shooter' ? 60 : type === 'elite' ? 88 : 70) * Math.min(1.8, .92 + d * .08), damage: (type === 'elite' ? 18 : 9) * d, color: type === 'elite' ? '#ffbc55' : type === 'shooter' ? '#df8dff' : type === 'tank' ? '#ff719b' : (byId(BIOMES, run.biome)?.color || '#fc5999'), cooldown: 1 + random(run) * 2, slow: 0, stun: 0, marked, counted: false };
  enemy.hp *= run.difficultySettings.enemyHp * (run.coopPlayers ? 1.5 : 1); enemy.speed *= run.difficultySettings.enemySpeed; enemy.maxHp = enemy.hp; run.enemies.push(enemy); return enemy;
}

function spawnBoss(run) {
  const definition = byId(BIOMES, run.biome)?.boss;
  const d = difficulty(run);
  const boss = { id: run.nextId++, type: 'boss', bossId: definition?.id || run.biome, name: definition?.name || String(definition || 'Rift Guardian'), x: 600, y: 155, r: 43, hp: (2200 + run.act * 650 + run.bosses * 350) * d, speed: 31, damage: 25 * d, color: byId(BIOMES, run.biome)?.color || '#ff649b', cooldown: 2.5, slow: 0, stun: 0, phase: 1, counted: false, age: 0 };
  boss.hp *= run.difficultySettings.bossPower * (run.coopPlayers ? 1.65 : 1); boss.damage *= run.difficultySettings.bossPower; boss.x += run.enemies.some(e => e.type === 'boss') ? 180 : 0;
  boss.maxHp = boss.hp; run.enemies.push(boss); event(run, 'boss-spawn', { name: boss.name }); return boss;
}

function damageEnemy(run, enemy, amount, weapon, noCrit = false) {
  if (!enemy || enemy.hp <= 0 || enemy.counted) return 0;
  const stats = getStats(run);
  const crit = !noCrit && random(run) < stats.crit;
  let actual = amount * stats.damage * (crit ? 1.8 : 1);
  if (has(run, 'hunters-mark') || has(run, 'hunter-mark') || has(run, 'hunter-s-mark')) if (enemy.type === 'boss' || enemy.type === 'elite') actual *= 1.2;
  if (enemy.vulnerable > 0) actual *= 1.4;
  if (['mine','missile','plasma'].includes(weapon) && getUltimateSynergies(run).some(s => s.id === 'nova-barrage')) actual *= 1.12;
  actual = Math.min(enemy.hp, actual); enemy.hp -= actual;
  enemy.lastHitBy = run.currentPlayerId || null;
  run.stats.damageDealt += actual; run.damageByWeapon[weapon] = (run.damageByWeapon[weapon] || 0) + actual;
  if (stats.lifesteal) run.player.hp = Math.min(run.player.maxHp, run.player.hp + actual * stats.lifesteal);
  effect(run, 'text', enemy.x, enemy.y - enemy.r, { text: String(Math.round(actual)), color: crit ? '#fff19b' : '#e7ffff', crit, life: .55, maxLife: .55 });
  if (crit) event(run, 'crit', { weapon, x: enemy.x, y: enemy.y });
  return actual;
}
function blast(run, x, y, radius, damage, weapon) { for (const e of run.enemies) if (e.hp > 0 && dist2(e, { x, y }) <= (radius + e.r) ** 2) damageEnemy(run, e, damage, weapon); effect(run, 'ring', x, y, { r: radius, color: COLORS[weapon] || '#b49eff' }); }
function nearest(run, point, range = Infinity) { let best = null, distance = range ** 2; for (const e of run.enemies) if (e.hp > 0 && !e.counted && dist2(e, point) < distance) { best = e; distance = dist2(e, point); } return best; }
function aim(run) { const p = run.player, target = nearest(run, p); return run.config.manualAim || !target ? { x: p.aimX, y: p.aimY } : norm(target.x - p.x, target.y - p.y); }

function weaponStats(id, level, evolved) {
  const def = byId(WEAPONS, id) || {};
  const tuning = Array.isArray(def.levels) ? def.levels[level - 1] || {} : {};
  return { ...def, ...tuning, damage: (tuning.damage ?? def.damage ?? 14) * (evolved ? 1.65 : 1), cooldown: tuning.cooldown ?? def.cooldown ?? Math.max(.18, .75 - level * .045), speed: tuning.speed ?? def.speed ?? 390, range: tuning.range ?? def.range ?? 300, count: tuning.count ?? def.count ?? 1, pierce: tuning.pierce ?? def.pierce ?? 0, radius: tuning.radius ?? def.radius ?? 70, level, evolved };
}
function shoot(run, x, y, direction, stats, weapon, extra = {}) {
  if (run.bullets.length >= 650) return;
  const modifiers = getStats(run);
  run.bullets.push({ id: run.nextId++, ownerId:run.currentPlayerId, x, y, vx: direction.x * stats.speed * modifiers.projectileSpeed, vy: direction.y * stats.speed * modifiers.projectileSpeed, r: 4 + (stats.evolved ? 2 : 0), damage: stats.damage, weapon, color: COLORS[weapon] || '#a8ffff', life: (stats.duration || 2.2) * modifiers.duration, age: 0, pierce: stats.pierce, hits: [], enemy: false, type: 'projectile', ...extra });
}
function fireWeapon(run, id, stats) {
  const p = run.player, v = aim(run), angle = Math.atan2(v.y, v.x), modifiers = getStats(run), target = nearest(run, p);
  if (id === 'field') { blast(run, p.x, p.y, (stats.radius || 95) * modifiers.area + stats.level * 5, stats.damage, id); return; }
  if (id === 'plasma') { if (target) run.companions.push({ id:run.nextId++,ownerId:run.currentPlayerId,type:'pool',weapon:id,x:target.x,y:target.y,r:stats.radius*modifiers.area,damage:stats.damage,life:(stats.duration||3)*modifiers.zoneDuration,timer:0 }); return; }
  if (id === 'guard' || id === 'disc') {
    const count = Math.max(2, stats.count); const radius = (65 + stats.level * 4) * (has(run, 'orbit-lens') ? 1.25 : 1);
    for (let i = 0; i < count; i++) { const a = run.time * 2.5 * modifiers.orbitSpeed + i * Math.PI * 2 / count; const x = p.x + Math.cos(a) * radius, y = p.y + Math.sin(a) * radius; blast(run, x, y, 25, stats.damage, id); }
    return;
  }
  if (id === 'arc') { let from = p; const visited = new Set(); for (let i = 0; i < 2 + stats.level + (stats.evolved ? 3 : 0); i++) { const options = run.enemies.filter(e => e.hp > 0 && !visited.has(e.id) && dist2(e, from) < 270 ** 2).sort((a, b) => dist2(a, from) - dist2(b, from)); const to = options[0]; if (!to) break; visited.add(to.id); damageEnemy(run, to, stats.damage, id); to.stun = .15; effect(run, 'beam', from.x, from.y, { x2: to.x, y2: to.y, color: COLORS.arc }); from = to; } return; }
  if (id === 'laser' || id === 'tesla-rail') {
    run.companions.push({ id: run.nextId++, ownerId:run.currentPlayerId, type: 'beam-warning', weapon: id, evolved:stats.evolved, x: p.x, y: p.y, x2: p.x + v.x * 1100, y2: p.y + v.y * 1100, damage: stats.damage, width: stats.evolved ? 32 : 12 + stats.level * 2, life: .28, timer: 0 });
    effect(run, 'beam', p.x, p.y, { x2: p.x + v.x * 1100, y2: p.y + v.y * 1100, color: COLORS[id], warning: true, life: .28, maxLife: .28 }); return;
  }
  if (id === 'mine') { for (let i = 0; i < Math.max(1, stats.count); i++) shoot(run, p.x + (random(run) - .5) * 70, p.y + (random(run) - .5) * 70, { x: 0, y: 0 }, stats, id, { type: 'mine', r: 9, life: 8, radius: (70 + stats.level * 8) * modifiers.area }); return; }
  if (id === 'slash') { const radius = 105 * modifiers.area; for (const e of run.enemies) if (dist2(e, p) < (radius + e.r) ** 2) { const toward = norm(e.x - p.x, e.y - p.y); if (toward.x * v.x + toward.y * v.y > -.1 || stats.evolved) damageEnemy(run, e, stats.damage, id); } effect(run, 'ring', p.x + v.x * 30, p.y + v.y * 30, { r: radius, color: COLORS.slash }); return; }
  if (id === 'solar-brand') { const targets = run.enemies.filter(e => e.hp > 0).sort((a, b) => dist2(a, p) - dist2(b, p)).slice(0, 2 + Math.floor(stats.level / 2)); for (const e of targets) { e.brands = (e.brands || 0) + 1; effect(run, 'ring', e.x, e.y, { r: e.r + 10, color: COLORS[id] }); if (e.brands >= (stats.evolved ? 2 : 3)) { e.brands = 0; blast(run, e.x, e.y, stats.evolved ? 115 : 65, stats.damage * 3, id); } } return; }
  if (id === 'sentinel-drones') { const count = stats.evolved ? 4 : 2; for (let i = 0; i < count; i++) { const a = run.time * 1.8 + i * Math.PI * 2 / count, point = { x: p.x + Math.cos(a) * 65, y: p.y + Math.sin(a) * 65 }; const t = nearest(run, point); if (t) { shoot(run, point.x, point.y, norm(t.x - point.x, t.y - point.y), stats, id); effect(run, 'ring', point.x, point.y, { r: 8, color: COLORS[id], life: .5, maxLife: .5 }); } } return; }
  if (!target && !run.config.manualAim) return;
  const doubleShot = has(run,'double-shot') && id!=='missile';
  const count = (id === 'cryo-shards' ? Math.max(3, stats.count) : stats.count) * (doubleShot ? 2 : 1) * (id==='rift-boomerang'&&stats.evolved?2:1);
  for (let i = 0; i < count; i++) {
    const a = angle + (i - (count - 1) / 2) * (id === 'cryo-shards' ? .2 : .12);
    const type = id === 'rift-boomerang' ? 'boomerang' : 'projectile';
    shoot(run, p.x, p.y, { x: Math.cos(a), y: Math.sin(a) }, doubleShot?{...stats,damage:stats.damage*.6}:stats, id, { type, radius: stats.radius * modifiers.area, homing: id === 'missile', bouncing:id==='orb', slow: id === 'cryo-shards' ? 2.5 * modifiers.duration * (has(run, 'cold-capacitor') ? 1.25 : 1) : 0, pull: id === 'gravity-needle', explosion: id==='missile', pierce: id === 'gravity-needle' ? 2 + stats.level : stats.pierce, outboundHits: [], inboundHits: [], evolved: stats.evolved });
  }
}

function processWeapons(run, dt) {
  if (run.config.operator === 'ghost' && run.player.abilityActive > 0) return;
  const modifiers = getStats(run);
  for (const [id, level] of Object.entries(run.weapons)) {
    run.weaponTimers[id] = (run.weaponTimers[id] || 0) - dt;
    if (run.weaponTimers[id] > 0) continue;
    const stats = weaponStats(id, level, run.evolved.includes(id));
    const droneBoost = id === 'sentinel-drones' && run.config.operator === 'echo' && run.player.abilityActive > 0 ? .45 : 1;
    run.weaponTimers[id] = Math.max(.09, stats.cooldown * modifiers.cooldown * (id==='pulse'?modifiers.pulseCooldown:1) * droneBoost);
    fireWeapon(run, id, stats); event(run, 'shot', { weapon: id });
  }
}

function segmentDistance(point, a, b) { const dx = b.x - a.x, dy = b.y - a.y; const t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1); return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy); }
function buildGrid(enemies) { const cells = new Map(); for (const e of enemies) if (e.hp > 0) { const key = `${Math.floor(e.x / 80)},${Math.floor(e.y / 80)}`; if (!cells.has(key)) cells.set(key, []); cells.get(key).push(e); } return cells; }
function nearby(grid, x, y) { const result = [], gx = Math.floor(x / 80), gy = Math.floor(y / 80); for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) result.push(...(grid.get(`${gx + dx},${gy + dy}`) || [])); return result; }
function processBullets(run, dt) {
  const grid = buildGrid(run.enemies);
  const advance = bullet => {
    bullet.life -= dt; bullet.age += dt;
    if (bullet.life <= 0) return;
    if (bullet.type === 'mine') {
      if (bullet.age > .4 && nearby(grid, bullet.x, bullet.y).some(e => e.hp > 0 && dist2(e, bullet) < 45 ** 2)) { blast(run, bullet.x, bullet.y, bullet.radius, bullet.damage, bullet.weapon); bullet.life = 0; }
      return;
    }
    if (bullet.type === 'boomerang' && bullet.age > .55) { const v = norm(run.player.x - bullet.x, run.player.y - bullet.y); const speed = Math.max(240, Math.hypot(bullet.vx, bullet.vy)); bullet.vx = v.x * speed; bullet.vy = v.y * speed; if (dist2(bullet, run.player) < 18 ** 2) { bullet.life = 0; return; } }
    if (bullet.homing) { const target = nearest(run, bullet, 450); if (target) { const v = norm(target.x - bullet.x, target.y - bullet.y), speed = Math.hypot(bullet.vx, bullet.vy); bullet.vx += (v.x * speed - bullet.vx) * .09; bullet.vy += (v.y * speed - bullet.vy) * .09; } }
    const prior = { x: bullet.x, y: bullet.y }; bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt;
    if (bullet.bouncing) { if (bullet.x<12||bullet.x>WORLD.width-12) { bullet.vx*=-1; bullet.x=clamp(bullet.x,12,WORLD.width-12); } if(bullet.y<12||bullet.y>WORLD.height-12) { bullet.vy*=-1; bullet.y=clamp(bullet.y,12,WORLD.height-12); } }
    if (bullet.enemy) { for (const member of livingPlayers(run)) if (segmentDistance(member.player, prior, bullet) < bullet.r + member.player.r) { applyDamage(run, { amount: bullet.damage, playerId:member.id, source: 'Hostile projectile' }); bullet.life = 0; break; } return; }
    for (const e of nearby(grid, bullet.x, bullet.y)) {
      if (e.hp <= 0) continue;
      const hits = bullet.type === 'boomerang' ? (bullet.age > .55 ? bullet.inboundHits : bullet.outboundHits) : bullet.hits;
      if (hits.includes(e.id) || segmentDistance(e, prior, bullet) > bullet.r + e.r) continue;
      hits.push(e.id); damageEnemy(run, e, bullet.damage, bullet.weapon);
      if (bullet.slow) { e.slow = Math.max(e.slow, bullet.slow); if (bullet.evolved && e.type !== 'boss') e.stun = .45; }
      if (bullet.pull && e.type !== 'boss') { e.x += (bullet.x - e.x) * .35; e.y += (bullet.y - e.y) * .35; }
      if(bullet.pull&&bullet.evolved){for(const target of run.enemies)if(target.hp>0&&target.type!=='boss'&&dist2(target,bullet)<150**2){target.x+=(bullet.x-target.x)*.20;target.y+=(bullet.y-target.y)*.20;}blast(run,bullet.x,bullet.y,80,bullet.damage*.2,bullet.weapon);}
      if (bullet.explosion) blast(run, bullet.x, bullet.y, Math.max(45, bullet.radius), bullet.damage * .6, bullet.weapon);
      if (bullet.type !== 'boomerang') { bullet.pierce--; if (bullet.pierce < 0) { bullet.life = 0; break; } }
    }
  };
  for (const bullet of run.bullets) if (bullet.ownerId) withCoopPlayer(run,bullet.ownerId,()=>advance(bullet)); else advance(bullet);
  run.bullets = run.bullets.filter(b => b.life > 0 && b.x > -100 && b.x < WORLD.width + 100 && b.y > -100 && b.y < WORLD.height + 100);
}

function hazardAt(point,hazard,time,margin) {
  const warning=Math.max(0,hazard.warning);
  if(time<warning||time>warning+hazard.life)return false;
  if(hazard.type==='line')return segmentDistance(point,hazard,{x:hazard.x2,y:hazard.y2})<(hazard.width||20)/2+margin;
  const radius=hazard.r+(hazard.expansion||0)*Math.max(0,time-warning),distance=Math.hypot(point.x-hazard.x,point.y-hazard.y);
  return hazard.type==='ring'?Math.abs(distance-radius)<(hazard.width||20)+margin:distance<radius+margin;
}
// Keep at least one sampled, walking-speed escape path from every living
// operator before adding a new attack to overlapping telegraphs. This is
// deliberately conservative and does not depend on spending a dash charge.
export function hasHazardEscape(run,candidate) {
  const hazards=[...run.hazards,candidate],horizon=Math.max(.3,candidate.warning)+.35;
  return livingPlayers(run).every(member=>{
    const stats=member.id?withCoopPlayer(run,member.id,()=>getStats(run)):getStats(run),p=member.player,speed=stats.speed*(p.slow>0?.6:1)*.85;
    const points=[{x:p.x,y:p.y}];
    for(let ring=1;ring<=3;ring++)for(let i=0;i<24;i++){const a=i*Math.PI/12,radius=speed*Math.max(.2,candidate.warning)*ring/3;points.push({x:clamp(p.x+Math.cos(a)*radius,20,WORLD.width-20),y:clamp(p.y+Math.sin(a)*radius,20,WORLD.height-20)});}
    return points.some(destination=>{
      const distance=Math.hypot(destination.x-p.x,destination.y-p.y),travel=distance/(speed||1);
      for(let time=.08;time<=horizon;time+=.08){const fraction=Math.min(1,time/(travel||1)),point={x:p.x+(destination.x-p.x)*fraction,y:p.y+(destination.y-p.y)*fraction};if(hazards.some(h=>hazardAt(point,h,time,p.r+7)))return false;}
      return true;
    });
  });
}
function hazard(run, type, x, y, extra = {}) {
  if (run.hazards.length >= 30) return false;
  const candidate={ type, x, y, r:75, warning:1.2, life:2, damage:16*difficulty(run), color:byId(BIOMES,run.biome)?.color||'#ff839d', tick:0, ...extra };
  if(!hasHazardEscape(run,candidate))return false;
  run.hazards.push({id:run.nextId++,...candidate});return true;
}
function bossAttack(run, boss) {
  const p = closestPlayer(run,boss).player, phase = boss.phase;
  let biome = run.biome;
  if (biome === 'final-rift') biome = ['neon-city', 'magma-core', 'void-cathedral'][(phase - 1 + Math.floor(boss.age / 12)) % 3];
  if (biome === 'neon-city') { const horizontal = Math.floor(boss.age / 3) % 2 === 0; for (let i = 0; i < 2 + (phase === 3 ? 1 : 0); i++) { const pos = horizontal ? 130 + i * 220 : 220 + i * 320; hazard(run, 'line', horizontal ? 25 : pos, horizontal ? pos : 25, { x2: horizontal ? 1175 : pos, y2: horizontal ? pos : 735, width: 26, warning: 1.35, life: 1.2 }); } }
  else if (biome === 'void-factory' || biome === 'overgrown-circuit') {
    if (run.enemies.filter(e => e.type === 'anchor').length < 4) { const a = random(run) * Math.PI * 2, e = spawnEnemy(run, 'tank'); if (e) Object.assign(e, { type: 'anchor', x: clamp(boss.x + Math.cos(a) * 150, 80, 1120), y: clamp(boss.y + Math.sin(a) * 150, 80, 680), speed: 0, hp: 130 * difficulty(run), maxHp: 130 * difficulty(run), cooldown: 1.5, color: biome === 'overgrown-circuit' ? '#aeff68' : '#ce94ff' }); }
    hazard(run, 'circle', p.x, p.y, { r: biome === 'overgrown-circuit' ? 72 : 50, warning: 1.4, life: biome === 'overgrown-circuit' ? 4 : 1.5 });
    if (phase > 1) spawnEnemy(run, 'shooter');
  } else if (biome === 'frozen-rift') { hazard(run, 'line', clamp(p.x - 100, 100, 900), p.y - 70, { x2: clamp(p.x + 100, 200, 1100), y2: p.y - 70, width: 26, warning: 1.5, life: 3, slow: 2 }); hazard(run, 'circle', boss.x, boss.y, { r: 110 + phase * 20, warning: 1.2, life: 2, slow: 2 }); }
  else if (biome === 'magma-core') { hazard(run, 'ring', boss.x, boss.y, { r: 125, width: 24, expansion: 100, warning: 1.4, life: 2.2 }); if (phase > 1) hazard(run, 'circle', p.x, p.y, { r: 58, warning: 1.5, life: 2 }); }
  else if (biome === 'storm-spire') { const x = clamp(p.x, 100, 1100); hazard(run, 'line', x, 15, { x2: x, y2: 745, width: 38, warning: 1.25, life: .6 }); boss.vulnerable = 2.4; }
  else if (biome === 'void-cathedral') { hazard(run, 'silence', p.x, p.y, { r: 105, warning: 1.5, life: 3 }); const a = boss.age * .6; for (let i = 0; i < 3; i++) { const angle = a + i * Math.PI * 2 / 3; hazard(run, 'circle', clamp(boss.x + Math.cos(angle) * 180, 70, 1130), clamp(boss.y + Math.sin(angle) * 180, 70, 690), { r: 65, warning: 1.4, life: 1.8 }); } }
}

function processEnemies(run, dt) {
  for (const e of run.enemies) {
    if (e.hp <= 0) continue;
    const targetPlayer = closestPlayer(run,e), p = targetPlayer.player;
    e.slow = Math.max(0, e.slow - dt); e.stun = Math.max(0, e.stun - dt); e.cooldown -= dt; e.vulnerable = Math.max(0, (e.vulnerable || 0) - dt);
    if (e.type === 'boss') {
      e.age += dt; const phase = e.hp / e.maxHp <= .35 ? 3 : e.hp / e.maxHp <= .7 ? 2 : 1;
      if (phase > e.phase) { e.phase = phase; event(run, 'boss-phase', { phase, name: e.name }); effect(run, 'ring', e.x, e.y, { r: 130, color: e.color, life: 1, maxLife: 1 }); }
      if (!e.enraged && e.age >= 180) { e.enraged = true; event(run, 'boss-enrage', { name: e.name }); }
      if (e.cooldown <= 0) { bossAttack(run, e); e.cooldown = Math.max(1.6, 4.4 - e.phase * .45) * (e.enraged ? .65 : 1); }
    }
    if (e.stun > 0) continue;
    const destination = run.reactor && e.type !== 'boss' && e.id % 3 === 0 ? run.reactor : p;
    const v = norm(destination.x - e.x, destination.y - e.y);
    const stop = (e.type === 'shooter' && dist2(e, destination) < 220 ** 2) || (e.type === 'boss' && dist2(e, p) < 165 ** 2);
    const timeScale = run.worldEvent?.id==='time-fracture' ? .45 : 1;
    if (!stop) { e.x += v.x * e.speed * dt * (e.slow > 0 ? .45 : 1) * timeScale; e.y += v.y * e.speed * dt * (e.slow > 0 ? .45 : 1) * timeScale; }
    e.angle = Math.atan2(v.y, v.x);
    if ((e.type === 'shooter' || e.type === 'anchor') && e.cooldown <= 0) { e.cooldown = e.type === 'anchor' ? 2.8 : 2.4; if (run.bullets.length < 650) run.bullets.push({ id: run.nextId++, x: e.x, y: e.y, vx: v.x * 170, vy: v.y * 170, r: 6, damage: e.damage, life: 6, age: 0, enemy: true, color: '#ff6a8c', type: 'projectile' }); }
    if (run.reactor && destination === run.reactor && dist2(e, destination) < (e.r + destination.r) ** 2 && e.cooldown <= 0) { run.reactor.hp -= e.damage; e.cooldown = 1; }
    else if (dist2(e, p) < (e.r + p.r) ** 2) applyDamage(run, { amount: e.damage, playerId:targetPlayer.id, source: e.name || `${e.type} contact` });
  }
}

function processHazards(run, dt) {
  for (const h of run.hazards) {
    if (h.warning > 0) { h.warning -= dt; continue; }
    h.life -= dt; h.tick -= dt;
    if (h.expansion) h.r += h.expansion * dt;
    let hitAny = false;
    for (const member of livingPlayers(run)) {
      const p=member.player, distance = Math.hypot(p.x - h.x, p.y - h.y);
      const hit = h.type === 'line' ? segmentDistance(p, h, { x: h.x2, y: h.y2 }) < (h.width || 20) / 2 + p.r : h.type === 'ring' ? Math.abs(distance - h.r) < (h.width || 20) + p.r : distance < h.r + p.r;
      if (hit) { if (h.type === 'silence') p.silenced = .2; if (h.slow) p.slow = .25; if (h.tick <= 0) { applyDamage(run, { amount: h.damage, playerId:member.id, source: h.type === 'silence' ? 'Null Choir silence field' : 'Arena hazard' }); hitAny=true; } }
    }
    if(hitAny)h.tick=.6;
  }
  run.hazards = run.hazards.filter(h => h.life > 0);
}

function processCompanions(run, dt) {
  const advance = c => {
    c.life -= dt; c.timer -= dt;
    if (c.type === 'beam-warning') { if (c.life <= 0) { const struck=[];for (const e of run.enemies) if (e.hp > 0 && segmentDistance(e, c, { x: c.x2, y: c.y2 }) < c.width / 2 + e.r) {damageEnemy(run, e, c.damage, c.weapon);struck.push(e);} if(c.evolved&&c.weapon==='tesla-rail')for(const origin of struck.slice(0,5)){const secondary=run.enemies.filter(e=>e.hp>0&&!struck.includes(e)&&dist2(e,origin)<200**2).slice(0,2);for(const target of secondary){damageEnemy(run,target,c.damage*.5,c.weapon);effect(run,'beam',origin.x,origin.y,{x2:target.x,y2:target.y,color:COLORS[c.weapon]});}} effect(run, 'beam', c.x, c.y, { x2: c.x2, y2: c.y2, width: c.width, color: COLORS[c.weapon], life: .3, maxLife: .3 }); } }
    else if (c.type === 'turret' && c.timer <= 0) { const t = nearest(run, c); if (t) shoot(run, c.x, c.y, norm(t.x - c.x, t.y - c.y), { damage: 24, speed: 480, pierce: 1 }, 'forge-turret'); c.timer = .26; }
    else if (c.type === 'well') { for (const e of run.enemies) if (e.hp > 0 && dist2(e, c) < 210 ** 2) { if (e.type !== 'boss' && e.type !== 'anchor') { const v = norm(c.x - e.x, c.y - e.y); e.x += v.x * 130 * dt; e.y += v.y * 130 * dt; } if (c.timer <= 0) damageEnemy(run, e, 9, 'nyx-well'); } if (c.timer <= 0) { c.timer = .3; effect(run, 'ring', c.x, c.y, { r: 120, color: '#a57aff' }); } }
    else if(c.type==='pool'&&c.timer<=0){blast(run,c.x,c.y,c.r,c.damage,c.weapon);c.timer=.45;}
  };
  for (const c of run.companions) if(c.ownerId)withCoopPlayer(run,c.ownerId,()=>advance(c));else advance(c);
  run.companions = run.companions.filter(c => c.life > 0);
}

function collectPickups(run,dt) {
  const collectors=livingPlayers(run).map(member=>({...member,stats:member.id?withCoopPlayer(run,member.id,()=>getStats(run)):getStats(run)}));
  for(const pickup of run.pickups){
    const collector=collectors.filter(p=>dist2(p.player,pickup)<p.stats.pickup**2).sort((a,b)=>dist2(a.player,pickup)-dist2(b.player,pickup))[0];
    if(!collector)continue;
    if(dist2(collector.player,pickup)<22**2){run.xp+=(pickup.xp||0)*collector.stats.xp;pickup.collected=true;}
    else{const v=norm(collector.player.x-pickup.x,collector.player.y-pickup.y);pickup.x+=v.x*460*dt;pickup.y+=v.y*460*dt;}
  }
  run.pickups=run.pickups.filter(p=>!p.collected);
}
function processLevelUps(run) {while (run.xp >= run.need) { run.xp -= run.need; run.level++; run.need = Math.floor(12 + run.level * 5 + run.level ** 1.22); queueReward(run, 'upgrade', `Level ${run.level}`); }}
function collectDeaths(run,dt) {
  let more = true;
  while (more) {
    more = false;
    for (const e of run.enemies) if (e.hp <= 0 && !e.counted) {
      e.counted = true; more = true; run.kills++; run.score += Math.round((e.type === 'boss' ? 1800 : e.type === 'elite' ? 150 : 15) * run.difficultySettings.score);
      if(e.type==='boss')run.xp+=36*getStats(run).xp;
      else{const xp=e.type==='elite'?10:2;if(run.pickups.length>=300){const closest=run.pickups.reduce((best,p)=>dist2(p,e)<dist2(best,e)?p:best);closest.xp+=xp;}else run.pickups.push({id:run.nextId++,type:'xp',x:e.x,y:e.y,r:4,xp});}
      const award = () => { run.stats.kills++; if(e.type==='boss')run.stats.bosses++;if(e.type==='elite')run.stats.elites++; };
      if(e.lastHitBy)withCoopPlayer(run,e.lastHitBy,award);else award();
      run.scrap += (e.type === 'boss' ? 30 : e.type === 'elite' ? 8 : 1) * (has(run, 'salvage-beacon') ? 1.25 : 1);
      if (e.type === 'elite') { run.elites++; if (e.marked) run.objectiveKills++; if (has(run, 'volatile-core')) blast(run, e.x, e.y, 125, 70, 'volatile-core'); }
      if (e.type === 'boss') { run.bosses++;if(e.bossId&&!run.bossIds.includes(e.bossId))run.bossIds.push(e.bossId); run.masteryEarned += 40; queueReward(run, 'relic', 'Boss cache'); event(run, 'boss-kill', { name: e.name, bossId: e.bossId }); }
      if (has(run, 'blood-circuit') && run.kills % 10 === 0) run.player.hp = Math.min(run.player.maxHp, run.player.hp + 1);
      effect(run, 'ring', e.x, e.y, { r: e.r * 2, color: e.color }); event(run, 'kill', { enemy: e.type, x: e.x, y: e.y });
    }
  }
  run.enemies = run.enemies.filter(e => !e.counted && e.hp > 0);
  collectPickups(run,dt);processLevelUps(run);
}

function rarity(run) { const value = random(run) + (run.progression.luck || 0) * .005; return value > .975 ? 'mythic' : value > .84 ? 'epic' : value > .61 ? 'rare' : 'common'; }
function evolutionPassive(def) { return def.evolution?.passive || def.evolution?.requires || def.evolution?.passiveId; }
function eligibleUpgrades(run) {
  const choices = [];
  for (const def of WEAPONS) {
    const level = run.weapons[def.id] || 0;
    if (level < 5 && (level > 0 || Object.keys(run.weapons).length < 6)) choices.push({ id: `weapon:${def.id}`, target: def.id, kind: 'weapon', name: `${def.name} · Lv ${level + 1}`, description: def.description || def.desc || `Increase ${def.name} damage, rate or projectiles.`, level: level + 1 });
    if (level === 5 && def.evolution && !run.evolved.includes(def.id) && run.passives[evolutionPassive(def)]) choices.push({ id: `evolution:${def.id}`, target: def.id, kind: 'evolution', name: def.evolution.name, description: def.evolution.description || `Evolve ${def.name}: stronger attacks and a signature enhancement.`, rarity: 'mythic' });
  }
  for (const def of PASSIVES) { const level = run.passives[def.id] || 0; if (level < 5 && (level > 0 || Object.keys(run.passives).length < 6)) choices.push({ id: `passive:${def.id}`, target: def.id, kind: 'passive', name: `${def.name} · Lv ${level + 1}`, description: def.description || def.desc || 'Improve your run stats.', level: level + 1 }); }
  choices.push({ id: 'heal', target: 'heal', kind: 'heal', name: 'Emergency repair', description: 'Restore 35% of maximum HP.' });
  return choices;
}
function queueReward(run, type, title) { if(run.coopPlayers)for(const member of run.coopPlayers.filter(p=>p.connected!==false))run.rewardQueue.push({type,title,ownerId:member.id});else run.rewardQueue.push({ type, title }); }
function showReward(run) {
  if (run.state === 'gameover' || !run.rewardQueue.length) return;
  if (run.state === 'reward' && run.rewardChoices.length) return;
  const queued = run.rewardQueue[0];
  if (queued.ownerId && queued.ownerId !== run.currentPlayerId) return withCoopPlayer(run,queued.ownerId,()=>showReward(run));
  run.rewardOwnerId = queued.ownerId || null; run.rewardTitle = queued.title;
  const pool = queued.type === 'relic' ? RELICS.filter(r => !has(run, r.id)).map(r => ({ id: `relic:${r.id}`, target: r.id, kind: 'relic', name: r.name, description: r.description || r.desc, rarity: 'epic' })) : eligibleUpgrades(run);
  const choices = [];
  const evolutions = pool.filter(r => r.kind === 'evolution'); if (evolutions.length) choices.push(pick(run, evolutions));
  while (choices.length < (has(run, 'lucky-fault') ? 4 : 3) && choices.length < pool.length) { const item = pick(run, pool.filter(c => !choices.some(chosen => chosen.id === c.id))); choices.push({ ...item, rarity: item.rarity || rarity(run) }); }
  if (!choices.length) choices.push({ id: 'heal', kind: 'heal', target: 'heal', name: 'Emergency repair', description: 'Restore 35% HP.', rarity: 'common' });
  run.rewardChoices = choices; run.state = 'reward'; event(run, 'reward', { title: queued.title });
}
export function getRewardChoices(run) { return run.rewardChoices || []; }
export function rerollReward(run) {
  if(run.state!=='reward'||run.pendingRelic||run.rerolls<=0||(run.rewardOwnerId&&run.rewardOwnerId!==run.currentPlayerId))return false;
  run.rerolls--;run.rewardChoices=[];run.state='playing';showReward(run);event(run,'reroll');return true;
}

function applyUpgrade(run, choice) {
  const oldMax = getStats(run).maxHp;
  if (choice.kind === 'weapon') run.weapons[choice.target] = Math.min(5, (run.weapons[choice.target] || 0) + 1);
  if (choice.kind === 'passive') run.passives[choice.target] = Math.min(5, (run.passives[choice.target] || 0) + 1);
  if (choice.kind === 'evolution') { if (!run.evolved.includes(choice.target)) run.evolved.push(choice.target); run.stats.evolutions++; event(run, 'evolution', { weapon: choice.target }); }
  if (choice.kind === 'heal') run.player.hp = Math.min(run.player.maxHp, run.player.hp + run.player.maxHp * .35);
  if (choice.rarity === 'mythic') { run.stats.mythics++; run.mythicSelections.push(choice.name); run.mythicBonuses.damage += .06; run.mythicBonuses.health += 5; event(run, 'mythic', { reward: choice.name }); }
  const stats = getStats(run); run.player.maxHp = stats.maxHp; run.player.hp = Math.min(stats.maxHp, run.player.hp + Math.max(0, stats.maxHp - oldMax));
}
export function selectReward(run, id) {
  if (run.state !== 'reward' || run.pendingRelic || (run.rewardOwnerId && run.rewardOwnerId !== run.currentPlayerId)) return false;
  const choice = typeof id === 'number' ? run.rewardChoices[id] : run.rewardChoices.find(c => c.id === id);
  if (!choice) return false;
  if (choice.kind === 'relic') { if (!equipRelic(run, choice.target)) { run.pendingRelicSource = 'reward'; return true; } }
  else applyUpgrade(run, choice);
  finishReward(run); return true;
}
function finishReward(run) { run.rewardQueue.shift(); run.rewardChoices = [];run.rewardOwnerId=null; if (run.rewardQueue.length) { run.state = 'playing'; showReward(run); } else completePending(run); event(run, 'checkpoint'); }

export function equipRelic(run, id, replaceId) {
  if (!byId(RELICS, id) || has(run, id)) return false;
  if (run.relics.length >= 3 && !replaceId) { run.pendingRelic = id;run.pendingRelicOwnerId=run.currentPlayerId||null; return false; }
  if (replaceId && !run.relics.includes(replaceId)) return false;
  const previousStats=getStats(run), prior = previousStats.maxHp, source = run.pendingRelicSource;
  if (replaceId) run.relics = run.relics.filter(r => r !== replaceId);
  run.relics.push(id); run.pendingRelic = null; run.pendingRelicSource = null;run.pendingRelicOwnerId=null;
  const stats = getStats(run); run.player.maxHp = stats.maxHp; run.player.hp = clamp(run.player.hp * stats.maxHp / prior, 1, stats.maxHp); run.player.dashMax = stats.dashMax; run.player.dashCharges = Math.min(stats.dashMax, run.player.dashCharges);
  if(stats.shield!==previousStats.shield){run.player.shield=Math.min(stats.shield,run.player.shield*(previousStats.shield>0?stats.shield/previousStats.shield:1));run.player.maxShield=stats.shield;}
  if (source === 'reward') finishReward(run);
  if (source === 'event') finishEncounter(run);
  event(run, 'relic', { id, replaced: replaceId || null }); return true;
}

function makeShop(run) {
  const upgrade = pick(run, eligibleUpgrades(run).filter(c => c.kind !== 'heal')) || { id: 'heal', kind: 'heal', name: 'Repair', description: 'Restore 35% HP.' };
  const relic = pick(run, RELICS.filter(r => !has(run, r.id)));
  run.shopItems = [{ id: 'heal', name: 'Repair station', description: 'Restore 35% maximum HP.', price: 35, kind: 'heal' }, { ...upgrade, id: 'upgrade', price: 55, reward: upgrade }, ...(relic ? [{ id: 'relic', name: relic.name, description: relic.description || relic.desc, price: 85, target: relic.id, kind: 'relic' }] : [])];
}
export function buyItem(run, id) {
  if (run.state !== 'shop' || run.pendingRelic) return false;
  if (id === 'leave' || id === 'continue') { finishEncounter(run); return true; }
  const item = run.shopItems.find(i => i.id === id); if (!item || item.sold || run.scrap < item.price) return false;
  run.scrap -= item.price; item.sold = true;
  if (item.kind === 'relic') { if (!equipRelic(run, item.target)) run.pendingRelicSource = 'shop'; }
  else applyUpgrade(run, item.reward || item);
  event(run, 'purchase', { item: item.name }); event(run, 'checkpoint'); return true;
}
function makeEvent(run) {
  const template = Math.floor(random(run) * 5); run.eventTemplate = template;
  const choices = [
    [{ id: 'sacrifice', name: 'Feed the rift', description: 'Lose 25% current HP and receive a relic.' }, { id: 'safe', name: 'Take the salvage', description: 'Gain 35 Scrap with no risk.' }],
    [{ id: 'elite', name: 'Accept the hunt', description: 'Fight 3 marked elites now; gain 100 Scrap and a relic. Death ends the run.' }, { id: 'safe', name: 'Leave quietly', description: 'Gain 35 Scrap with no risk.' }],
    [{ id: 'repair', name: 'Restore systems', description: 'Recover 45% maximum HP.' }, { id: 'scrap', name: 'Dismantle the station', description: 'Gain 70 Scrap instead of healing.' }],
    [{ id: 'exchange', name: 'Relic transmutation', description: 'Choose a relic reward; when full, choose the relic to replace.' }, { id: 'safe', name: 'Keep your equipment', description: 'Gain 35 Scrap.' }],
    [{ id: 'risk', name: 'Overload the next sector', description: 'Next encounter has 28% more danger; its completion reward grants 50% extra Scrap.' }, { id: 'safe', name: 'Stabilize the route', description: 'Gain 35 Scrap with no added danger.' }],
  ];
  run.eventChoices = choices[template];
}
export function chooseEvent(run, id) {
  if (run.state !== 'event' || run.pendingRelic || !run.eventChoices.some(choice => choice.id === id)) return false;
  if (id === 'sacrifice') run.player.hp = Math.max(1, run.player.hp * .75);
  if (id === 'repair') run.player.hp = Math.min(run.player.maxHp, run.player.hp + run.player.maxHp * .45);
  if (id === 'safe') run.scrap += 35;
  if (id === 'scrap') run.scrap += 70;
  if (id === 'risk') { run.nextDanger = 2; run.rewardBoost = true; }
  if (id === 'elite') { run.state = 'playing'; run.objective = 'elite-event'; run.objectiveKills = 0; run.objectiveTarget = 3; run.encounterTime = 0; for (let i = 0; i < 3; i++) spawnEnemy(run, 'elite', true); event(run, 'checkpoint'); return true; }
  if (id === 'sacrifice' || id === 'exchange') { queueReward(run, 'relic', 'Rift offering'); run.resumeState = 'route'; }
  finishEncounter(run); return true;
}

function stepPlayer(run,input,dt) {
  const p = run.player, stats = getStats(run);
  if(p.downed)return;
  if (typeof input.manualAim === 'boolean') run.config.manualAim = input.manualAim;
  p.maxHp = stats.maxHp; p.hp = Math.min(p.hp, p.maxHp); p.dashMax = stats.dashMax;
  p.invulnerable = Math.max(0, p.invulnerable - dt); p.abilityCooldown = Math.max(0, p.abilityCooldown - dt); p.silenced = Math.max(0, (p.silenced || 0) - dt); p.slow = Math.max(0, (p.slow || 0) - dt);
  const wasActive = p.abilityActive; p.abilityActive = Math.max(0, p.abilityActive - dt);
  if (run.config.operator === 'titan' && wasActive > 0 && p.abilityActive === 0) { p.shield = Math.min(p.maxShield, p.shield); p.barrierAdded = 0; }
  if (p.dashCharges < p.dashMax) { p.dashTimer += dt; if (p.dashTimer >= 4) { p.dashTimer -= 4; p.dashCharges++; } } else p.dashTimer = 0;
  p.hp = Math.min(p.maxHp, p.hp + stats.regen * dt);
  const magnitude = Math.hypot(input.x || 0, input.y || 0); const movement = magnitude > 1 ? norm(input.x, input.y) : { x: input.x || 0, y: input.y || 0 }; p.moveX = movement.x; p.moveY = movement.y;
  if (Math.hypot(input.aimX || 0, input.aimY || 0) > .05) { const direction = norm(input.aimX||0, input.aimY||0); p.aimX = direction.x; p.aimY = direction.y; }
  if (input.dash) dash(run, movement.x, movement.y);
  if (input.ability) useAbility(run);
  const aimDirection = aim(run); p.angle = Math.atan2(aimDirection.y, aimDirection.x);
  if (p.dashActive > 0) { p.x += p.dashX * 950 * dt; p.y += p.dashY * 950 * dt; p.dashActive -= dt; } else { p.x += movement.x * stats.speed * dt * (p.slow ? .6 : 1); p.y += movement.y * stats.speed * dt * (p.slow ? .6 : 1); }
  p.x = clamp(p.x, 20, WORLD.width - 20); p.y = clamp(p.y, 20, WORLD.height - 20);
  const ultimate = getUltimateSynergies(run).map(s=>s.id);
  for(const id of ultimate)if(!run.ultimateSynergies.includes(id)){event(run,'ultimate-synergy',{id});if(id==='fortress-prime'){p.shield+=20;p.maxShield+=20;}}
  run.ultimateSynergies=ultimate;
  processWeapons(run,dt);
}

export const WORLD_EVENT_TYPES = [
  {id:'rift-storm',name:'Rift Storm',description:'Marked storm strikes sweep the arena. Survive for bonus Scrap.'},
  {id:'elite-hunt',name:'Elite Hunt',description:'Defeat the three invading elites for 80 Scrap.'},
  {id:'supply-drop',name:'Supply Drop',description:'Reach the supply beacon to collect healing and 60 Scrap.'},
  {id:'time-fracture',name:'Time Fracture',description:'Enemy movement slows for 16 seconds.'},
  {id:'boss-invasion',name:'Boss Invasion',description:'An optional guardian has entered the arena.'},
];
export function triggerWorldEvent(run,id) {
  if(run.worldEvent||run.state!=='playing'||run.objective==='boss')return false;
  const choices=WORLD_EVENT_TYPES.filter(e=>e.id!=='boss-invasion'||!run.enemies.some(e=>e.type==='boss'));
  const definition=id?choices.find(e=>e.id===id):pick(run,choices);
  if(!definition)return false;
  run.worldEvent={...definition,remaining:definition.id==='time-fracture'?16:30,timer:0,enemyIds:[]};
  if(definition.id==='elite-hunt')for(let i=0;i<3;i++){const e=spawnEnemy(run,'elite');if(e)run.worldEvent.enemyIds.push(e.id);}
  if(definition.id==='supply-drop'){run.worldEvent.x=180+random(run)*840;run.worldEvent.y=160+random(run)*440;}
  if(definition.id==='boss-invasion'){const boss=spawnBoss(run);run.worldEvent.enemyIds.push(boss.id);run.worldEvent.remaining=60;}
  event(run,'world-event',{id:definition.id,name:definition.name});return true;
}
function updateWorldEvents(run,dt) {
  run.worldEventTimer-=dt;
  if(run.worldEventTimer<=0&&!run.worldEvent){triggerWorldEvent(run);run.worldEventTimer=85+random(run)*30;}
  const world=run.worldEvent;if(!world)return;
  world.remaining-=dt;world.timer-=dt;
  if(world.id==='rift-storm'&&world.timer<=0){world.timer=3;const point=closestPlayer(run,{x:600,y:380}).player;hazard(run,'circle',clamp(point.x+(random(run)-.5)*250,75,1125),clamp(point.y+(random(run)-.5)*200,75,685),{r:65,warning:1.4,life:.8,color:'#c18cff'});}
  if(world.id==='supply-drop')for(const member of livingPlayers(run))if(dist2(member.player,world)<70**2){member.player.hp=Math.min(member.player.maxHp,member.player.hp+member.player.maxHp*.25);run.scrap+=60;world.claimed=true;world.remaining=0;break;}
  if((world.id==='elite-hunt'||world.id==='boss-invasion')&&world.enemyIds.every(id=>!run.enemies.some(e=>e.id===id&&e.hp>0))){run.scrap+=world.id==='elite-hunt'?80:120;world.claimed=true;world.remaining=0;}
  if(world.remaining<=0){if(world.id==='rift-storm')run.scrap+=45;event(run,'world-event-end',{id:world.id,claimed:world.claimed||world.id==='rift-storm'||world.id==='time-fracture'});run.worldEvent=null;}
}
function updateRunQuests(run) {
  for(const quest of run.runQuests){const value=quest.stat==='abilities'?(run.coopPlayers?run.coopPlayers.reduce((n,p)=>n+p.stats.abilities,0):run.stats.abilities):run[quest.stat]||0;quest.progress=Math.min(quest.target,value);if(!quest.complete&&quest.progress>=quest.target){quest.complete=true;run.scrap+=quest.reward;event(run,'quest-complete',{id:quest.id,name:quest.name,reward:quest.reward});}}
}
function processCoopLinks(run,dt) {
  if(!run.coopPlayers)return;
  run.linkTimer=Math.max(0,(run.linkTimer||0)-dt);
  const players=livingPlayers(run);
  if(players.length!==2||dist2(players[0].player,players[1].player)>400**2||run.linkTimer>0)return;
  const conductor=players.find(p=>p.weapons.arc||p.config.operator==='volt');if(!conductor)return;
  run.linkTimer=1.25;
  withCoopPlayer(run,conductor.id,()=>{
    const a=players[0].player,b=players[1].player;
    effect(run,'beam',a.x,a.y,{x2:b.x,y2:b.y,color:'#a9ffef',width:7});
    for(const enemy of run.enemies)if(enemy.hp>0&&segmentDistance(enemy,a,b)<enemy.r+18){damageEnemy(run,enemy,18+run.level*2,'coop-chain');enemy.stun=Math.max(enemy.stun,.2);}
    event(run,'chain-link');
  });
}

export function stepRun(run, input = {}, dt = 1 / 60) {
  run.events = [];
  if (run.state !== 'playing') return run.events;
  dt = clamp(dt, 0, 1 / 30); if (!dt) return run.events;
  run.time += dt; run.tick++; run.encounterTime += dt;
  if(run.coopPlayers){for(const member of livingPlayers(run))withCoopPlayer(run,member.id,()=>stepPlayer(run,input.players?.[member.id]||{},dt));}
  else stepPlayer(run,input,dt);
  const p=closestPlayer(run,{x:600,y:380}).player;
  run.spawnTimer -= dt; run.hazardTimer -= dt;
  if (run.spawnTimer <= 0 && run.objective !== 'elite-event') { const d = difficulty(run); for (let i = 0; i < Math.min(5, 1 + Math.floor(run.time / 130)); i++) spawnEnemy(run, random(run) < .12 ? 'shooter' : random(run) < .1 ? 'tank' : 'chaser'); run.spawnTimer = Math.max(.12, (1.05 / d - run.time / 3600)/run.difficultySettings.spawnRate/(run.coopPlayers?1.35:1)); if (run.time > 45 && random(run) < .045) spawnEnemy(run, 'elite'); }
  if (run.hazardTimer <= 0 && run.objective !== 'boss') { run.hazardTimer = 16; const x = clamp(p.x + (random(run) - .5) * 240, 100, 1100), y = clamp(p.y + (random(run) - .5) * 180, 100, 660); if (run.biome === 'storm-spire') hazard(run, 'line', x, 20, { x2: x, y2: 740, width: 30, warning: 1.5, life: .5 }); else if (run.biome === 'void-cathedral') hazard(run, 'silence', x, y, { warning: 1.5, life: 3 }); else hazard(run, 'circle', x, y, { slow: run.biome === 'frozen-rift' ? 2 : 0, warning: 1.5, life: 2 }); }
  if (run.config.mode !== 'campaign' && run.objective !== 'boss') { run.bossTimer -= dt; if (run.bossTimer <= 0 && !run.enemies.some(e => e.type === 'boss')) { spawnBoss(run);if(run.difficultySettings.doubleBosses)spawnBoss(run); run.bossTimer = run.config.mode === 'training' ? 90 : 120; } }
  processCoopLinks(run,dt);processCompanions(run, dt); processBullets(run, dt);
  collectDeaths(run,dt); // Resolve all rewards and credit before contact or modal transitions.
  processEnemies(run, dt); processHazards(run, dt);
  if (run.state === 'gameover') return run.events;
  updateWorldEvents(run,dt);updateRunQuests(run);
  if(run.time-(run.replaySnapshots.at(-1)?.time||0)>=10){run.replaySnapshots.push({time:run.time,score:Math.round(run.score),kills:run.kills});if(run.replaySnapshots.length>120)run.replaySnapshots=run.replaySnapshots.filter((_,i)=>i%2===0);}
  if (run.reactor && run.reactor.hp <= 0) { endRun(run, 'defeat', 'Reactor destroyed'); return run.events; }
  if (run.config.mode === 'campaign') {
    if (run.objective === 'boss' && !run.enemies.some(e => e.type === 'boss')) finishEncounter(run);
    else if (run.objective === 'elite-event' && run.objectiveKills >= 3) { run.scrap += 100; queueReward(run, 'relic', 'Elite challenge cache'); finishEncounter(run); }
    else if (run.objective === 'hunt' && run.objectiveKills >= run.objectiveTarget) { if (run.encounterTime >= 90) finishEncounter(run); }
    else if (['survive', 'hunt', 'defend'].includes(run.objective) && run.encounterTime >= 90) { if (run.objective === 'hunt' && run.objectiveKills < run.objectiveTarget) endRun(run, 'defeat', 'Marked elite hunt expired'); else finishEncounter(run); }
  } else if (['expedition', 'daily'].includes(run.config.mode) && run.time >= 360 && run.bosses >= 2) { if (run.rewardQueue.length) { run.pendingVictory = true; run.resumeState = 'playing'; } else endRun(run, 'victory', 'Expedition complete'); }
  if (run.pendingVictory && !run.rewardQueue.length) endRun(run, 'victory', 'Expedition complete');
  if (run.state === 'playing' && run.rewardQueue.length) { run.resumeState = 'playing'; showReward(run); }
  for (const e of run.effects) e.life -= dt;
  run.effects = run.effects.filter(e => e.life > 0);
  return run.events;
}

export function getRunSummary(run) {
  const id=run.coopPlayers?`${run.id}:${run.currentPlayerId}`:run.id;
  return {
    id,runId:id,mode:run.config.mode,coOp:Boolean(run.coopPlayers),difficulty:run.config.difficulty,balanceVersion:run.balanceVersion,date:run.config.date,
    operator:run.config.operator,classId:run.config.classId,subclass:run.config.subclass,biome:run.biome,visitedBiomes:[...run.visitedBiomes],bossIds:[...run.bossIds],
    outcome:run.outcome||'in-progress',causeOfDeath:run.causeOfDeath,score:Math.round(run.score),time:run.time,duration:run.time,act:run.act,completedActs:run.completedActs||0,encounters:run.completedEncounters,level:run.level,
    ...clone(run.stats),kills:run.coopPlayers?run.stats.kills:run.kills,elites:run.coopPlayers?run.stats.elites:run.elites,bosses:run.coopPlayers?run.stats.bosses:run.bosses,teamKills:run.kills,teamBosses:run.bosses,
    damageByWeapon:clone(run.damageByWeapon),weapons:clone(run.weapons),passives:clone(run.passives),relics:[...run.relics],evolutions:[...run.evolved],evolved:[...run.evolved],
    mythicCount:run.stats.mythics,mythics:[...run.mythicSelections],cores:run.coresEarned,mastery:run.masteryEarned,masteryXp:run.masteryEarned,unlocks:[...run.unlocks],quests:clone(run.runQuests),ultimateSynergies:[...run.ultimateSynergies],
    replaySnapshots:run.coopPlayers?[]:clone(run.replaySnapshots),build:{weapons:clone(run.weapons),passives:clone(run.passives),relics:[...run.relics]},
  };
}

export function serializeCheckpoint(run) { const data = clone(run); data.checkpointVersion = 5; data.events = []; data.effects = []; return data; }
export function restoreCheckpoint(data) {
  if (!data || data.checkpointVersion !== 5 || data.balanceVersion !== BALANCE_VERSION || !data.config || !['campaign', 'endless', 'expedition', 'daily', 'ascension', 'training'].includes(data.config.mode) || !byId(OPERATORS, data.config.operator) || !byId(BIOMES, data.biome)) throw new Error('This checkpoint is incompatible with V5.');
  if (!Number.isFinite(data.rngState) || !Number.isFinite(data.time) || data.time < 0 || !data.player || !Number.isFinite(data.player.hp) || data.player.hp <= 0 || !['playing', 'paused', 'route', 'reward', 'shop', 'event'].includes(data.state)) throw new Error('The checkpoint is damaged.');
  let nodes=0;
  function finiteTree(value,depth=0){if(++nodes>100000||depth>18)throw new Error('Checkpoint is too complex.');if(typeof value==='number'&&!Number.isFinite(value))throw new Error('Checkpoint contains an invalid number.');if(value&&typeof value==='object')for(const item of Object.values(value))finiteTree(item,depth+1);}
  finiteTree(data);
  for(const [key,min,max] of [['act',1,3],['encounter',1,5],['level',1,10000],['nextId',1,Number.MAX_SAFE_INTEGER],['tick',0,Number.MAX_SAFE_INTEGER],['rngState',1,4294967295]])if(!Number.isInteger(data[key])||data[key]<min||data[key]>max)throw new Error(`Invalid checkpoint ${key}.`);
  for(const key of ['time','encounterTime','kills','bosses','elites','score','scrap','xp','masteryEarned','coresEarned'])if(!Number.isFinite(data[key])||data[key]<0)throw new Error(`Invalid checkpoint ${key}.`);
  for(const key of ['x','y','maxHp','shield','maxShield','dashCharges','abilityCooldown'])if(!Number.isFinite(data.player[key]))throw new Error('Invalid checkpoint player.');
  if(data.player.maxHp<=0||data.player.hp>data.player.maxHp+1e-6||data.player.shield<0||data.player.maxShield<0||data.player.x<0||data.player.x>WORLD.width||data.player.y<0||data.player.y>WORLD.height||!Number.isInteger(data.player.dashCharges)||data.player.dashCharges<0||data.player.dashCharges>4)throw new Error('Invalid checkpoint player bounds.');
  for (const [key, defs, limit] of [['weapons', WEAPONS, 6], ['passives', PASSIVES, 6]]) { if (!data[key] || typeof data[key] !== 'object' || Object.keys(data[key]).length > limit || Object.entries(data[key]).some(([id, level]) => !byId(defs, id) || !Number.isInteger(level) || level < 1 || level > 5)) throw new Error('Invalid checkpoint build.'); }
  if (!Array.isArray(data.relics) || data.relics.length > 3 || new Set(data.relics).size !== data.relics.length || data.relics.some(id => !byId(RELICS, id))) throw new Error('Invalid checkpoint relics.');
  for (const key of ['enemies', 'bullets', 'hazards', 'effects', 'companions', 'pickups', 'rewardQueue', 'events', 'recentEvents']) if (!Array.isArray(data[key]) || data[key].length > 2000) throw new Error('Invalid checkpoint entities.');
  for(const key of ['enemies','bullets','hazards','companions','pickups'])for(const entity of data[key])if(!entity||!Number.isFinite(entity.x)||!Number.isFinite(entity.y))throw new Error('Invalid checkpoint entity position.');
  if(data.state==='reward'&&(!Array.isArray(data.rewardChoices)||!data.rewardChoices.length||!data.rewardQueue.length))throw new Error('Invalid checkpoint reward state.');
  if(data.state==='route'&&(!Array.isArray(data.routeChoices)||data.routeChoices.length!==2))throw new Error('Invalid checkpoint route.');
  if(data.pendingRelic&&(!byId(RELICS,data.pendingRelic)||!['reward','shop','event'].includes(data.state)))throw new Error('Invalid checkpoint relic choice.');
  const defaults=createRun(data.config), restored = {...defaults,...clone(data)};restored.stats={...defaults.stats,...restored.stats};restored.completedActs??=Math.max(0,restored.act-1);restored.difficultySettings=difficultyOptions(restored.config);
  restored.config={...defaults.config,...restored.config,biome:restored.biome};
  if (restored.state === 'paused') restored.state = 'playing'; restored.events = []; return restored;
}
