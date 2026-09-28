import test from 'node:test';
import assert from 'node:assert/strict';
import { render } from '../src/render.js';

function recordingContext() {
  const calls = [];
  const stack = [];
  const state = { canvas: { width: 1200, height: 760 }, globalAlpha: 1 };
  const ctx = new Proxy(state, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === 'save') return () => stack.push({ ...state });
      if (key === 'restore') return () => Object.assign(state, stack.pop());
      if (key === 'createRadialGradient' || key === 'createLinearGradient') return () => ({ addColorStop() {} });
      return (...args) => calls.push({ method: key, args, stroke: state.strokeStyle, alpha: state.globalAlpha });
    },
  });
  return { ctx, calls };
}

function fixture() {
  return {
    time: 1, biome: 'neon-city',
    enemies: [{ id: 1, type: 'elite', x: 480, y: 260, r: 22, hp: 100, maxHp: 100, marked: true, stun: 0, slow: 0 }],
    effects: [
      { type: 'text', text: '42', x: 480, y: 238, life: .3, maxLife: .55, crit: true },
      { type: 'text', text: 'DODGE', x: 600, y: 360, life: .3, maxLife: .4 },
    ],
  };
}

test('enemy hit feedback respects reduced motion, reduced flash, and disabled visual effects', () => {
  for (const settings of [{}, { reducedMotion: true }, { reducedFlash: true }, { visualEffects: false }, { vfx: 0 }]) {
    const run = fixture();
    const { ctx, calls } = recordingContext();
    render(ctx, run, { settings });
    run.time += 1 / 60;
    run.enemies[0].hp = 90;
    calls.length = 0;
    render(ctx, run, { settings });
    const hitFlash = calls.some(call => call.method === 'stroke' && call.stroke === '#efffff');
    assert.equal(hitFlash, Object.keys(settings).length === 0, JSON.stringify(settings));
  }
});

test('damage number preferences preserve dodge feedback and marked target readability', () => {
  const run = fixture();
  const { ctx, calls } = recordingContext();
  render(ctx, run, { settings: { damageNumbers: false } });
  const labels = calls.filter(call => call.method === 'fillText').map(call => call.args[0]);
  assert.ok(labels.includes('DODGE'));
  assert.ok(labels.includes('TARGET'));
  assert.ok(!labels.includes('42'));
  assert.ok(!labels.includes('CRIT'));
});

test('cosmetic rendering leaves simulation data intact and reduced motion keeps text stationary', () => {
  const run = fixture();
  const before = structuredClone(run);
  const { ctx, calls } = recordingContext();
  render(ctx, run, { settings: { reducedMotion: true } });
  render(ctx, run, { settings: { reducedMotion: true } });
  assert.deepEqual(run, before);
  const numbers = calls.filter(call => call.method === 'fillText' && call.args[0] === '42');
  assert.equal(numbers.length, 2);
  assert.ok(numbers.every(call => call.args[2] === 238));
});
