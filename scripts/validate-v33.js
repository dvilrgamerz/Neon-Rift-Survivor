const fs = require('fs');

const read = path => fs.readFileSync(path, 'utf8');
const index = read('index.html');
const game = read('src/v3.3.js');
const css = read('v3.3.css');
const changelog = read('CHANGELOG.md');

const checks = [
  ['index loads v3.3 stylesheet', index.includes('./v3.3.css?v=1')],
  ['index loads v3.3 gameplay layer', index.includes('./src/v3.3.js?v=1')],
  ['visible version is V3.3', index.includes('VERSION 3.3') && index.includes('V3.3')],
  ['Assault class exists', game.includes("name: 'ASSAULT'")],
  ['Vanguard class exists', game.includes("name: 'VANGUARD'")],
  ['Velocity class exists', game.includes("name: 'VELOCITY'")],
  ['charger AI exists', game.includes("archetype === 'charger'")],
  ['shooter AI exists', game.includes("archetype === 'shooter'")],
  ['splitter AI exists', game.includes("archetype === 'splitter'")],
  ['shielded AI exists', game.includes("archetype === 'shielded'")],
  ['Rift Warden boss exists', game.includes("'rift-warden'")],
  ['boss phase thresholds exist', game.includes('ratio > .66') && game.includes('ratio > .33')],
  ['hostile projectile system exists', game.includes('enemyShots') && game.includes('fireEnemyShot')],
  ['build synergies exist', game.includes('OVERLOAD GRID') && game.includes('PHASE FORTRESS') && game.includes('PRECISION CORE')],
  ['run summary exists', game.includes('renderRunSummary') && css.includes('.run-summary')],
  ['boss HUD styles exist', css.includes('.boss-hud') && css.includes('.boss-bar')],
  ['class UI styles exist', css.includes('.class-grid') && css.includes('.class-btn')],
  ['V3.3 changelog exists', changelog.includes('## V3.3 — Rift Classes & Boss Overhaul')]
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failed++;
}

if (failed) {
  console.error(`\n${failed} V3.3 validation check(s) failed.`);
  process.exit(1);
}
console.log(`\nAll ${checks.length} V3.3 static integration checks passed.`);
