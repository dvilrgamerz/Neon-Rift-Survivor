const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const assert = (ok,msg) => { if(!ok) throw new Error(msg); console.log('✓',msg); };

const index = read('index.html');
const engine = read('src/game-v3.js');
const upgrades = read('src/upgrade-v3.1.js');
const css = read('v3.1.css');

new Function(upgrades);
assert(index.includes('v3.1.css'), 'index loads V3.1 styles');
assert(index.includes('upgrade-v3.1.js'), 'index loads V3.1 upgrade script');
assert(index.indexOf('game-v3.js') < index.indexOf('upgrade-v3.1.js'), 'base engine loads before V3.1 layer');

for(const token of ['const upgrades','const evoByActive','function levelOf','function canOffer','function chooseUpgrade','function levelUp','function reset']){
  assert(engine.includes(token), `base engine exposes expected integration point: ${token}`);
}
for(const token of ['weightedChoices','rerollsRemaining','evoStatus','RIFT Stabilizer'.toLowerCase().split(' ').join('-')]){
  if(token === 'rift-stabilizer') assert(upgrades.includes("id:'rift-stabilizer'"), 'max-build fallback exists');
  else assert(upgrades.includes(token), `V3.1 feature exists: ${token}`);
}
assert(css.includes('.upgrade-card'), 'upgrade card styling exists');
assert(css.includes('@media(max-width:760px)'), 'mobile upgrade layout exists');

console.log('\nV3.1 static validation passed.');
