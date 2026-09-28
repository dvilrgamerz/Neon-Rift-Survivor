import test from 'node:test';
import assert from 'node:assert/strict';
import {rewardPresentation,createSelectionGuard,difficultyCards} from '../src/presentation.js';
import {createRun} from '../src/engine.js';
import {defaultSave} from '../src/storage.js';
import {WEAPONS,DIFFICULTIES} from '../src/content.js';

test('upgrade preview uses actual combat stats and includes the Mythic bonus',()=>{
  const run=createRun({mode:'endless',operator:'nova'},defaultSave());
  const choice={kind:'weapon',target:'pulse',rarity:'mythic'};
  const preview=rewardPresentation(choice,run),def=WEAPONS.find(w=>w.id==='pulse');
  assert.equal(preview.level,'Lv. 1 → Lv. 2');
  assert.ok(preview.changes.includes(`Damage ${def.levels[0].damage} → ${def.levels[1].damage}`));
  assert.ok(preview.changes.includes('Mythic bonus: +6% damage · +5 max HP'));
  const newWeapon=rewardPresentation({kind:'weapon',target:'brick',rarity:'mythic'},run);
  assert.ok(newWeapon.changes.includes('Mythic bonus: +6% damage · +5 max HP'));
});

test('a rapid double selection cannot consume the next queued reward',()=>{
  let now=1000;const guard=createSelectionGuard(()=>now);
  assert.equal(guard.take(),true);assert.equal(guard.take(),false);
  now+=200;assert.equal(guard.take(),false);
  now+=61;assert.equal(guard.take(),true);
  guard.reset();assert.equal(guard.take(),true);
});

test('Daily difficulty is visibly fixed to Standard with all choices disabled',()=>{
  const html=difficultyCards(DIFFICULTIES,'impossible',true);
  assert.match(html,/data-difficulty="standard" aria-pressed="true" disabled/);
  assert.equal((html.match(/disabled/g)||[]).length,5);
  assert.equal((html.match(/✓ Selected/g)||[]).length,1);
});
